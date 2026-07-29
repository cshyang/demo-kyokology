import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildData, segmentCounts } from './generator.ts'
import { latest } from './derive.ts'
import { dynOf, engagementFor, extraWaves, facetsOf, k7, kband, kmag, waveSeries } from './layers.ts'

const data = buildData()
const assessed = data.students.filter((st) => latest(data, st.id))

/**
 * The whole safety argument for this module. Facets and dynamic ranges are drawn
 * from a hash of the student id, never from the generator's stream, so adding
 * them cannot re-roll a published figure.
 */
test('the layers do not disturb the generator', () => {
  const before = segmentCounts(buildData())
  const d = buildData()
  extraWaves(d)
  for (const st of d.students.slice(0, 50)) {
    const r = latest(d, st.id)
    if (!r) continue
    for (const t of d.T) {
      facetsOf(st.id, 1, t, r.sc[t])
      dynOf(st.id, 1, d.T, r.sc, t)
    }
  }
  assert.deepEqual(segmentCounts(d), before)
})

/**
 * Facets are a presentation of the dimension score, not a second measurement of
 * it. If their mean drifts, this screen and Fingerprint publish different
 * numbers for one student.
 *
 * Away from the clamps the only slack is rounding — six integers averaging to
 * one, so at most 1/3 of a point.
 */
test('the six facets average back to the dimension score', () => {
  for (const st of assessed) {
    const rec = latest(data, st.id)!
    for (const t of data.T) {
      const score = rec.sc[t]
      if (score < 10 || score > 90) continue
      const f = facetsOf(st.id, 1, t, score)
      assert.equal(f.length, 6)
      const mean = f.reduce((a, b) => a + b.s, 0) / 6
      assert.ok(
        Math.abs(mean - score) <= 0.5,
        `${st.id} ${t}: facets average ${mean.toFixed(2)}, dimension is ${score}`,
      )
    }
  }
})

/**
 * At the ends of the scale the mean cannot hold, and this is inherent to the
 * design's algorithm rather than a porting slip: facets are clamped to [3, 97],
 * so a dimension sitting at 97 has no room above it and any spread can only pull
 * the average down.
 *
 * Measured worst case across the cohort is 1.67 points, at the 2.9% of scores
 * that sit within a few points of a clamp — 0.12 once converted to the 1–7 scale
 * the screen prints, so at most one decimal place. Everywhere else the only
 * slack is rounding. Bounded here so it stays a rounding artefact rather than
 * growing into a disagreement a reader could actually see.
 */
test('facet mean drift stays within one printed decimal', () => {
  let worst = 0
  for (const st of assessed) {
    const rec = latest(data, st.id)!
    for (const t of data.T) {
      const f = facetsOf(st.id, 1, t, rec.sc[t])
      worst = Math.max(worst, Math.abs(f.reduce((a, b) => a + b.s, 0) / 6 - rec.sc[t]))
    }
  }
  assert.ok(worst <= 2, `worst facet mean drift ${worst.toFixed(2)} points`)
  assert.ok(worst * 0.07 <= 0.15, `drift is ${(worst * 0.07).toFixed(3)} on the 1-7 scale`)
})

test('facets are ordered strongest first and stay on the scale', () => {
  for (const st of assessed.slice(0, 200)) {
    const rec = latest(data, st.id)!
    for (const t of data.T) {
      const f = facetsOf(st.id, 1, t, rec.sc[t])
      for (let i = 1; i < f.length; i++) assert.ok(f[i - 1].s >= f[i].s, `${st.id} ${t}: out of order`)
      for (const x of f) assert.ok(x.s >= 3 && x.s <= 97, `${st.id} ${t}: facet ${x.s} off scale`)
    }
  }
})

/**
 * Golden values, read off the design project's own rendering of S0003.
 *
 * The seed string is part of the output, not an implementation detail — the
 * design keys the facet hash on the dimension's index, and seeding on its key
 * instead ('…|f|3|sa' rather than '…|f|3|0') produces a plausible-looking but
 * completely different set of facets. Nothing else in the suite catches that,
 * because every other property still holds. This is the check that does.
 */
test('S0003 Self-Actualisation matches the design, facet for facet', () => {
  const st = data.students.find((s) => s.id === 'S0003')!
  const series = waveSeries(data, st, extraWaves(data))
  const cur = series[series.length - 1]
  const f = facetsOf(st.id, cur.n, 'sa', cur.sc.sa)
  assert.deepEqual(
    f.map((x) => [x.name, x.v7]),
    [
      ['Growth Mindset & Learning', '4.1'],
      ['Achievement & Results', '4.0'],
      ['Ethics, Morals & Integrity', '3.3'],
      ['Purposeful & Meaningful Life', '2.9'],
      ['Satisfaction & Fulfilment', '2.9'],
      ['Logical Reasoning & Right Thinking', '2.9'],
    ],
  )
})

test('derivation is deterministic and student-specific', () => {
  assert.deepEqual(facetsOf('S0042', 1, 'sa', 61), facetsOf('S0042', 1, 'sa', 61))
  assert.notDeepEqual(facetsOf('S0042', 1, 'sa', 61), facetsOf('S0043', 1, 'sa', 61))
})

