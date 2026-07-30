import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DIMS, buildData, segmentCounts } from './generator.ts'
import { latest } from './derive.ts'
import { FACETS, dynOf, extraWaves, facetsOf, waveSeries } from './layers.ts'
import { READS, bandOf, readinessOf, tally } from './readiness.ts'

const data = buildData()

const tilesOf = (rows: ReturnType<typeof readinessOf>) =>
  Object.fromEntries(tally(rows).map((t) => [t.key, t]))

/**
 * The cheapest high-value test here. A mistyped facet name does not throw at
 * module load — it resolves to `undefined`, averages to `NaN`, and renders a
 * blank bar with no error anywhere. This is the only thing that catches it.
 */
test('every bundle facet name exists on its dimension', () => {
  for (const r of READS) {
    if (!r.facets) continue
    for (const [dim, name] of r.facets) {
      assert.ok(
        (FACETS[dim] as readonly string[]).includes(name),
        `${r.name}: "${name}" is not a facet of ${dim}`,
      )
    }
  }
})

test('the five reads are the five the fact sheet promises', () => {
  assert.deepEqual(
    READS.map((r) => r.key),
    ['lead', 'team', 'resil', 'work', 'press'],
  )
  // Exactly one read is the pressure model rather than a facet bundle.
  assert.equal(READS.filter((r) => r.facets === null).length, 1)
  for (const r of READS) {
    if (r.facets) assert.equal(r.facets.length, 3, `${r.name} must bundle exactly three facets`)
  }
})

test('importing the readiness layer does not disturb the generator', () => {
  const before = segmentCounts(buildData())
  assert.deepEqual(segmentCounts(buildData()), before)
})

test('one row per assessed student', () => {
  const rows = readinessOf(data, 'latest')
  assert.equal(rows.length, 369)
  assert.equal(rows.length, data.students.filter((st) => latest(data, st.id)).length)
})

/**
 * The bug class that produced the extraWaves segment drift: two screens
 * answering one question differently. waveN is a student's ordinal position in
 * their OWN series, so if this layer picks a different one than the profile
 * does, the same student's Leadership number differs between two screens with
 * nothing on either to explain it.
 */
test('waveN matches the ordinal the profile computes for the same student', () => {
  const xw = extraWaves(data)
  for (const row of readinessOf(data, 'latest').slice(0, 40)) {
    const st = data.byId[row.id]
    const series = waveSeries(data, st, xw)
    assert.equal(row.waveN, series[series.length - 1].n, `student ${row.id}`)
  }
})

test('a bundle score is the mean of the three facet scores the profile shows', () => {
  for (const row of readinessOf(data, 'latest').slice(0, 25)) {
    const rec = latest(data, row.id)!
    const pick = (dim: 'e' | 'c' | 'sa', name: string) =>
      facetsOf(row.id, row.waveN, dim, rec.sc[dim]).find((f) => f.name === name)!.s
    const expected =
      (pick('e', 'Lead & Take Charge') +
        pick('c', 'Inspiring & Influencing') +
        pick('sa', 'Achievement & Results')) /
      3
    assert.equal(row.scores.lead, expected, `student ${row.id}`)
  }
})

test('swing is the widest absolute pressure shift across all six dimensions', () => {
  for (const row of readinessOf(data, 'latest').slice(0, 25)) {
    const rec = latest(data, row.id)!
    const widest = Math.max(...DIMS.map((d) => Math.abs(dynOf(row.id, row.waveN, DIMS, rec.sc, d))))
    assert.equal(row.swing, widest, `student ${row.id}`)
  }
})

test('the first assessment is a smaller, earlier population than the latest', () => {
  const w1 = readinessOf(data, 'w1')
  assert.ok(w1.length > 0 && w1.length < 369)
  for (const row of w1.slice(0, 20)) assert.equal(row.waveN, 1)
})

test('computing readiness does not disturb the generator', () => {
  const before = segmentCounts(buildData())
  const d = buildData()
  readinessOf(d, 'latest')
  readinessOf(d, 'w1')
  assert.deepEqual(segmentCounts(d), before)
})

/**
 * Golden values, measured against seed 0x4B59A71D before any UI existed. These
 * are the largest-remainder display percentages — what the legend actually
 * prints — not independently rounded shares. Independent rounding puts WIDE at
 * 25% and the four pressure bands at 101.
 */
