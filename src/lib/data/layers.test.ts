import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildData } from './generator.ts'
import { latest } from './derive.ts'
import { bandOf, BANDS, facetValues, percentileOf, underPressure } from './layers.ts'

const data = buildData()
const assessed = data.students.filter((st) => latest(data, st.id))

/**
 * The load-bearing one. Facets are a presentation of the dimension score, not a
 * second measurement of it — the moment their mean drifts, this screen and
 * Fingerprint start publishing different numbers for the same student.
 */
test('the six facets average back to the dimension score, for every assessed student', () => {
  for (const st of assessed) {
    const rec = latest(data, st.id)!
    for (const t of data.T) {
      const f = facetValues(st.id, t, rec.sc[t])
      assert.equal(f.length, 6)
      assert.equal(
        f.reduce((a, b) => a + b, 0),
        rec.sc[t] * 6,
        `${st.id} ${t}: facets ${f.join(',')} do not average to ${rec.sc[t]}`,
      )
    }
  }
})

test('facets stay on the scale', () => {
  for (const st of assessed.slice(0, 200)) {
    const rec = latest(data, st.id)!
    for (const t of data.T) {
      for (const v of facetValues(st.id, t, rec.sc[t])) {
        assert.ok(v >= 0 && v <= 100, `${st.id} ${t}: facet ${v} off scale`)
      }
    }
  }
})

test('facet derivation is deterministic', () => {
  const a = facetValues('S0042', 'sa', 61)
  const b = facetValues('S0042', 'sa', 61)
  assert.deepEqual(a, b)
  assert.notDeepEqual(a, facetValues('S0043', 'sa', 61))
})

/**
 * The whole reason bands are cut on percentile rather than on position on the
 * scale: absolute thresholds put half the cohort in one bucket. If any band ever
 * holds more than 40% again, the norm reference has stopped being a norm.
 */
test('no band swallows the cohort', () => {
  const counts: Record<string, number> = {}
  let n = 0
  for (const t of data.T) {
    const pop = assessed.map((st) => latest(data, st.id)!.sc[t]).sort((a, b) => a - b)
    for (const v of pop) {
      const b = bandOf(percentileOf(v, pop))
      counts[b.id] = (counts[b.id] ?? 0) + 1
      n++
    }
  }
  for (const b of BANDS) {
    const share = (counts[b.id] ?? 0) / n
    assert.ok(share <= 0.4, `${b.label} holds ${(share * 100).toFixed(1)}% of the cohort`)
  }
})

test('pressure compresses the profile toward its own centre', () => {
  const spread = (sc: Record<string, number>) => {
    const vals = data.T.map((t) => sc[t])
    return Math.max(...vals) - Math.min(...vals)
  }
  for (const st of assessed.slice(0, 200)) {
    const rec = latest(data, st.id)!
    assert.ok(
      spread(underPressure(rec.sc, data.T)) <= spread(rec.sc),
      `${st.id}: pressure widened the profile`,
    )
  }
})
