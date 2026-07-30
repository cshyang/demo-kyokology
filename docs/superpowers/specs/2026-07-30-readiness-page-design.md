# Readiness — the Educator / Cohort view

**Date:** 2026-07-30
**Status:** Approved, not yet built.
**Supersedes:** §3.2 of `docs/report-gap-analysis.md` (the proposed *Capabilities* tab). See §10.

---

## 1. What this is

The KYKOLOGY Campus product fact sheet promises **one framework, two views**:

| The Student Report | The Educator / Cohort Dashboard |
|---|---|
| Natural strengths | Emotional resilience |
| Learning preferences & style | Team compatibility & dynamics |
| Communication style | Workplace readiness |
| Career motivations | Leadership potential |
| Growth opportunities & development pathways | Behaviour under pressure & adaptability to change |

The platform ships the left column (`/t`, `/students/profile`). It ships nothing for the right
column. **Readiness is the right column.**

The fact sheet's own words for why the two views share a spine: *"the same facet evidence, read
for a different purpose: self-understanding for the student, cohort support for the educator."*
That sentence is the design constraint. Readiness invents no new measurement. It re-reads facets
that `layers.ts` already computes.

### Who opens it

A Dean or head of careers services. **Briefing only** — the page's output is a sentence they can
repeat to a budget holder:

> *"Leadership potential is DEVELOPING or below for 81% of the 2026 intake."*

It is not a worklist. `/segments` is the worklist.

### Why it is a page and not a panel on Fingerprint

| Route | Question it answers | Unit |
|---|---|---|
| `/fingerprint` | What shape is this cohort? | cohort, in **model** vocabulary (6 dimensions) |
| `/readiness` | What is it ready for? | cohort, in **educator** vocabulary (5 outcomes) |
| `/segments` | Who do I chase this week? | **individual** students, with a roster |

Fingerprint and Readiness deliberately read the same underlying evidence. That is not duplication
to be designed away — it is the product's stated architecture. They differ in audience and
vocabulary, and each read needs a band distribution the radar has no room for.

---

## 2. Decisions taken

Recorded so a future reader knows which choices were made deliberately and which are open.

| # | Decision | Chosen | Rejected alternatives |
|---|---|---|---|
| D1 | Job of the page | Briefing only | Drill-through to names; attached institutional programmes |
| D2 | Tile anatomy | Band distribution bar; faculty split comes from the existing header filter | Faculty-comparison rows inside each tile; both stacked |
| D3 | Fifth read | Swing magnitude from `dynOf`, same tile shape | A facet bundle (would duplicate Emotional resilience); four tiles + a full-width pressure strip |
| D4 | Nav label | **Readiness** | Cohort Lens; Educator View |
| D5 | Bundle composition | **Mixed** — span dimensions where the tile name allows, stay faithful where it does not | Faithful everywhere; independence enforced everywhere |

D1 is the load-bearing one. Every "wouldn't it be good if" that follows — drill-through, attached
programmes, per-student export — is out of scope because the page was scoped as evidence, not as a
worklist. Re-entry condition: a real educator asks "so who are they?" more than once.

---

## 3. What the measurements found

All figures measured against `buildData()` at seed `0x4B59A71D`, 369 assessed students, before any
UI was written.

### 3.1 Composites squash. This is inherent and is not a bug.

Averaging three facets collapses variance. The first candidate Leadership bundle put **72% of the
cohort in DEVELOPING alone**, leaving three of five bands as slivers.

Every aggregation was priced. None fixes it:

| Aggregation | Largest single band |
|---|---|
| Mean of 3 | 62–72% |
| Weakest of 3 | 56–64% |
| Strongest of 3 | 44–56%, but reads implausibly high |
| One facet per dimension (spanning) | 55–75% — no better |

**Resolution:** keep the honest mean, and make the tile's headline the **share at DEVELOPING or
below** rather than five equal-weight band chips. That share ranges 31–88% across filter cuts, so
it carries the movement the five-band bar cannot.

### 3.2 A bundle drawn from one dimension is that dimension renamed

`facetsOf` derives facets *from* the dimension score and re-centres them on it. So facet-level
bundling does **not** dissolve the Egocentricity agency/grievance ambiguity recorded at
`report-gap-analysis.md:76` — it only renames it.

