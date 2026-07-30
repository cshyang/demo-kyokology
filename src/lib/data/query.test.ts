import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildData } from './generator.ts'
import { SEGMENT_META } from './demo.ts'
import { latest } from './derive.ts'
import {
  INTERVENTION_SEGMENTS,
  MAX_ROWS_SHOWN,
  MAX_TOP_N,
  SCHEMA_PROMPT,
  MAX_SAY,
  PRODUCT_BRIEF,
  SEGMENT_IDS,
  parseAsk,
  parseQuery,
  reassemble,
  type QuerySpec,
} from './query-schema.ts'
import { runQuery } from './query.ts'

const data = buildData()

const spec = (raw: string): QuerySpec => {
  const r = parseQuery(raw)
  assert.ok(r.ok, `expected ${raw} to parse, got: ${r.ok ? '' : r.reason}`)
  return r.spec
}

// ─────────────────────────────────────────────────────────────────────────────
// The validator is the only guard. Z.ai's `json_object` mode enforces JSON but
// not shape, so anything below that slips through becomes a plausible-looking
// list of the wrong students in front of a customer.
// ─────────────────────────────────────────────────────────────────────────────

test('the three questions the feature exists to answer parse', () => {
  // Captured verbatim from glm-5.2 rather than hand-written, so these fail if
  // the schema drifts away from what the model actually emits.
  spec('{"list":"students","where":{"segment":["silent","driven","fragile","adrift"]},"show":["name","faculty","segment","action"]}')
  spec('{"list":"students","rank":{"by":"lead","topN":20},"show":["name","faculty","score"]}')
  spec('{"list":"students","where":{"completed":false},"show":["name","faculty","inviteStatus"]}')
})

test('garbage is rejected outright, never partially applied', () => {
  const bad: [string, string][] = [
    ['not json at all', 'not valid JSON'],
    ['', 'not valid JSON'],
    ['[]', 'not a JSON object'],
    ['"a string"', 'not a JSON object'],
    ['null', 'not a JSON object'],
    ['{"error":"unsupported"}', 'unsupported'],
    ['{"list":"students","where":{"completed":false},"limit":5}', 'unknown field: limit'],
    ['{"list":"staff","where":{"completed":false}}', 'only student lists are supported'],
    ['{"where":{"completed":false}}', 'only student lists are supported'],
    ['{"list":"students","where":{"segment":["at_risk"]}}', 'unknown segment: at_risk'],
    ['{"list":"students","where":{"segment":[]}}', 'segment must be a non-empty array'],
    ['{"list":"students","where":{"segment":"silent"}}', 'segment must be a non-empty array'],
    ['{"list":"students","where":{"gpa":3}}', 'unknown filter: gpa'],
    ['{"list":"students","where":{"completed":"no"}}', 'completed must be true or false'],
    ['{"list":"students","where":{"intakeYear":"2026"}}', 'intakeYear must be a whole number'],
    ['{"list":"students","where":{"faculty":"  "}}', 'faculty must be a name'],
    ['{"list":"students","rank":{"by":"charisma","topN":10}}', 'unknown rank key: charisma'],
    ['{"list":"students","rank":{"by":"lead","topN":"20"}}', 'topN must be a positive whole number'],
    ['{"list":"students","rank":{"by":"lead","topN":0}}', 'topN must be a positive whole number'],
    ['{"list":"students","rank":{"by":"lead","limit":5}}', 'unknown rank field: limit'],
    ['{"list":"students","where":{"completed":false},"show":["gpa"]}', 'unknown column: gpa'],
    ['{"list":"students","where":{"completed":false},"show":[]}', 'show must be a non-empty array'],
    // A spec with neither a filter nor a ranking would dump all 840 students.
    ['{"list":"students","show":["name"]}', 'no filter or ranking given'],
  ]
  for (const [raw, reason] of bad) {
    const r = parseQuery(raw)
    assert.equal(r.ok, false, `should have rejected: ${raw}`)
    assert.equal(r.ok === false && r.reason, reason, `wrong reason for: ${raw}`)
  }
})

/**
 * Caught end-to-end, not in review. glm-5.2 continues from the `{` prefill for a
 * query but re-emits it for a refusal, so an unconditional prepend produced
 * `{{"error":"unsupported"}` — making the graceful-refusal path the one that
 * reported "not valid JSON" instead.
 */
test('the prefilled brace is restored only when the model omitted it', () => {
  assert.equal(reassemble('"list":"students"}'), '{"list":"students"}')
  assert.equal(reassemble('{"error":"unsupported"}'), '{"error":"unsupported"}')
  assert.equal(reassemble('\n  {"error":"unsupported"}  '), '{"error":"unsupported"}')
  // Both shapes must reach the same verdict rather than a parse failure.
  assert.deepEqual(parseQuery(reassemble('{"error":"unsupported"}')), { ok: false, reason: 'unsupported' })
  assert.deepEqual(parseQuery(reassemble('"error":"unsupported"}')), { ok: false, reason: 'unsupported' })
})

test('topN is clamped rather than trusted', () => {
  const s = spec('{"list":"students","rank":{"by":"lead","topN":100000},"show":["name"]}')
  assert.equal(s.rank?.topN, MAX_TOP_N)
})

