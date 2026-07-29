import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DIMS, buildData, segmentCounts } from './generator.ts'
import { latest } from './derive.ts'
import { FACETS, dynOf, extraWaves, facetsOf, waveSeries } from './layers.ts'
import { READS, readinessOf } from './readiness.ts'

const data = buildData()

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
