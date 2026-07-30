/**
 * The contract between the model and the app.
 *
 * The model never sees a student and never emits a figure — it emits a
 * predicate over this closed vocabulary, and the browser runs it. That is what
 * makes an invented number structurally impossible rather than merely
 * discouraged: there is no path by which a name or a score can originate here.
 *
 * ZERO RUNTIME IMPORTS, deliberately. `worker/index.ts` bundles this file to
 * build its system prompt, and it must not drag a `'use client'` module or the
 * generator into the edge bundle. The `SegmentId` import is type-only, so it
 * erases at compile time.
 *
 * Z.ai's `response_format` supports only `{"type":"json_object"}` — there is no
 * server-side schema enforcement — so `parseQuery` is not a nicety. It is the
 * only thing standing between a hallucinated field and a wrong list of students
 * in front of a customer. It rejects; it never partially applies.
 */
import type { SegmentId } from './generator.ts'

export const SEGMENT_IDS = [
  'silent',
  'driven',
  'explorer',
  'fragile',
  'adrift',
  'steady',
  'unflagged',
] as const satisfies readonly SegmentId[]

/**
 * Compile-time exhaustiveness. Adding a segment to `SegmentId` without adding
 * it here fails `npm run typecheck` rather than silently becoming a segment the
 * assistant can never name.
 */
type MissingSegment = Exclude<SegmentId, (typeof SEGMENT_IDS)[number]>
const _allSegmentsListed: MissingSegment extends never ? true : never = true
void _allSegmentsListed

/**
 * Which segments count as "needs intervention".
 *
 * This is the four SHADOW-toned segments in `SEGMENT_META`, and it lives here —
 * in reviewed code — rather than in a prompt. The model picks *which* rule to
 * apply; it never gets to invent the rule. `query.test.ts` asserts this stays
 * in step with the tones in `demo.ts`.
 */
export const INTERVENTION_SEGMENTS = ['silent', 'driven', 'fragile', 'adrift'] as const satisfies readonly SegmentId[]

/** Readiness bundle keys from `READS`, plus `swing` for behaviour under pressure. */
export const RANK_KEYS = ['lead', 'team', 'resil', 'work', 'swing'] as const

export const COLUMNS = ['name', 'faculty', 'segment', 'action', 'score', 'inviteStatus'] as const

export type RankKey = (typeof RANK_KEYS)[number]
export type Column = (typeof COLUMNS)[number]

export interface QueryWhere {
  segment?: SegmentId[]
  /** true = holds a completed result; false = does not. */
  completed?: boolean
  faculty?: string
  intakeYear?: number
}

export interface QuerySpec {
  list: 'students'
  where?: QueryWhere
  rank?: { by: RankKey; topN: number }
  show: Column[]
}

export const DEFAULT_TOP_N = 20
export const MAX_TOP_N = 100
/** A drawer is not a spreadsheet. Beyond this the answer is a count plus a link. */
export const MAX_ROWS_SHOWN = 12

const DEFAULT_SHOW: Column[] = ['name', 'faculty']

/**
 * The only source an `explain` answer may draw on, transcribed from the
 * KYKOLOGY Campus product fact sheet.
 *
 * This is the guardrail, not documentation: the assistant may explain the
 * instrument and must refuse everything else, so anything absent here is
 * something it has to decline. The closing disclaimer is the fact sheet's own
 * and is load-bearing — asked whether this can screen applicants, the answer
 * must be no.
 */
