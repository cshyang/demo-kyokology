# Readiness Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/readiness` — the educator half of the fact sheet's "one framework, two views" — as five cohort-level reads over facets the platform already computes.

**Architecture:** A new pure module `src/lib/data/readiness.ts` sits downstream of `layers.ts`, which is itself downstream of the frozen `generator.ts`. It draws only from `facetsOf` and `dynOf`, both hash-seeded on student id, so nothing it does can re-roll a published figure. The page computes the whole cohort once per wave (13 ms measured), then filters a precomputed array on faculty and intake.

**Tech Stack:** Next.js 16 App Router · React 19 · Tailwind CSS v4 · TypeScript · `node --test` with `--experimental-strip-types`

**Spec:** `docs/superpowers/specs/2026-07-30-readiness-page-design.md`

## Global Constraints

- **`src/lib/data/generator.ts` is frozen.** Do not edit it. Every published figure depends on the seed `0x4B59A71D` *and* the exact `rnd()` call order.
- **Never draw from the generator's stream.** All new randomness comes from `hgauss`/`hrand` in `layers.ts`, keyed on student id.
- Display scale is `k7(s) = s * 0.07`. Not affine. Use the exported `k7`/`k7s` helpers, never a local copy.
- Band cuts are the design's absolute values, already implemented in `kband`: LOW <2.45 · DEVELOPING <4.20 · MODERATE <5.60 · STRONG <6.30 · VERY STRONG. Do not re-derive them.
- Tailwind v4 only — no config file, tokens come from `@theme` in the global stylesheet. Match existing class idiom (`text-[13px]`, `text-ink/45`).
- Run `npm test`, `npm run typecheck`, and `npm run build` before any commit that touches `src/`.
- Branch `readiness-page` is already checked out with the spec committed at `9641354`.

---

### Task 1: Read definitions and the safety guards

The bundle definitions plus the two tests that prove they are correct and harmless. No aggregation yet — this task exists on its own because a wrong facet name here silently produces `NaN` in every downstream tile, and a wrong import could disturb the generator.

**Files:**
- Create: `src/lib/data/readiness.ts`
- Create: `src/lib/data/readiness.test.ts`

**Interfaces:**
- Consumes: `FACETS`, `type Dim` from existing modules.
- Produces: `READS: readonly Read[]`, `interface Read { key: string; name: string; blurb: string; facets: readonly (readonly [Dim, string])[] | null }`. Task 2 reads `READS`; Task 3 maps over it.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/data/readiness.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './readiness.ts'`

- [ ] **Step 3: Write the read definitions**

Create `src/lib/data/readiness.ts`:

```ts
import type { Dim } from './generator.ts'

/**
 * The educator half of "one framework, two views".
 *
 * Four facet bundles plus the pressure model. Bundle composition was measured,
 * not guessed: `facetsOf` derives facets FROM the dimension score and re-centres
 * them on it, so a bundle drawn from one dimension is that dimension renamed.
 * Leadership therefore spans three dimensions (0.69 against its closest) rather
 * than leaning on Egocentricity, whose platform meaning is grievance where the
 * printed report's is agency. Team compatibility deliberately does not span: it
 * correlates 0.98 with Sociocentricity because it honestly IS sociocentricity,
 * and manufacturing independence would be inventing a construct to look tidy.
 *
 * Every tile prints its own facet names, so this is disclosed on screen rather
 * than buried here. See the spec's §3.2.
 */
export interface Read {
  key: string
  name: string
  /** Plain-language gloss, used where a tile has no facet list to show. */
  blurb: string
  /** null marks the pressure read, which is a swing magnitude, not a score. */
  facets: readonly (readonly [Dim, string])[] | null
}