// ─────────────────────────────────────────────────────────────────────────────
// Vocabulary drift. Both of these fail silently in production: a segment the
// prompt never mentions is simply unreachable, and an intervention list that
// falls out of step with the SHADOW tones answers the single most important
// question wrongly while looking completely normal.
// ─────────────────────────────────────────────────────────────────────────────

test('every segment in SEGMENT_META is one the assistant can name', () => {
  assert.deepEqual([...SEGMENT_IDS].sort(), Object.keys(SEGMENT_META).sort())
  for (const id of SEGMENT_IDS) assert.ok(SCHEMA_PROMPT.includes(id), `prompt never mentions ${id}`)
})

test('"needs intervention" is exactly the SHADOW-toned segments', () => {
  const shadow = Object.entries(SEGMENT_META)
    .filter(([, m]) => m.tone === 'SHADOW')
    .map(([id]) => id)
    .sort()
  assert.deepEqual([...INTERVENTION_SEGMENTS].sort(), shadow)
})

// ─────────────────────────────────────────────────────────────────────────────
// Execution
// ─────────────────────────────────────────────────────────────────────────────

test('intervention query returns the flagged cohort with its named steps', () => {
  const r = runQuery(data, spec('{"list":"students","where":{"segment":["silent","driven","fragile","adrift"]},"show":["name","faculty","segment","action"]}'))
  assert.equal(r.total, 107)
  assert.equal(r.rows.length, MAX_ROWS_SHOWN)
  assert.equal(r.headers.join('|'), 'NAME|FACULTY|SEGMENT|RECOMMENDED STEP')
  // Every flagged student carries a real next step, never a dash.
  for (const row of r.rows) assert.notEqual(row.cells[3], '—', `${row.id} has no recommended step`)
  assert.equal(r.rule, 'SILENT CONTRIBUTORS · DRIVEN, UNDER-REGULATED · TRANSITION FRAGILE · PURPOSE ADRIFT')
})

test('unassessed query counts everyone without a result', () => {
  const r = runQuery(data, spec('{"list":"students","where":{"completed":false},"show":["name","faculty","inviteStatus"]}'))
  const assessed = data.students.filter((st) => latest(data, st.id) !== null).length
  assert.equal(r.total, data.students.length - assessed)
  assert.equal(r.total, 471)
  assert.equal(r.rule, 'NO COMPLETED RESULT')
  // The whole point of this answer is that it is actionable, so a status is
  // required on every row — "not invited" included.
  for (const row of r.rows) assert.ok(row.cells[2].length > 0)
})

test('a segment column on unassessed students degrades to a dash, not a crash', () => {
  // Observed from glm-5.2: it asked for `segment` alongside `completed:false`.
  const r = runQuery(data, spec('{"list":"students","where":{"completed":false},"show":["name","segment","score"]}'))
  assert.ok(r.total > 0)
  for (const row of r.rows) {
    assert.equal(row.cells[1], '—')
    assert.equal(row.cells[2], '—')
  }
})

test('ranking returns the top N in descending order with bands', () => {
  const r = runQuery(data, spec('{"list":"students","rank":{"by":"lead","topN":20},"show":["name","faculty","score"]}'))
  assert.equal(r.total, 20)
  assert.equal(r.rule, 'TOP 20 BY LEADERSHIP POTENTIAL')
  const scores = r.rows.map((row) => Number.parseFloat(row.cells[2]))
  for (let i = 1; i < scores.length; i++) assert.ok(scores[i] <= scores[i - 1], 'not descending')
  assert.match(r.rows[0].cells[2], /^\d\.\d [A-Z ]+$/)
})

/**
 * The reason ranking exists at all. An absolute STRONG threshold on `lead`
 * matches 5 students out of 369 — a true answer that makes the platform look
 * blind — so the schema must never lose the comparative branch.
 */
test('ranking beats a band threshold on a squashed distribution', () => {
  const ranked = runQuery(data, spec('{"list":"students","rank":{"by":"lead","topN":20},"show":["name"]}'))
  assert.equal(ranked.total, 20)
  assert.ok(SCHEMA_PROMPT.includes('Never approximate a comparison with a segment filter.'))
})

test('swing ranking says which end it sorted from', () => {
  const r = runQuery(data, spec('{"list":"students","rank":{"by":"swing","topN":5},"show":["name","score"]}'))
  assert.equal(r.rule, 'TOP 5 BY BEHAVIOUR UNDER PRESSURE (WIDEST SWING FIRST)')
})

test('filters compose, and the rule names every one applied', () => {
  const r = runQuery(data, spec('{"list":"students","where":{"segment":["fragile"],"faculty":"Engineering","intakeYear":2026},"show":["name"]}'))
  assert.equal(r.rule, 'TRANSITION FRAGILE · ENGINEERING · 2026 INTAKE')
  assert.ok(r.total > 0 && r.total < 107)
})