| Candidate bundle | Correlation with its closest dimension |
|---|---|
| Team compatibility `(so, so, so)` | **0.98** with Sociocentricity |
| Leadership `(e, e, c)` | **0.79** with Egocentricity |
| Leadership `(e, c, sa)` — chosen | 0.69 with Complexity |
| Emotional resilience `(e, sp, c)` | 0.60 |
| Workplace readiness `(sa, se, c)` | 0.59 |

Under D5, Leadership spans — leadership genuinely is not only Ego, and spanning drops the
correlation to 0.69 and lifts the mean from 3.58 to 4.01. Team compatibility stays at 0.98 because
it honestly *is* sociocentricity; manufacturing independence there would be inventing a construct
to look statistically tidy. **This is disclosed on-screen**, not buried: every tile prints the
three facet names it is built from, so a reader can see for themselves that Team compatibility is
three Sociocentricity facets.

### 3.3 The tiles do move under filtering

The test that matters for a briefing page. Share at DEVELOPING or below:

| Group | n | Leadership | Team | Resilience | Workplace | Pressure ≥13 |
|---|---|---|---|---|---|---|
| **All** | 369 | 63% | 58% | 63% | 38% | 40% |
| Engineering | 91 | 68% | **74%** | 75% | 40% | 36% |
| Arts | 94 | 62% | 57% | **52%** | 35% | 47% |
| Business | 99 | 60% | 57% | 65% | **31%** | 37% |
| Health | 85 | 64% | **42%** | 62% | 48% | 41% |
| Intake 2024 | 152 | 60% | 56% | 64% | 35% | 36% |
| Intake 2025 | 139 | **57%** | 59% | 56% | 31% | 42% |
| Intake 2026 | 78 | **81%** | 59% | **76%** | **58%** | 45% |

Team compatibility swings 32 points across faculties. The 2026 intake is worst on four of five
reads. Both are real properties of the seeded data, not staged.

### 3.4 Cost

13 ms to compute facets and pressure for all 369 assessed students. Memoise on `data` and `wave`;
filter changes only re-tally a precomputed array.

---

## 4. The five reads — locked definitions

```
Leadership potential      Lead & Take Charge                    (Egocentricity)
                          Inspiring & Influencing               (Complexity)
                          Achievement & Results                 (Self-Actualisation)

Team compatibility        Collaboration & Teamwork              (Sociocentricity)
& dynamics                Empathy & Understanding               (Sociocentricity)
                          Human & Interpersonal Relationships   (Sociocentricity)

Emotional resilience      Persistence & Mental Toughness        (Egocentricity)
                          Inner Peace & Harmony                 (Spirituality)
                          Adaptability & Flexibility            (Complexity)

Workplace readiness       Achievement & Results                 (Self-Actualisation)
                          Meticulous, Precision & Accuracy      (Security)
                          Analytical & Strategic Thinking       (Complexity)

Behaviour under pressure  max |dynOf(d)| across all six dimensions — not a facet bundle
```

A student's score on reads 1–4 is the **arithmetic mean of its three facet scores** on the 0–100
internal scale, displayed via the existing `k7` transform and banded by the existing `kband` cuts.
No new scale, no new band vocabulary.

`Achievement & Results` deliberately appears in two bundles. Measured cost: Leadership × Workplace
correlate at 0.56. Highest cross-tile correlation overall is 0.59 (Leadership × Resilience, which
share an Egocentricity and a Complexity facet). No tile is a restatement of another.

### Pressure bands

| Band | Widest absolute swing | Share |
|---|---|---|
| STEADY | < 8 | 15% |
| SHIFTS | 8–12 | 45% |
| WIDE | 13–17 | 24% |
| VOLATILE | ≥ 18 | 16% |

The best-spread read on the page, and the only one not subject to §3.1.

Raw counts are 55 / 165 / 91 / 58 of 369. Note WIDE: independent rounding gives 25%, but the
largest-remainder rule in §7 displays **24%** so the four bands sum to exactly 100. The pinned
golden values are the largest-remainder ones — what the legend actually prints. This is also why
§3.3's `Pressure ≥13` column reads 40% rather than 41%.

---

## 5. Architecture

```
generator.ts   buildData()  ── FROZEN, untouched ──┐
                                                   │
layers.ts      facetsOf() ─┐                       │
               dynOf()  ───┤                       │
                           ▼                       ▼
readiness.ts   READS[]  ─────► readinessOf(data, wave) ──► ReadinessRow[]
               (bundle defs)          │                         │
                                      │          memo on (data, wave) — 13 ms, once
                                      ▼                         ▼
page.tsx       CohortFilters ──► selectRecords ──► tally(rows) ──► five tiles
                                                       ~0 ms per filter change
```