export const READS: readonly Read[] = [
  {
    key: 'lead',
    name: 'Leadership potential',
    blurb: 'Taking charge, carrying other people, and finishing what was started.',
    facets: [
      ['e', 'Lead & Take Charge'],
      ['c', 'Inspiring & Influencing'],
      ['sa', 'Achievement & Results'],
    ],
  },
  {
    key: 'team',
    name: 'Team compatibility & dynamics',
    blurb: 'How readily a student works through other people rather than around them.',
    facets: [
      ['so', 'Collaboration & Teamwork'],
      ['so', 'Empathy & Understanding'],
      ['so', 'Human & Interpersonal Relationships'],
    ],
  },
  {
    key: 'resil',
    name: 'Emotional resilience',
    blurb: 'Holding steady when the work gets hard and the ground moves.',
    facets: [
      ['e', 'Persistence & Mental Toughness'],
      ['sp', 'Inner Peace & Harmony'],
      ['c', 'Adaptability & Flexibility'],
    ],
  },
  {
    key: 'work',
    name: 'Workplace readiness',
    blurb: 'Delivering to a standard, on a deadline, with the reasoning shown.',
    facets: [
      ['sa', 'Achievement & Results'],
      ['se', 'Meticulous, Precision & Accuracy'],
      ['c', 'Analytical & Strategic Thinking'],
    ],
  },
  {
    key: 'press',
    name: 'Behaviour under pressure',
    blurb: 'The widest shift a student shows when a situation stops being controlled.',
    facets: null,
  },
] as const
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 3 new tests, plus the 24 already in the suite.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/data/readiness.ts src/lib/data/readiness.test.ts
git commit -m "Name the five educator reads, and guard their facet names

A mistyped facet name resolves to undefined, averages to NaN and renders
a blank bar with no error. The name-resolution test is the only thing
that catches it, so it lands before any code that consumes READS."
```

---

### Task 2: `readinessOf` — one row per assessed student

**Files:**
- Modify: `src/lib/data/readiness.ts`
- Modify: `src/lib/data/readiness.test.ts`

**Interfaces:**
- Consumes: `READS` from Task 1. `facetsOf(studentId, waveN, dim, score)`, `dynOf(studentId, waveN, dims, sc, dim)`, `extraWaves(data)`, `waveSeries(data, student, xw)` from `layers.ts`. `recordFor(data, id, wave)`, `type Wave` from `derive.ts`. `DIMS` from `generator.ts`.
- Produces: `readinessOf(data: DemoData, wave: Wave): ReadinessRow[]` and `interface ReadinessRow { id: string; waveN: number; scores: Record<string, number>; swing: number }`. Task 3's `tally` consumes `ReadinessRow[]`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/data/readiness.test.ts`:

```ts
import { latest } from './derive.ts'
import { dynOf, extraWaves, facetsOf, waveSeries } from './layers.ts'
import { readinessOf } from './readiness.ts'
import { DIMS } from './generator.ts'

const data = buildData()

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `readinessOf is not a function`

- [ ] **Step 3: Implement `readinessOf`**

Add to `src/lib/data/readiness.ts` — extend the existing import line rather than adding a second one:

```ts
import { DIMS, type DemoData, type Dim } from './generator.ts'
import { recordFor, type Wave } from './derive.ts'
import { dynOf, extraWaves, facetsOf, waveSeries } from './layers.ts'
```

Then append:

```ts
export interface ReadinessRow {
  id: string
  /** Ordinal position in THIS student's own waveSeries — not a global wave number. */
  waveN: number
  /** Read key → 0–100 internal scale. Facet bundles only; pressure lives in `swing`. */
  scores: Record<string, number>
  /** Widest absolute pressure shift across the six dimensions. */
  swing: number
}

/**
 * Every student holding a record at `wave`, with their five reads.
 *
 * Measured at 13 ms for the full cohort, so callers compute this once per wave
 * and filter the result rather than recomputing per faculty.
 */
