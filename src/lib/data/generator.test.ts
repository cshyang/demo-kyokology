import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildData, segmentCounts, DIMS, type SegmentId } from './generator.ts'

// Measured against the original Claude Design prototype. These are exact, not targets:
// the generator is already tuned, so any drift means the port broke the RNG call order.
const EXPECTED: Record<SegmentId, number> = {
  silent: 44,
  driven: 25,
  explorer: 28,
  fragile: 17,
  adrift: 21,
  steady: 139,
  unflagged: 95,
}
const ASSESSED = 369

test('segment counts match the prototype exactly', () => {
  assert.deepEqual(segmentCounts(buildData()), EXPECTED)
})

test('the seven buckets sum to the assessed population', () => {
  const total = Object.values(EXPECTED).reduce((a, b) => a + b, 0)
  assert.equal(total, ASSESSED)
  assert.equal(Object.values(segmentCounts(buildData())).reduce((a, b) => a + b, 0), ASSESSED)
})

test('assessed population equals everyone with a completed result', () => {
  const d = buildData()
  assert.equal(Object.keys(d.w2).length + Object.keys(d.w3).length, ASSESSED)
})

test('generation is deterministic across runs', () => {
  const a = buildData(), b = buildData()
  assert.equal(JSON.stringify(a.students), JSON.stringify(b.students))
  assert.equal(JSON.stringify(a.w2), JSON.stringify(b.w2))
  assert.equal(a.churnPct, b.churnPct)
})

test('archetype churn between waves stays under 8%', () => {
  assert.ok(buildData().churnPct < 8, `churn was ${buildData().churnPct}%`)
})

test('every independent tally of the segments agrees', async () => {
  // Three places count segments: segmentCounts() here, segmentTally() in
  // derive.ts, and the useMemo in segments/page.tsx (which calls the same
  // helpers). If someone "simplifies" one, the hero screen and the Overview
  // KPI diverge silently. This pins them together.
  const { segmentTally } = await import('./derive.ts')
  const d = buildData()
  assert.deepEqual(segmentTally(d), EXPECTED)
  assert.deepEqual(segmentCounts(d), segmentTally(d))
})

test('funnel numbers are the measured literals, not a recomputation', async () => {
  // Hardcoded so a wrong cascade fails, not merely an inconsistent one:
  // asserting the implementation against itself proves nothing.
  const { campaignFunnel } = await import('./derive.ts')
  const d = buildData()
  const byId = Object.fromEntries(d.campaigns.map((c) => [c.id, campaignFunnel(c)]))
  assert.deepEqual(byId.A, { bounced: 11, sent: 549, opened: 436, started: 341, completed: 291 })
  assert.deepEqual(byId.B, { bounced: 11, sent: 549, opened: 436, started: 341, completed: 291 })
  assert.deepEqual(byId.C, { bounced: 6, sent: 274, opened: 178, started: 114, completed: 78 })
})

test('funnel quotas are exact and campaigns A/B cover one population', () => {
  const d = buildData()
  const AB = d.students.filter((s) => s.intakeYear !== 2026)
  const C = d.students.filter((s) => s.intakeYear === 2026)
  assert.equal(AB.length, 560)
  assert.equal(C.length, 280)
  assert.equal(d.students.length, 840)

  const tally = (list: typeof AB, key: 'sA' | 'sB' | 'sC') =>
    list.reduce<Record<string, number>>((m, s) => ((m[s[key]!] = (m[s[key]!] ?? 0) + 1), m), {})

  assert.deepEqual(tally(AB, 'sA'), { bounced: 11, completed: 291, started: 50, opened: 95, sent: 113 })
  assert.deepEqual(tally(C, 'sC'), { bounced: 6, completed: 78, started: 36, opened: 64, sent: 96 })
  // B mirrors A, so the retest covers exactly the same students.
  assert.deepEqual(tally(AB, 'sB'), tally(AB, 'sA'))
})

test('completed <= started <= opened <= sent holds as a cascade', () => {
  const d = buildData()
  for (const c of d.campaigns) {
    const t = c.list.reduce<Record<string, number>>(
      (m, s) => ((m[s[c.key]!] = (m[s[c.key]!] ?? 0) + 1), m), {})
    const sent = c.list.length - (t.bounced ?? 0)
    const opened = sent - (t.sent ?? 0)
    const started = opened - (t.opened ?? 0)
    const completed = t.completed ?? 0
    assert.ok(completed <= started, `${c.id}: completed ${completed} > started ${started}`)
    assert.ok(started <= opened, `${c.id}: started ${started} > opened ${opened}`)
    assert.ok(opened <= sent, `${c.id}: opened ${opened} > sent ${sent}`)
  }
})

test('every score sits inside the clamp range', () => {
  const d = buildData()
  for (const st of d.students)
    for (const t of DIMS) assert.ok(st.base[t] >= 3 && st.base[t] <= 97)
})