test('an empty result is a clean zero, not a broken table', () => {
  const r = runQuery(data, spec('{"list":"students","where":{"faculty":"Veterinary Science"},"show":["name"]}'))
  assert.equal(r.total, 0)
  assert.equal(r.rows.length, 0)
  assert.equal(r.headers.length, 1)
})

test('running queries leaves the generator untouched', () => {
  const before = JSON.stringify(data.students.slice(0, 40))
  runQuery(data, spec('{"list":"students","rank":{"by":"lead","topN":50},"show":["name","score"]}'))
  runQuery(data, spec('{"list":"students","where":{"completed":false},"show":["name"]}'))
  assert.equal(JSON.stringify(data.students.slice(0, 40)), before)
})

// ─────────────────────────────────────────────────────────────────────────────
// The two-intent envelope. `list` answers keep every figure in code; `explain`
// answers are model prose, so the fence between them is what has to hold.
// ─────────────────────────────────────────────────────────────────────────────

test('a list answer carries a framing sentence and a spec', () => {
  const a = parseAsk('{"intent":"list","say":"Here are the students flagged for support.","where":{"segment":["fragile"]},"show":["name","action"]}')
  assert.ok(a.ok && a.kind === 'list')
  assert.equal(a.ok && a.kind === 'list' && a.say, 'Here are the students flagged for support.')
  assert.equal(a.ok && a.kind === 'list' && a.spec.where?.segment?.[0], 'fragile')
})

test('the older shape without an intent still parses as a list', () => {
  // The model omits `intent` often enough that rejecting it would fail live
  // questions that are otherwise perfectly well formed.
  const a = parseAsk('{"where":{"completed":false},"show":["name"]}')
  assert.ok(a.ok && a.kind === 'list')
})

/**
 * The single most important guardrail here. The model writes its sentence before
 * the query runs, so it cannot know the count — any number in it is invented, and
 * "Here are 47 students" above a table reading 107 is the whole failure this
 * design exists to prevent. The sentence is dropped; the answer survives.
 */
test('a number in the framing sentence is dropped, not shown, and not fatal', () => {
  const a = parseAsk('{"intent":"list","say":"Here are 47 students who need support.","where":{"segment":["fragile"]},"show":["name"]}')
  assert.ok(a.ok && a.kind === 'list')
  assert.equal(a.ok && a.kind === 'list' && a.say, '')
  assert.equal(a.ok && a.kind === 'list' && a.spec.where?.segment?.[0], 'fragile')
})

test('an explain answer is prose with no query attached', () => {
  const a = parseAsk('{"intent":"explain","say":"Complexity covers curiosity, adaptability and strategy."}')
  assert.ok(a.ok && a.kind === 'explain')
  assert.match(a.ok && a.kind === 'explain' ? a.say : '', /^Complexity/)
})

test('the envelope rejects what it cannot place', () => {
  const bad: [string, string][] = [
    ['{"error":"unsupported"}', 'unsupported'],
    ['not json', 'not valid JSON'],
    ['{"intent":"explain"}', 'explain needs an answer'],
    ['{"intent":"explain","say":"   "}', 'explain needs an answer'],
    [`{"intent":"explain","say":"${'x'.repeat(MAX_SAY + 1)}"}`, 'answer too long'],
    ['{"intent":"list","say":"Here they are.","where":{"segment":["at_risk"]}}', 'unknown segment: at_risk'],
    // Neither an intent nor any query field: nothing to act on.
    ['{"say":"Sure!"}', 'no intent given'],
    ['{}', 'no intent given'],
  ]
  for (const [raw, reason] of bad) {
    const a = parseAsk(raw)
    assert.equal(a.ok, false, `should have rejected: ${raw.slice(0, 60)}`)
    assert.equal(a.ok === false && a.reason, reason, `wrong reason for: ${raw.slice(0, 60)}`)
  }
})

/**
 * The brief is the only source an explain answer may draw on, so a question the
 * fact sheet answers must be answerable from this text alone — and the limits
 * paragraph has to survive, because "can we screen applicants with this?" is a
 * question a university will ask.
 */
test('the briefing covers what the assistant is allowed to explain', () => {
  for (const term of [
    'Self-Actualisation',
    'Egocentricity',
    'Sociocentricity',
    'Security',
    'Complexity',
    'Spirituality',
    '100 self-report questions',
    'thirty-six underlying facets',
    'Describe',
    'Harmonise',
  ]) {
    assert.ok(PRODUCT_BRIEF.includes(term), `briefing never mentions ${term}`)
  }
  assert.match(PRODUCT_BRIEF, /NOT a clinical, psychiatric or diagnostic instrument/)
  assert.match(PRODUCT_BRIEF, /not intended as the sole basis for admission/)
  assert.ok(SCHEMA_PROMPT.includes(PRODUCT_BRIEF), 'the prompt must actually carry the briefing')
})

test('the prompt forbids figures in prose and prose in queries', () => {
  assert.ok(SCHEMA_PROMPT.includes('must contain NO numbers'))
  assert.ok(SCHEMA_PROMPT.includes('Never state a figure about this cohort in an explain answer'))
  // Orientation, not a filter — the distinction the assistant is told to honour.
  assert.ok(SCHEMA_PROMPT.includes('It is orientation, not a limit'))
})