export const PRODUCT_BRIEF = `KYKOLOGY™ Campus is a behavioural intelligence report and navigator for students, built for the realities of student life — coursework, group projects, deadlines and the first steps toward a career. It reads how a student actually operates: their natural strengths, how those strengths shift under pressure, how consistently they hold, and how readily they can grow. Every insight is grounded in an evidence-based behavioural model, tracing the healthy pattern against a dynamic range under pressure, across six dimensions and thirty-six underlying facets.

The assessment is 100 self-report questions, completed in 35–45 minutes. It produces a 14-page personalised report — facet-level evidence, ranked Contribution signals and illustrative Opportunity arenas, closing with coaching-style reflection questions and a 30-day action plan.

The six dimensions:
- Self-Actualisation — Purpose, Ethics, Achievement and Learning
- Egocentricity — Drive, Persistence and Leadership
- Sociocentricity — Empathy, Collaboration and Connection
- Security — Structure, Order and Risk-Awareness
- Complexity — Curiosity, Adaptability and Strategy
- Spirituality — Meaning, Contribution and Legacy

The 36 facets are analysed across four states: Healthy, Dynamic, Pressured and Adaptive.

Five Layers of Discovery: Behaviour, Capabilities, Contribution Motivation, Career and Growth Pathways.

The DEPTH pathway: Describe (what shows up) → Explain (where it comes from) → Predict (how it may shift) → Transform (into new behaviour) → Harmonise (across all dimensions).

What makes it different: it goes beyond a single score, reading behaviour in layers rather than one number. It reads the person, not just the pathway — capability, contribution and opportunity signals come from the six deeper dimensions behind them. It is developmental, never a verdict: strengths and pressure patterns are named together, in language designed to open reflection, not to label, rank or diagnose. And it is built to act on.

One framework, two views. The Student Report covers natural strengths, learning preferences and style, communication style, career motivations, and growth opportunities and development pathways. The Educator/Cohort Dashboard covers emotional resilience, team compatibility and dynamics, workplace readiness, leadership potential, and behaviour under pressure and adaptability to change. Both draw on the same facet evidence, read for a different purpose.

Important limits: KYKOLOGY Campus is intended for reflection, coaching and development. It is NOT a clinical, psychiatric or diagnostic instrument, and it is not intended as the sole basis for admission, grading or other high-stakes decisions. Patterns are indicative and developmental, not fixed.`

/**
 * Sent as the system prompt. Written for a model, not a reader: the shapes are
 * the spec, and each rule exists to fix a mistake observed in testing.
 *
 * Three of them earn their place outright. Without the comparative rule,
 * "students with leadership skills" reads as an absolute threshold and returns 5
 * of 369, because the facet-bundle distribution is squashed into DEVELOPING and
 * MODERATE — a true answer that makes the platform look blind. Without the
 * unassessed rule, the model asks for a `segment` column on students who have no
 * record to derive one from. And without the no-prose rule, "what are the six
 * dimensions?" came back as an essay that failed to parse, so the one question a
 * dean is most likely to ask read as a crash.
 */
export const SCHEMA_PROMPT = `You are the assistant inside KYKOLOGY™ Campus, an admin dashboard for a university. You do exactly two things: you look up students in this cohort, and you explain the KYKOLOGY 6D Profile itself. Reply with JSON only, no prose outside it.

Choose one of three shapes.

1. A question about which students — who needs support, who is strongest at something, who has not finished:
{"intent":"list","say":"<one short sentence introducing the result>", …query fields below}

2. A question about the assessment, the report, the six dimensions, the facets, the DEPTH pathway, what the tool is for or what it must not be used for:
{"intent":"explain","say":"<2–4 sentences, answered ONLY from the briefing below>"}

3. Anything else — general knowledge, other software, advice unrelated to this instrument, or anything the briefing does not cover:
{"error":"unsupported"}

QUERY FIELDS for intent "list":

{"list":"students",
 "where"?:{"segment"?:(${SEGMENT_IDS.map((s) => `"${s}"`).join('|')})[],
           "completed"?:boolean,
           "faculty"?:string,
           "intakeYear"?:number},
 "rank"?:{"by":${RANK_KEYS.map((k) => `"${k}"`).join('|')},"topN":number},
 "show":(${COLUMNS.map((c) => `"${c}"`).join('|')})[]}

Rank keys: lead=Leadership potential, team=Collaborative spirit (the fact sheet calls this team compatibility and dynamics; both mean this key), resil=Emotional resilience, work=Workplace readiness, swing=Behaviour under pressure.

Segments: silent=Silent Contributors, driven=Driven and Under-Regulated, explorer=Under-stretched Explorers, fragile=Transition Fragile, adrift=Purpose Adrift, steady=Steady Core, unflagged=Unflagged.
Students needing intervention or support are exactly: ${INTERVENTION_SEGMENTS.join(', ')}.

Rules for "list":
- For comparative questions ("with leadership skills", "strongest", "most resilient", "best under pressure") use rank with topN ${DEFAULT_TOP_N}. Never approximate a comparison with a segment filter.
- Students who have not completed an assessment have no segment and no score. When "completed":false, ask for "inviteStatus" instead of "segment" or "score".
- Include "action" whenever the question is about who needs help — every flagged segment carries a recommended next step.
- Your "say" sentence must contain NO numbers. It introduces the result; the counts and scores are filled in by the dashboard from the real data. Write "Here are the students flagged for support, with the recommended step for each." — never "Here are 47 students."

Rules for "explain":
- Answer only from the briefing above. If it does not cover the question, use {"error":"unsupported"} instead of reasoning from general knowledge.
- Never state a figure about this cohort in an explain answer. Anything about who or how many is a "list".
- Plain English, no jargon the briefing does not itself use. Two to four sentences.

Context: the message may end with a line saying which screen the user is on. Use it to resolve vague references — "here", "this group", "these students" — and to prefer the reading that fits that screen. It is orientation, not a limit: you may still query any faculty, intake or wave, and answer about any part of the instrument.

BRIEFING — the only source for "explain" answers:
${PRODUCT_BRIEF}`