export function readinessOf(data: DemoData, wave: Wave): ReadinessRow[] {
  const xw = extraWaves(data)
  const rows: ReadinessRow[] = []

  for (const st of data.students) {
    const rec = recordFor(data, st.id, wave)
    if (!rec) continue

    // Matched on `sc` identity, not on the date string. waveSeries passes the
    // WaveResult's own `sc` reference straight through, so identity is exact —
    // whereas two campaigns can share a date label and silently match the wrong
    // node, handing the whole row a waveN the profile would never use.
    const series = waveSeries(data, st, xw)
    const node = series.find((n) => n.sc === rec.sc)
    const waveN = node ? node.n : series.length || 1

    // Six facets arrive together per dimension, so cache per dimension rather
    // than recomputing for each of the eight bundle members.
    const byDim = new Map<Dim, Map<string, number>>()
    const facetScore = (dim: Dim, name: string) => {
      let m = byDim.get(dim)
      if (!m) {
        m = new Map(facetsOf(st.id, waveN, dim, rec.sc[dim]).map((f) => [f.name, f.s]))
        byDim.set(dim, m)
      }
      const v = m.get(name)
      if (v === undefined) throw new Error(`Unknown facet "${name}" on dimension "${dim}"`)
      return v
    }

    const scores: Record<string, number> = {}
    for (const r of READS) {
      if (!r.facets) continue
      scores[r.key] = r.facets.reduce((a, [d, n]) => a + facetScore(d, n), 0) / r.facets.length
    }

    rows.push({
      id: st.id,
      waveN,
      scores,
      swing: Math.max(...DIMS.map((d) => Math.abs(dynOf(st.id, waveN, DIMS, rec.sc, d)))),
    })
  }

  return rows
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 6 new tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/data/readiness.ts src/lib/data/readiness.test.ts
git commit -m "Compute the five reads per student, at the profile's own waveN

waveN is a student's ordinal position in their own series, so picking a
different one here than the profile picks would make the same student
read differently on two screens — the extraWaves segment-drift bug
again. Matched on sc identity rather than date string, because two
campaigns can share a date label."
```

---

### Task 3: `tally` — band shares per tile

**Files:**
- Modify: `src/lib/data/readiness.ts`
- Modify: `src/lib/data/readiness.test.ts`

**Interfaces:**
- Consumes: `ReadinessRow[]` from Task 2. `MAG_LEGEND`, `kband`, `k7s` from `layers.ts`. `waffleCells` from `derive.ts`.
- Produces: `tally(rows: ReadinessRow[]): TileView[]`, `SWING_BANDS`, and the `TileView` / `BandShare` interfaces. Task 4's page renders `TileView[]`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/data/readiness.test.ts`:

```ts
import { tally } from './readiness.ts'

const tilesOf = (rows: ReturnType<typeof readinessOf>) =>
  Object.fromEntries(tally(rows).map((t) => [t.key, t]))

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
  // Team compatibility is the widest faculty separation on the page.
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

test('every tile carries the facet names it is built from', () => {
  const t = tilesOf(readinessOf(data, 'latest'))
  // Team compatibility correlates 0.98 with Sociocentricity. That is deliberate,
  // and printing its three facet names on the tile is how it is disclosed.
  assert.deepEqual(t.team.facetNames, [
    'Collaboration & Teamwork',
    'Empathy & Understanding',
    'Human & Interpersonal Relationships',
  ])
  assert.equal(t.press.facetNames, null)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `tally is not a function`

- [ ] **Step 3: Implement `tally`**

Extend the imports in `src/lib/data/readiness.ts`:

```ts
import { recordFor, waffleCells, type Wave } from './derive.ts'
import { dynOf, extraWaves, facetsOf, k7s, kband, MAG_LEGEND, waveSeries } from './layers.ts'
```

Then append:

```ts
/**
 * Swing magnitude bands. A ramp by size, not a verdict — the report frames
 * dynamic range as developmental, so no band is coloured as a failure.
 */
export const SWING_BANDS = [
  { name: 'STEADY', lo: 0, hi: 8, color: '#8A8F94' },
  { name: 'SHIFTS', lo: 8, hi: 13, color: '#6E96BF' },
  { name: 'WIDE', lo: 13, hi: 18, color: '#B98B3C' },
  { name: 'VOLATILE', lo: 18, hi: Infinity, color: '#A6503F' },
] as const

export const NOT_MEASURABLE = 'NOT YET MEASURABLE'

export interface BandShare {
  name: string
  color: string
  /** Largest-remainder percentage — the shares across one tile sum to exactly 100. */
  pct: number
  n: number
}

export interface TileView {
  key: string
  name: string
  blurb: string
  /** The three facets this read is built from, or null for the pressure read. */
  facetNames: string[] | null
  /** Cohort mean on the 1–7 scale, or null for pressure and for an empty cohort. */
  v7: string | null
  /** Median widest swing in points. Pressure read only. */
  median: number | null
  bands: BandShare[]
  headline: string
  n: number
}

/**
 * Five tiles from a filtered row set.
 *
 * The headline is a share rather than a band name for a measured reason:
 * averaging three facets collapses variance, so a single band can hold 62% of
 * the cohort and the five-band bar barely changes between faculties. The
 * "DEVELOPING or below" share ranges 31–88% across filter cuts and is what
 * actually carries the movement. See the spec's §3.1.
 */
export function tally(rows: ReadinessRow[]): TileView[] {
  const n = rows.length

  return READS.map((r): TileView => {
    if (r.facets) {
      const vals = rows.map((x) => x.scores[r.key])
      const counts = MAG_LEGEND.map((b) => vals.filter((v) => kband(v).t === b.t).length)
      const pct = n ? waffleCells(counts, n) : counts.map(() => 0)
      const below = counts[0] + counts[1]
      return {
        key: r.key,
        name: r.name,
        blurb: r.blurb,
        facetNames: r.facets.map(([, name]) => name),
        v7: n ? k7s(vals.reduce((a, b) => a + b, 0) / n) : null,
        median: null,
        bands: MAG_LEGEND.map((b, i) => ({ name: b.t, color: b.c, pct: pct[i], n: counts[i] })),
        headline: n ? `DEVELOPING or below for ${Math.round((below / n) * 100)}% of ${n}` : NOT_MEASURABLE,
        n,
      }
    }

    const sw = rows.map((x) => x.swing).sort((a, b) => a - b)
    const counts = SWING_BANDS.map((b) => sw.filter((v) => v >= b.lo && v < b.hi).length)
    const pct = n ? waffleCells(counts, n) : counts.map(() => 0)
    const wide = counts[2] + counts[3]
    return {
      key: r.key,
      name: r.name,
      blurb: r.blurb,
      facetNames: null,
      v7: null,
      median: n ? sw[Math.floor(n / 2)] : null,
      bands: SWING_BANDS.map((b, i) => ({ name: b.name, color: b.color, pct: pct[i], n: counts[i] })),
      headline: n ? `Shifts widely or more for ${Math.round((wide / n) * 100)}% of ${n}` : NOT_MEASURABLE,
      n,
    }
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 6 new tests. If the golden values in step 1 fail, do **not** edit the expected numbers to match the output. Stop and report: either an import is wrong or `waveN` is being picked differently from Task 2.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/data/readiness.ts src/lib/data/readiness.test.ts
git commit -m "Tally the reads into band shares, pinned to measured values

Largest-remainder rounding so a tile's bands sum to exactly 100 —
independent rounding puts the four pressure bands at 101. The headline
is a share rather than a band name because averaging three facets
collapses variance: one band holds 62% of the cohort, while the
DEVELOPING-or-below share ranges 31-88% across filter cuts."
```

---

### Task 4: The page and its nav entry

**Files:**
- Create: `src/app/(admin)/readiness/page.tsx`
- Modify: `src/components/Sidebar.tsx` (add icon near line 74, add nav item at line 88-92)

**Interfaces:**
- Consumes: `readinessOf`, `tally`, `type TileView` from Task 3. `Header`, `CohortFilters`, `useDemoData`, `type CohortFilter`, `LAYER_NOTE`.
- Produces: route `/readiness`.

- [ ] **Step 1: Create the page**

Create `src/app/(admin)/readiness/page.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { Header } from '@/components/Header'
import { CohortFilters } from '@/components/CohortFilters'
import { useDemoData } from '@/lib/data/demo.ts'
import type { CohortFilter } from '@/lib/data/derive.ts'
import { LAYER_NOTE } from '@/lib/data/layers.ts'
import { readinessOf, tally, type TileView } from '@/lib/data/readiness.ts'

/**
 * The educator half of "one framework, two views".
 *
 * Fingerprint reads the same facet evidence as six dimensions, for someone who
 * knows the model. This reads it as five outcomes, for a Dean who does not. The
 * overlap is the product's stated architecture, not an accident — the fact sheet
 * calls it "the same facet evidence, read for a different purpose".
 *
 * Briefing surface only. No roster, no drill-through: /segments is the worklist.
 */
export default function ReadinessPage() {
  const data = useDemoData()
  const [filter, setFilter] = useState<CohortFilter>({ fac: 'All', yr: 'All', wave: 'latest' })

  // The whole cohort, once per wave — 13 ms measured.
  const rows = useMemo(() => readinessOf(data, filter.wave), [data, filter.wave])

  // Faculty and intake only re-tally a precomputed array, so those two selects
  // stay instant. Same predicate as selectRecords, applied to rows rather than
  // records so there is no join back through the generator.
  const tiles = useMemo(() => {
    const keep = rows.filter((r) => {
      const st = data.byId[r.id]
      return (
        (filter.fac === 'All' || st.faculty === filter.fac) &&
        (filter.yr === 'All' || String(st.intakeYear) === filter.yr)
      )
    })
    return tally(keep)
  }, [data, rows, filter.fac, filter.yr])

  const bundles = tiles.filter((t) => t.facetNames)
  const pressure = tiles.find((t) => !t.facetNames)!
  const n = tiles[0].n

  return (
    <>
      <Header
        title="Readiness"
        sub={
          n
            ? `${n} assessed students · the facet evidence Fingerprint reads as six dimensions, read here as five outcomes.`
            : 'No assessed students match this filter.'
        }
        filters={<CohortFilters value={filter} onChange={setFilter} />}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto bg-[#FCFCFA] px-[26px] py-[22px]">
        {/*
          Keyed on the filter so the tiles crossfade when it changes. Without it
          the bars redraw in place and the only clue anything happened is a
          number moving by two points.
        */}
        <div
          key={`${filter.fac}|${filter.yr}|${filter.wave}`}
          className="chart-appear flex flex-col gap-4"
        >
          <div className="grid content-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(380px,1fr))]">
            {bundles.map((t) => (
              <Tile key={t.key} t={t} />
            ))}
          </div>
          <Tile t={pressure} />
        </div>

        <p className="max-w-[92ch] px-0.5 pb-1 text-[11.5px] leading-[1.7] text-pretty text-ink/50">
          {LAYER_NOTE}
        </p>
      </div>
    </>
  )
}

/**
 * One read: its facet provenance, a band distribution, and the share sentence.
 *
 * Near-empty bands (LOW at 1%, VERY STRONG at 0%) stay in the bar as slivers and
 * carry their percentage in the legend beneath. An in-bar label at that width
 * would collide with its neighbour.
 */
function Tile({ t }: { t: TileView }) {
  return (
    <section className="flex min-w-0 flex-col self-start rounded-[10px] border border-ink/10 bg-white p-[20px_24px]">
      <div className="flex flex-none items-baseline gap-3">
        <h2 className="text-[13px] leading-none font-bold text-ink">{t.name}</h2>
        <span className="ml-auto font-mono text-[11px] leading-none text-ink/45">
          {t.v7 ? `${t.v7} / 7` : t.median !== null ? `median ${t.median} pts` : '—'}
        </span>
      </div>

      <p className="mt-2 text-[12px] leading-[1.55] text-ink/60">
        {t.facetNames ? t.facetNames.join(' · ') : t.blurb}
      </p>

      {t.n === 0 ? (
        <p className="mt-4 font-mono text-[10.5px] leading-none font-bold tracking-[.1em] text-ink/40">
          {t.headline}
        </p>
      ) : (
        <>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-ink/5">
            {t.bands.map((b) => (
              <div key={b.name} style={{ width: `${b.pct}%`, background: b.color }} />
            ))}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {t.bands.map((b) => (
              <span
                key={b.name}
                className="flex items-center gap-1.5 font-mono text-[9px] leading-none tracking-[.08em] text-ink/50"
              >
                <span className="size-[7px] flex-none rounded-full" style={{ background: b.color }} />
                {b.name} {b.pct}%
              </span>
            ))}
          </div>

          <p className="mt-3.5 text-[12.5px] leading-[1.5] font-bold text-ink">{t.headline}</p>
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Add the sidebar icon**

In `src/components/Sidebar.tsx`, insert after `LongitudinalIcon` (ends line 54), before `CampaignsIcon`:

```tsx
const ReadinessIcon = () => (
  <svg viewBox="0 0 16 16" className={ICON} {...stroke}>
    <path d="M1.5 13.8h13" />
    <rect x="2.6" y="9.2" width="2.9" height="4.6" rx=".6" />
    <rect x="6.55" y="6" width="2.9" height="7.8" rx=".6" />
    <rect x="10.5" y="2.8" width="2.9" height="11" rx=".6" />
  </svg>
)
```

A rising bar chart, distinct from the hexagon, grid and line already in the group.

- [ ] **Step 3: Add the nav item**

In `src/components/Sidebar.tsx`, change the `INSIGHTS` array (line 88) to:

```tsx
const INSIGHTS: NavItem[] = [
  { href: '/fingerprint', label: 'Fingerprint', Icon: FingerprintIcon },
  { href: '/segments', label: 'Segments', Icon: SegmentsIcon },
  { href: '/readiness', label: 'Readiness', Icon: ReadinessIcon },
  { href: '/longitudinal', label: 'Longitudinal', Icon: LongitudinalIcon },
]
```

- [ ] **Step 4: Verify it builds and typechecks**

```bash
npm run typecheck
npm test
npm run build
```
Expected: all pass, and the build output lists `/readiness` among the static routes.

- [ ] **Step 5: Verify in the browser**

Start the dev server and note the port it actually binds — **do not assume 3000.** Another worktree's server may already hold it, and screenshotting the wrong app is a mistake already made once on this project.

```bash
npm run dev
# read the "Local: http://localhost:PORT" line from the output
```

Check, at that port's `/readiness`:
1. Five tiles render; the pressure tile spans full width beneath the four.
2. Unfiltered, Leadership reads `4.0 / 7` and `DEVELOPING or below for 63% of 369`.
3. Selecting **Health** moves Team compatibility to `42% of 85`; selecting **Engineering** moves it to `74% of 91`.
4. Selecting **2026 intake** moves Leadership to `81% of 78`.
5. Selecting **Health + 2026 intake** either shows real numbers or `NOT YET MEASURABLE` — never `NaN%` and never a blank bar.
6. The sidebar highlights Readiness, between Segments and Longitudinal.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/readiness/page.tsx" src/components/Sidebar.tsx
git commit -m "Add the Readiness screen and its nav entry

Five reads as band distributions, with the DEVELOPING-or-below share as
each tile's headline. Faculty and intake re-tally a precomputed array
rather than recomputing facets, so the header selects stay instant.

Every tile prints the three facet names it is built from — that is how
Team compatibility's 0.98 correlation with Sociocentricity is disclosed
rather than buried."
```

---

### Task 5: Reconcile the documentation

The gap analysis proposes three insight tabs that this page partly replaces. Left alone, the doc and the app contradict each other.

**Files:**
- Modify: `docs/report-gap-analysis.md` (§3.1 line ~174, §3.2 line ~180)
- Modify: `README.md` (screens table line ~50, architecture block line ~64)

- [ ] **Step 1: Replace gap analysis §3.1 and §3.2**

Replace both sections — from the `### 3.1 New: Pressure` heading through the line ending `...doesn't care about psychometrics.` — with:

```markdown
### 3.1 Pressure — ✅ shipped as a tile, not a tab

Which dimensions swing most under pressure, cohort-wide. Now the fifth tile on
`/readiness`: each student's widest absolute swing, banded STEADY / SHIFTS /
WIDE / VOLATILE. Measured 15 / 45 / 24 / 16 — the best-spread read on that page
and the only one not squashed by facet averaging.

Still not built: the *dimension-level* breakdown that would produce "Science
Year 2's Security rises 14 points under pressure". The tile answers how widely
students move, not which dimension they move toward. That remains the strongest
unbuilt insight surface, because it is the only one that predicts *when*
students struggle rather than *who* is struggling.

### 3.2 Capabilities — ✅ superseded by Readiness

Originally proposed as a heatmap of 22 capability families. Shipped instead as
`/readiness`: five educator reads over facets `layers.ts` already computes, per
`docs/superpowers/specs/2026-07-30-readiness-page-design.md`.

*"Leadership potential is DEVELOPING or below for 81% of the 2026 intake"* is
the sentence a Dean pays for, and the page produces it. This surface is
employability-facing, which makes it the one that justifies licence renewal to a
budget holder who doesn't care about psychometrics.

Two things it does **not** solve, both disclosed on-screen rather than hidden:
§1.3's facet-taxonomy problem rides along wholesale, and Team compatibility
correlates 0.98 with Sociocentricity because it honestly is sociocentricity.
```

- [ ] **Step 2: Update the README screens table**

In `README.md`, insert this row immediately after the `/segments` row:

```markdown
| `/readiness` | The educator view — five cohort reads (leadership, team, resilience, workplace, pressure) as band distributions |
```

- [ ] **Step 3: Update the README architecture block**

In `README.md`, add this line immediately after the `layers.ts` line:

```
 src/lib/data/readiness.ts   five educator reads over the facet layer — cohort-level, pure
```

- [ ] **Step 4: Verify nothing else contradicts**

```bash
grep -n "three new insight tabs\|3.2 New: Capabilities\|3.1 New: Pressure" docs/report-gap-analysis.md
```
Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add docs/report-gap-analysis.md README.md
git commit -m "Reconcile the gap analysis with what Readiness actually shipped

§3.2 proposed a Capabilities heatmap; Readiness replaces it. §3.1
proposed a Pressure tab; it ships as one tile, and the doc now says
which half is still unbuilt — the dimension-level breakdown that
answers which dimension students move toward, not just how far."
```

---

## Self-review

**Spec coverage.** §1 → Task 4's page copy. §2 D1–D5 → Tasks 1, 3, 4. §3.1's share-headline resolution → Task 3. §3.2's disclosure → Task 4's facet names on every tile. §4's locked bundles → Task 1; pressure bands → Task 3. §5's module contract and `waveN` trap → Task 2. §6's composition → Task 4. §7's four edge cases → Task 3 (empty, rounding), Task 2 (wave), Task 4 (small-n denominator in the headline string). §8's five tests → Tasks 1–3. §9 non-goals → nothing built for them. §10 → Task 5. §11's disclosures → Task 4's `LAYER_NOTE` footer and per-tile facet names.

**Type consistency.** `READS` (Task 1) → consumed by name in Tasks 2 and 3. `ReadinessRow` fields `id`/`waveN`/`scores`/`swing` (Task 2) → read identically in Task 3's `tally` and Task 4's filter. `TileView` fields `key`/`name`/`blurb`/`facetNames`/`v7`/`median`/`bands`/`headline`/`n` (Task 3) → every one used in Task 4's `Tile`. `BandShare.pct` and `.color` → the only two the bar and legend touch. Read keys `lead`/`team`/`resil`/`work`/`press` are the same five strings in Task 1's definitions, Task 2's `scores` map and Task 3's tests.

**Golden values verified.** Every pinned expectation in Task 3 was executed against a standalone script reproducing this plan's Task 2 and Task 3 code verbatim: 369 rows, all five band arrays, both headline formats, the three filtered headlines, `median 11`, band sums of exactly 100 across all five faculty cuts, and the empty-cohort case. `w1` returns 291 rows, all at `waveN === 1`. One expectation was corrected in the process — Emotional resilience displays `3.9`, not `4.0`.

**Remaining risk.** The verification script mirrors the plan's code but is not the code. If a golden value still fails, the implementation diverged from the plan; do not rewrite the expectation to match the output.
