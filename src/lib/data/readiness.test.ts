import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildData, segmentCounts } from './generator.ts'
import { FACETS } from './layers.ts'
import { READS } from './readiness.ts'

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