### New file: `src/lib/data/readiness.ts`

Pure, no React, no side effects, downstream of everything.

```ts
export interface Read {
  key: string
  name: string          // "Leadership potential"
  blurb: string         // what it means, in a Dean's vocabulary
  facets: [Dim, string][] | null   // null for the pressure read
}

export interface ReadinessRow {
  id: string
  waveN: number         // ordinal in THIS student's own waveSeries
  scores: Record<string, number>   // 0-100, one per facet-bundle read
  swing: number         // widest |dynOf| across six dimensions
}

export function readinessOf(data: DemoData, wave: Wave): ReadinessRow[]
export function tally(rows: ReadinessRow[]): TileView[]
```

The maths lives here rather than in the page component for one specific reason: the facet bug
shipped in the previous round — `facetsOf` seeded on dimension *key* instead of *index* — passed
every structural test written for it (right count, right order, right mean, right bands) and was
caught only by diffing the browser against the design. A pure module can have golden values
pinned. A component cannot.

Not added to `layers.ts`, which is already ~560 lines carrying five separate concerns.

### The `waveN` trap

`waveN` is a student's **ordinal position in their own `waveSeries`**, not a global wave number.
A student assessed in Oct 2025, Apr 2026 and Oct 2026 has their latest record at `waveN = 3`.

If Readiness computes facets at a different `waveN` than the profile displays, the same student's
Leadership number differs on two screens for no visible reason. This is the bug class that
produced the `extraWaves` segment drift — 37 of 152 check-in records carrying a segment their own
scores contradicted. It gets a test (§7.4), not a comment.

---

## 6. Page composition

Route `/readiness`. One line added to `INSIGHTS` in `src/components/Sidebar.tsx:88`, between
Segments and Longitudinal.

```
Readiness                                    [Faculty ▾][Intake ▾][Wave ▾]
369 assessed students · the same facet evidence Fingerprint reads as six
dimensions, read here as five outcomes.

┌─ LEADERSHIP POTENTIAL ──────────── 4.0 ─┐  ┌─ TEAM COMPATIBILITY ────── 3.9 ─┐
│ Lead & Take Charge · Inspiring &        │  │ Collaboration & Teamwork ·      │
│ Influencing · Achievement & Results     │  │ Empathy & Understanding · …     │
│                                         │  │                                 │
│ ████▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░          │  │ ███▓▓▓▓▓▓▓▓░░░░░░░░░▒▒          │
│ LOW 1%  DEV 62%  MOD 36%  STR 1%        │  │ LOW 8%  DEV 49%  MOD 37%  STR 5%│
│                                         │  │                                 │
│ DEVELOPING or below for 63% of 369      │  │ DEVELOPING or below for 58%     │
└─────────────────────────────────────────┘  └─────────────────────────────────┘
      … Emotional resilience …                     … Workplace readiness …

┌─ BEHAVIOUR UNDER PRESSURE ──────────────────────── median 11 points ─┐
│ Widest shift when a situation stops being controlled                 │
│ █████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░▒▒▒▒▒▒                                │
│ STEADY 15%   SHIFTS 45%   WIDE 24%   VOLATILE 16%                    │
└──────────────────────────────────────────────────────────────────────┘

Footer: how each read is built · the §1.3 facet-taxonomy disclosure
```

Visual language follows the rebuilt student profile: serif section headings over a hairline rule,
`k7` scores to one decimal, existing band colours from `BAND_COLOR`.

**Near-empty bands** (LOW at 1%, VERY STRONG at 0%) render as slivers in the bar with their
percentage in the legend row beneath — never as an in-bar label, which would collide at that width.

---

## 7. Edge cases

| Case | Treatment |
|---|---|
| Filter matches nobody | Salvage `migration()`'s existing `NOT YET MEASURABLE` copy and empty state. Never `NaN%`, never a zero-width bar. Health + intake 2026 is the realistic trigger. |
| Small n | The denominator line always states the count, so `100%` on n=3 reads as n=3. Same honesty fix already applied to the Segments denominator. |
| Wave filter | `readinessOf(data, wave)` memoises per wave. `waveN` is the ordinal of *that wave's* node in the student's own series. |
| Band percentages | Reuse `waffleCells`' largest-remainder rounding so the bar fills exactly 100%, not 99 or 101. |
| Student assessed once | Fine — `waveSeries` returns one node, `waveN = 1`. |