/**
 * Restores the `{` used to prefill the assistant turn — but only when the model
 * actually continued from it.
 *
 * glm-5.2 honours the prefill for a query and ignores it for a refusal, emitting
 * the whole `{"error":"unsupported"}` object itself. Prepending unconditionally
 * turns that into `{{"error":...}`, which fails to parse — so the one path that
 * most needs to fail gracefully was the one reporting "not valid JSON".
 */
export function reassemble(text: string): string {
  const t = text.trim()
  return t.startsWith('{') ? t : `{${t}`
}

export type ParseResult = { ok: true; spec: QuerySpec } | { ok: false; reason: string }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)

/** Unknown keys are a signal the model misread the schema, so they reject the whole spec. */
const unknownKeys = (o: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(o).filter((k) => !allowed.includes(k))

function parseWhere(raw: unknown): QueryWhere | string {
  if (!isObject(raw)) return 'where must be an object'
  const extra = unknownKeys(raw, ['segment', 'completed', 'faculty', 'intakeYear'])
  if (extra.length) return `unknown filter: ${extra.join(', ')}`

  const where: QueryWhere = {}

  if ('segment' in raw) {
    const seg = raw.segment
    if (!Array.isArray(seg) || seg.length === 0) return 'segment must be a non-empty array'
    const bad = seg.filter((s) => !(SEGMENT_IDS as readonly unknown[]).includes(s))
    if (bad.length) return `unknown segment: ${bad.join(', ')}`
    where.segment = seg as SegmentId[]
  }
  if ('completed' in raw) {
    if (typeof raw.completed !== 'boolean') return 'completed must be true or false'
    where.completed = raw.completed
  }
  if ('faculty' in raw) {
    if (typeof raw.faculty !== 'string' || !raw.faculty.trim()) return 'faculty must be a name'
    where.faculty = raw.faculty.trim()
  }
  if ('intakeYear' in raw) {
    if (!isInt(raw.intakeYear)) return 'intakeYear must be a whole number'
    where.intakeYear = raw.intakeYear
  }
  return where
}

/**
 * `raw` is the complete JSON text. The Worker restores the `{` it used to
 * prefill the assistant turn before handing it over, so parsing stays a pure
 * string-in/spec-out function that tests can drive without a network.
 */
export function parseQuery(raw: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'not valid JSON' }
  }
  if (!isObject(json)) return { ok: false, reason: 'not a JSON object' }

  // The model's own refusal, passed through as-is rather than guessed at.
  if (typeof json.error === 'string') return { ok: false, reason: 'unsupported' }

  return validateSpec(json)
}