/**
 * The scale is `s * 0.07`, not `1 + s/100*6`. The published band cuts are
 * proportions of the maximum — 2.44/7 is 35%, 5.59/7 is 80% — so only the plain
 * multiple lands a boundary where the report prints it.
 */
test('the 1-7 scale puts the published band edges where the report prints them', () => {
  assert.equal(k7(100).toFixed(2), '7.00')
  assert.equal(kband(34).t, 'LOW')
  assert.equal(kband(35).t, 'DEVELOPING')
  assert.equal(kband(59).t, 'DEVELOPING')
  assert.equal(kband(60).t, 'MODERATE')
  assert.equal(kband(79).t, 'MODERATE')
  assert.equal(kband(80).t, 'STRONG')
  assert.equal(kband(89).t, 'STRONG')
  assert.equal(kband(90).t, 'VERY STRONG')
  // The dimension chip is cut on the same ruler, one level coarser.
  assert.equal(kmag(59), 'LOW')
  assert.equal(kmag(60), 'MEDIUM')
  assert.equal(kmag(79), 'MEDIUM')
  assert.equal(kmag(80), 'HIGH')
})

/** Against NurAin's published profile: 6.1 and 5.9 HIGH, 5.0 and 4.2 MEDIUM, 3.8 and 3.4 LOW. */
test('the published report profile bands the way the report shows it', () => {
  const fromSeven = (v: number) => Math.round(v / 0.07)
  assert.equal(kmag(fromSeven(6.1)), 'HIGH')
  assert.equal(kmag(fromSeven(5.9)), 'HIGH')
  assert.equal(kmag(fromSeven(5.0)), 'MEDIUM')
  assert.equal(kmag(fromSeven(4.2)), 'MEDIUM')
  assert.equal(kmag(fromSeven(3.8)), 'LOW')
  assert.equal(kmag(fromSeven(3.4)), 'LOW')
})

/**
 * The check-in only ever sits between the two October waves, so `latest()` still
 * returns the Oct 2026 retest and every count built on it is untouched.
 */
test('the Apr 2026 check-in is never a student latest record', () => {
  const xw = extraWaves(data)
  const ids = Object.keys(xw)
  assert.ok(ids.length > 0, 'no check-in waves generated')
  for (const id of ids) {
    assert.equal(data.byId[id].intakeYear, 2024)
    assert.equal(xw[id].at, '14 Apr 2026')
    assert.equal(latest(data, id), data.w2[id])
  }
})

/**
 * The check-in's scores are nudged off October's, and a nudge is enough to cross
 * `se < 35` or `c < 40`. Inheriting the previous label put a segment on 24% of
 * check-in cards that the scores printed beside it contradicted.
 */
test('the check-in segment is computed from its own scores', () => {
  const xw = extraWaves(data)
  for (const id of Object.keys(xw)) {
    assert.equal(
      xw[id].seg,
      data.segOf(xw[id].sc, data.byId[id]),
      `${id}: stored segment disagrees with its own scores`,
    )
  }
})

/**
 * These thresholds are shares of the cohort, so the draw behind them has to be
 * uniform. A gaussian squashed into [0,1] is a bell centred on 0.5, against
 * which `< 0.71` quietly stops meaning "71% of them".
 */
test('engagement thresholds land near the shares they name', () => {
  const n = assessed.length
  let opened = 0
  for (const st of assessed) if (engagementFor(st.id, '1 Jan 2026').reportOpened) opened++
  const share = opened / n
  assert.ok(Math.abs(share - 0.71) < 0.05, `report-opened share ${(share * 100).toFixed(1)}%, expected ~71%`)
})

test('2024-intake students read as three assessments, in date order', () => {
  const xw = extraWaves(data)
  const st = data.students.find((s) => xw[s.id])!
  const series = waveSeries(data, st, xw)
  assert.equal(series.length, 3)
  assert.deepEqual(series.map((w) => w.n), [1, 2, 3])
  assert.equal(series[1].date, '14 Apr 2026')
  assert.ok(series.every((w) => w.total === 3))
})

/**
 * Pressure is not symmetric noise: Security reaches hardest when a profile is
 * already low on it, and Spirituality is the damped, stable thread.
 */
test('dynamic range moves Security most and Spirituality least', () => {
  let seSum = 0, spSum = 0
  for (const st of assessed) {
    const rec = latest(data, st.id)!
    seSum += Math.abs(dynOf(st.id, 1, data.T, rec.sc, 'se'))
    spSum += Math.abs(dynOf(st.id, 1, data.T, rec.sc, 'sp'))
  }
  assert.ok(seSum > spSum * 2, `Security ${seSum} should move far more than Spirituality ${spSum}`)
})

test('dynamic range stays inside its clamp', () => {
  for (const st of assessed.slice(0, 200)) {
    const rec = latest(data, st.id)!
    for (const t of data.T) {
      const d = dynOf(st.id, 1, data.T, rec.sc, t)
      assert.ok(d >= -24 && d <= 24, `${st.id} ${t}: swing ${d} outside clamp`)
    }
  }
})