---

## 8. Testing

`src/lib/data/readiness.test.ts`, run by the existing `node --test 'src/**/*.test.ts'`.

1. **The generator is undisturbed.** `segmentCounts(buildData())` is identical after `readinessOf`
   runs. Mirrors the guard already protecting `layers.ts`; it is the whole safety argument for
   adding a layer.
2. **Every bundle facet name resolves.** Each `[dim, name]` pair in `READS` exists in
   `FACETS[dim]`. A typo currently yields `undefined → NaN` and renders a blank bar with no error.
   Cheapest high-value test here.
3. **Golden values pinned.** The five unfiltered distributions in §3.3 row 1, plus the pressure
   band shares in §4.
4. **`waveN` agreement.** For a sample of students, the Leadership facet score used by
   `readinessOf` equals the one `profileLayers` displays for the same student. Guards §5's trap.
5. **Shares sum to 100** after largest-remainder rounding, and an empty filter produces no `NaN`.

---

## 9. Non-goals

Explicitly not built, each with a re-entry condition:

| Not building | Re-entry condition |
|---|---|
| Drill-through from a band to the students in it | An educator asks "so who are they?" more than once |
| Attached institutional programmes with owners | The page graduates from briefing to worklist (reverses D1) |
| Per-tile faculty comparison rows | The header filter proves too slow to use in a live demo |
| CSV export | Someone asks to take the numbers into a board deck |
| A separate Pressure tab (gap analysis §3.1) | The single pressure tile creates demand for the dimension-level breakdown |
| Contribution supply/demand (gap analysis §3.3) | Unchanged — still blocked on §1.2 |

---

## 10. Reconciliation with the gap analysis

`docs/report-gap-analysis.md` §3 proposes three new insight tabs: **3.1 Pressure**, **3.2
Capabilities**, **3.3 Contribution**. The five educator reads cut across 3.1 and 3.2, and "team
compatibility" belongs to neither.

**Resolution:** Readiness replaces §3.2 outright and absorbs §3.1 as a single tile. §3.3 is
untouched and still blocked on §1.2. `report-gap-analysis.md` §3 must be updated when this ships,
so the doc and the app stop contradicting each other.

---

## 11. Disclosed, not solved

Carried forward onto this page from the profile:

- **§1.3 — the facet taxonomy problem.** The 36 facet names are the printed report's taxonomy laid
  over an item bank measuring different constructs. Readiness inherits this wholesale: a bundle of
  three facet names is three names from that taxonomy. The disclosure that ships on the profile's
  facet panel ships in this page's footer too. It needs a KYKOLOGY decision, not a code change.
- **§3.2 above — Team compatibility is Sociocentricity at 0.98.** Deliberate, and visible on the
  tile, which prints its three constituent facet names.
- **Absolute bands.** The 1–7 cuts are the design's, matched exactly per the earlier decision.
  They place roughly half the cohort in DEVELOPING by construction. That is a property of the
  instrument's calibration against this synthetic cohort, and it is why the tile headline is a
  share rather than a band name.

---

## 12. D1 reversed — 30 July 2026

The re-entry condition fired: *"an educator asks 'so who are they?' more than once"* → drill-through
from a band to the students in it. D1 stays on the record above, unedited, because its reasoning is
what makes reversing it legitimate rather than scope drift.

**What shipped is not what §9 predicted, and the difference was measured.** The prediction was
band → roster. Counting the 5×5 matrix first showed why that alone would fail: averaging three
facets collapses variance, so of twenty bundle bands unfiltered, leadership VERY STRONG holds
nobody and resilience STRONG holds one. Under an Engineering filter, seven of twenty hold 0 or 1.
A presenter clicking a legend chip mid-demo would land on an empty roster.

So the **tile heading** is the primary target — the whole read, ranked weakest first, which is also
the closer match to the question that prompted this. Bands stay as a secondary cut and render
unclickable at zero rather than clicking to nothing. Swing is the one read whose bands are evenly
populated (55 / 165 / 91 / 58), because it is a magnitude rather than a three-facet mean, and it
inverts the default order: widest first.

One cut function, `bandOf`, now serves both the bar and the roster, with a test asserting every
band count is reproducible by filtering rows through it. A band drawn 17 wide that lists 19
students underneath would only surface mid-demo.

Still not building, unchanged: attached institutional programmes with owners; per-tile faculty
comparison rows; a separate Pressure tab; contribution supply/demand.