function validateSpec(json: Record<string, unknown>): ParseResult {
  const extra = unknownKeys(json, ['intent', 'say', 'list', 'where', 'rank', 'show'])
  if (extra.length) return { ok: false, reason: `unknown field: ${extra.join(', ')}` }

  if (json.list !== 'students') return { ok: false, reason: 'only student lists are supported' }

  const spec: QuerySpec = { list: 'students', show: DEFAULT_SHOW }

  if ('where' in json) {
    const where = parseWhere(json.where)
    if (typeof where === 'string') return { ok: false, reason: where }
    spec.where = where
  }

  if ('rank' in json) {
    const rank = json.rank
    if (!isObject(rank)) return { ok: false, reason: 'rank must be an object' }
    const badKeys = unknownKeys(rank, ['by', 'topN'])
    if (badKeys.length) return { ok: false, reason: `unknown rank field: ${badKeys.join(', ')}` }
    if (!(RANK_KEYS as readonly unknown[]).includes(rank.by))
      return { ok: false, reason: `unknown rank key: ${String(rank.by)}` }
    const topN = 'topN' in rank ? rank.topN : DEFAULT_TOP_N
    if (!isInt(topN) || topN < 1) return { ok: false, reason: 'topN must be a positive whole number' }
    spec.rank = { by: rank.by as RankKey, topN: Math.min(topN, MAX_TOP_N) }
  }

  if ('show' in json) {
    const show = json.show
    if (!Array.isArray(show) || show.length === 0) return { ok: false, reason: 'show must be a non-empty array' }
    const bad = show.filter((c) => !(COLUMNS as readonly unknown[]).includes(c))
    if (bad.length) return { ok: false, reason: `unknown column: ${bad.join(', ')}` }
    spec.show = show as Column[]
  }

  if (!spec.where && !spec.rank) return { ok: false, reason: 'no filter or ranking given' }

  return { ok: true, spec }
}

/** Framing sentences longer than this are the model drifting into an essay. */
export const MAX_SAY = 700

export type Ask =
  | { ok: true; kind: 'list'; say: string; spec: QuerySpec }
  | { ok: true; kind: 'explain'; say: string }
  | { ok: false; reason: string }

/**
 * The outer envelope: which of the two things the assistant was asked to do.
 *
 * `list` answers keep the safety property intact — the model supplies a
 * predicate and a sentence, the app supplies every figure. `explain` answers do
 * not: they are model prose, and the only thing holding them to the truth is
 * that `PRODUCT_BRIEF` is their sole permitted source. That is a real difference
 * in kind, which is why explain answers are barred from mentioning the cohort
 * at all — the two failure modes are kept on opposite sides of the fence.
 */
export function parseAsk(raw: string): Ask {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'not valid JSON' }
  }
  if (!isObject(json)) return { ok: false, reason: 'not a JSON object' }
  if (typeof json.error === 'string') return { ok: false, reason: 'unsupported' }

  const say = typeof json.say === 'string' ? json.say.trim() : ''
  if (say.length > MAX_SAY) return { ok: false, reason: 'answer too long' }

  if (json.intent === 'explain') {
    if (!say) return { ok: false, reason: 'explain needs an answer' }
    return { ok: true, kind: 'explain', say }
  }

  if (json.intent === 'list' || 'where' in json || 'rank' in json) {
    // `intent` already says students, so the older `list` field is optional —
    // but a different value is still a misread and still rejects.
    const spec = validateSpec({ ...json, list: json.list ?? 'students' })
    if (!spec.ok) return spec
    /*
     * A number in the framing sentence is dropped, not rejected.
     *
     * The model cannot know the count — the app computes it after this — so any
     * figure here is invented, and "Here are 47 students" above a table reading
     * 107 is the exact failure this whole design exists to prevent. Losing the
     * sentence costs a pleasantry; keeping it costs the demo.
     */
    const framing = /\d/.test(say) ? '' : say
    return { ok: true, kind: 'list', say: framing, spec: spec.spec }
  }

  return { ok: false, reason: 'no intent given' }
}