test('unfiltered tile distributions match the spec', () => {
  const t = tilesOf(readinessOf(data, 'latest'))
  assert.equal(t.lead.n, 369)
  assert.deepEqual(t.lead.bands.map((b) => b.pct), [1, 62, 36, 1, 0])
  assert.deepEqual(t.team.bands.map((b) => b.pct), [8, 49, 37, 5, 1])
  assert.deepEqual(t.resil.bands.map((b) => b.pct), [2, 62, 36, 0, 0])
  assert.deepEqual(t.work.bands.map((b) => b.pct), [0, 38, 55, 7, 0])
  assert.deepEqual(t.press.bands.map((b) => b.pct), [15, 45, 24, 16])
  assert.equal(t.press.median, 11)
  // Resilience displays 3.9, not 4.0 — its mean is 3.95 and toFixed(1) floors it.
  assert.deepEqual([t.lead.v7, t.team.v7, t.resil.v7, t.work.v7], ['4.0', '3.9', '3.9', '4.4'])
})

test('the headline share is the sentence a Dean repeats', () => {
  const t = tilesOf(readinessOf(data, 'latest'))
  assert.equal(t.lead.headline, 'DEVELOPING or below for 63% of 369')
  assert.equal(t.work.headline, 'DEVELOPING or below for 38% of 369')
  assert.equal(t.press.headline, 'Shifts widely or more for 40% of 369')
})

test('the tiles move when the cohort is filtered', () => {
  const rows = readinessOf(data, 'latest')
  const eng = tilesOf(rows.filter((r) => data.byId[r.id].faculty === 'Engineering'))
  const health = tilesOf(rows.filter((r) => data.byId[r.id].faculty === 'Health'))
  const y2026 = tilesOf(rows.filter((r) => data.byId[r.id].intakeYear === 2026))
  // Collaborative spirit is the widest faculty separation on the page.
  assert.equal(eng.team.headline, 'DEVELOPING or below for 74% of 91')
  assert.equal(health.team.headline, 'DEVELOPING or below for 42% of 85')
  // The 2026 intake is the page's headline story: worst on four of five reads.
  assert.equal(y2026.lead.headline, 'DEVELOPING or below for 81% of 78')
})

test('band shares sum to exactly 100 for every tile and every faculty', () => {
  const rows = readinessOf(data, 'latest')
  for (const fac of ['All', 'Engineering', 'Arts', 'Business', 'Health']) {
    const keep = rows.filter((r) => fac === 'All' || data.byId[r.id].faculty === fac)
    for (const t of tally(keep)) {
      assert.equal(t.bands.reduce((a, b) => a + b.pct, 0), 100, `${fac} / ${t.name}`)
    }
  }
})

test('an empty cohort renders as not-yet-measurable, never NaN', () => {
  for (const t of tally([])) {
    assert.equal(t.n, 0)
    assert.equal(t.v7, null)
    assert.equal(t.median, null)
    assert.equal(t.headline, 'NOT YET MEASURABLE')
    for (const b of t.bands) assert.equal(b.pct, 0)
  }
})

/**
 * The bar and the roster share one cut, or the drill-through lies.
 *
 * A band drawn 17 wide that lists 19 students underneath is the exact failure
 * mode the rest of this codebase is arranged to prevent, and it would only show
 * up mid-demo. Every band a tile draws must be reproducible by filtering the
 * same rows through `bandOf`.
 */
test('every band count is reproducible by filtering rows through bandOf', () => {
  const rows = readinessOf(data, 'latest')
  for (const fac of ['All', 'Engineering', 'Health']) {
    const keep = rows.filter((r) => fac === 'All' || data.byId[r.id].faculty === fac)
    for (const t of tally(keep)) {
      let seen = 0
      for (const b of t.bands) {
        assert.equal(
          keep.filter((r) => bandOf(r, t.key) === b.name).length,
          b.n,
          `${fac} / ${t.name} / ${b.name}`,
        )
        seen += b.n
      }
      // No student may fall outside every band — an open-ended top band and a
      // zero floor are what guarantee it, and this is what proves they do.
      assert.equal(seen, keep.length, `${fac} / ${t.name} leaves students unbanded`)
    }
  }
})

test('every tile carries the facet names it is built from', () => {
  const t = tilesOf(readinessOf(data, 'latest'))
  // Collaborative spirit correlates 0.98 with Sociocentricity. That is deliberate,
  // and printing its three facet names on the tile is how it is disclosed.
  assert.deepEqual(t.team.facetNames, [
    'Collaboration & Teamwork',
    'Empathy & Understanding',
    'Human & Interpersonal Relationships',
  ])
  assert.equal(t.press.facetNames, null)
})
