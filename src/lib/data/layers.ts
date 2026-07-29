/**
 * The interpretive layers the printed report shows and the platform did not:
 * facets, cohort-relative magnitude bands, the under-pressure series, watch-outs,
 * post-assessment engagement, and response quality.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  EVERYTHING HERE IS DOWNSTREAM OF buildData() AND PURE.
 *
 *  `buildData()` is frozen — every published figure is a function of the
 *  mulberry32 stream seeded at 0x4B59A71D and the exact order rnd() is called
 *  in. So no new per-student data is born there. It is derived here instead,
 *  from values that already exist plus a hash of the student id, and every
 *  facet split averages back to the dimension score it came from, so nothing on
 *  any other screen shifts by a point.
 *
 *  Pure means pure: no module-scope mutation. demo.ts caches DemoData across
 *  every viewer of the deployed demo, and a write here would be a write they all
 *  share. Interaction state belongs in useState, in the component.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Dim, DemoData, Scores, Student, WaveResult } from './generator.ts'
import { latest } from './derive.ts'

/**
 * The report's 36 facet names, six per dimension, verbatim.
 *
 * The platform's item bank is 36 items — six per dimension — so there is exactly
 * one item behind each facet. That is enough to place a facet in a band and not
 * nearly enough to defend a decimal, which is why nothing here returns one.
 * See docs/report-gap-analysis.md §1.1.
 */
export const FACETS: Record<Dim, readonly string[]> = {
  sa: [
    'Achievement & Results', 'Growth Mindset & Learning', 'Logical Reasoning & Right Thinking',
    'Ethics, Morals & Integrity', 'Purposeful & Meaningful Life', 'Satisfaction & Fulfilment',
  ],
  e: [
    'Persistence & Mental Toughness', 'Lead & Take Charge', 'Power & Authority',
    'Control', 'Dominance & Assertiveness', 'Image, Status & Fame',
  ],
  so: [
    'Empathy & Understanding', 'Collaboration & Teamwork', 'Social Connections & Interactions',
    'Human & Interpersonal Relationships', 'Affiliation & Belongingness', 'Altruism & Compassion',
  ],
  se: [
    'Risk-Averse', 'Structure & Orderliness', 'Meticulous, Precision & Accuracy',
    'System Compliance', 'Stability & Certainty', 'Safety & Protection',
  ],
  c: [
    'Analytical & Strategic Thinking', 'Curiosity & Awareness', 'Nuanced Problem-Solving',
    'Adaptability & Flexibility', 'Creative & Innovative', 'Inspiring & Influencing',
  ],
  sp: [
    'Interconnectedness', 'Positive Legacy', 'Self-Transcendence',
    'Inner Peace & Harmony', 'Meaning, Existence & Afterlife', 'Faith & Higher Power',
  ],
}

/** FNV-1a. Any stable string→int would do; this one is short and has no state. */
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h >>> 0
}

/** A local stream, deliberately not the generator's — nothing here may touch that one. */
function stream(seed: string) {
  let s = hash(seed)
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bands
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Magnitude bands, cut by cohort percentile rather than by position on the scale.
 *
 * The report bands on percentage of scale maximum — STRONG is 5.60–6.29, i.e.
 * 80–89% of 7. Applied to this platform's 0–100 scores that puts 51.6% of every
 * dimension score in DEVELOPING and 7.5% at STRONG or above: the median student
 * would be told they are developing on almost everything. Absolute thresholds
 * only work if the scale is anchored to a norm, and this one is not.
 *
 * Banding on percentile fixes that and answers the report's other open question
 * at the same time — a band IS a norm reference, so "STRONG" now means "higher
 * than most of your cohort" rather than "80% of the way up a scale nobody has
 * calibrated." See docs/report-gap-analysis.md §1.1 and §1.5.
 */
export const BANDS = [
  { id: 'low', label: 'LOW', from: 0, color: '#8A8F94' },
  { id: 'developing', label: 'DEVELOPING', from: 10, color: '#6E96BF' },
  { id: 'moderate', label: 'MODERATE', from: 35, color: '#2F4A63' },
  { id: 'strong', label: 'STRONG', from: 65, color: '#5E8F80' },
  { id: 'very-strong', label: 'VERY STRONG', from: 90, color: '#1E6F63' },
] as const

export type Band = (typeof BANDS)[number]

/** The band a cohort percentile falls in. */
export function bandOf(percentile: number): Band {
  let out: Band = BANDS[0]
  for (const b of BANDS) if (percentile >= b.from) out = b
  return out
}

/** Percentile of `value` within an ascending-sorted population, 0–100. */
export function percentileOf(value: number, sorted: number[]): number {
  if (!sorted.length) return 50
  let lo = 0, hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < value) lo = mid + 1
    else hi = mid
  }
  return Math.round((lo / sorted.length) * 100)
}

/**
 * Every assessed student's latest score on each dimension, ascending — the
 * population every percentile on the profile is read against.
 */
export function cohortScores(data: DemoData, faculty?: string): Record<Dim, number[]> {
  const out = {} as Record<Dim, number[]>
  for (const t of data.T) out[t] = []
  for (const st of data.students) {
    if (faculty && st.faculty !== faculty) continue
    const r = latest(data, st.id)
    if (!r) continue
    for (const t of data.T) out[t].push(r.sc[t])
  }
  for (const t of data.T) out[t].sort((a, b) => a - b)
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Facets
// ─────────────────────────────────────────────────────────────────────────────

export interface Facet {
  name: string
  v: number
  pct: number
  band: Band
}

/**
 * Split one dimension score into its six facets.
 *
 * The offsets are built to sum to zero and then shrunk until every facet lands
 * inside [6, 96], so the six facets average back to exactly the dimension score
 * the rest of the app already publishes. Clamping instead of shrinking would
 * silently move the mean and put a different number on this screen than on
 * Fingerprint. layers.test.ts asserts the mean holds.
 */
export function facetValues(studentId: string, dim: Dim, score: number): number[] {
  const rnd = stream(studentId + ':' + dim)
  const raw = Array.from({ length: 6 }, () => rnd() + rnd() + rnd() - 1.5)
  const mean = raw.reduce((a, b) => a + b, 0) / 6
  const centred = raw.map((r) => r - mean)

  // Largest spread that keeps every facet in range, capped so the split stays plausible.
  const peak = Math.max(...centred.map(Math.abs)) || 1
  const room = Math.min(score - 6, 96 - score)
  const scale = Math.min(16, Math.max(0, room) / peak)

  const vals = centred.map((c) => score + c * scale)
  // Distribute the rounding residue so the integers still average to `score`.
  const ints = vals.map((v) => Math.floor(v))
  let residue = Math.round(score * 6 - ints.reduce((a, b) => a + b, 0))
  return vals
    .map((v, i) => ({ i, frac: v - ints[i] }))
    .sort((a, b) => b.frac - a.frac)
    .reduce((acc, o) => {
      if (residue > 0) { acc[o.i]++; residue-- }
      return acc
    }, ints.slice())
}

export function facetsFor(
  studentId: string, dim: Dim, score: number, cohort: number[],
): Facet[] {
  return facetValues(studentId, dim, score).map((v, i) => ({
    name: FACETS[dim][i],
    v,
    pct: percentileOf(v, cohort),
    band: bandOf(percentileOf(v, cohort)),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// The under-pressure series
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How far each dimension moves when a situation stops being comfortable.
 *
 * A property of the construct, not of the student: Security reaches hardest for
 * structure when things get uncertain, Spirituality is the settled thread that
 * barely registers pressure at all. Taken from the report's own account of which
 * dimensions swing and which hold.
 */
const VOLATILITY: Record<Dim, number> = { se: 0.55, sa: 0.32, c: 0.30, e: 0.26, so: 0.18, sp: 0.05 }

/**
 * The dynamic series: each dimension pulled toward the student's own centre of
 * gravity, by its own volatility.
 *
 * This is a rule, not a second random layer — a profile's strongest signals
 * compress under load while its quietest reach up, which is why the pressure
 * shape is flatter than the natural one. Deriving it means every student's
 * pressure pattern follows from their own scores instead of every student in the
 * demo re-telling one student's story.
 */
export function underPressure(sc: Scores, dims: readonly Dim[]): Scores {
  const centre = dims.reduce((a, t) => a + sc[t], 0) / dims.length
  const out = {} as Scores
  for (const t of dims) out[t] = Math.round(sc[t] + (centre - sc[t]) * VOLATILITY[t])
  return out
}

/** Dimensions ordered by how far they travel under pressure, widest first. */
export function pressureSwing(sc: Scores, dims: readonly Dim[]) {
  const dyn = underPressure(sc, dims)
  return dims
    .map((t) => ({ dim: t, from: sc[t], to: dyn[t], d: dyn[t] - sc[t] }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
}

// ─────────────────────────────────────────────────────────────────────────────
// Watch-outs
// ─────────────────────────────────────────────────────────────────────────────

export interface WatchOut {
  kind: 'spread' | 'pressure' | 'movement'
  title: string
  body: string
}

/**
 * The report calls these "blind spots" and prints one per dimension whether or
 * not there is anything to say. Two changes here.
 *
 * First, they only appear when a rule actually fires, so an empty list is a real
 * result rather than a gap to be filled with copy. Second, every one is keyed to
 * something the platform computed — a percentile spread, a pressure swing, a
 * wave delta — never to the facet split, which is derived and cannot carry a
 * claim about a person. See docs/report-gap-analysis.md §1.4.
 *
 * Named "watch-out" rather than "blind spot" for the same reason: a boxed
 * callout headed "Blind spot" reads as a diagnosis no matter what the footer
 * says, and this instrument does not diagnose.
 */
export function watchOuts(
  data: DemoData, sc: Scores, prev: Scores | null, cohort: Record<Dim, number[]>,
): WatchOut[] {
  const out: WatchOut[] = []
  const label = (t: Dim) => data.LABELS[data.T.indexOf(t)]
  const pct = (t: Dim) => percentileOf(sc[t], cohort[t])

  // A profile that is very tall in one place and very short in another asks more
  // of a student than a level one, whatever the average says.
  const ranked = data.T.slice().sort((a, b) => pct(b) - pct(a))
  const top = ranked[0], bottom = ranked[ranked.length - 1]
  if (pct(top) - pct(bottom) >= 55) {
    out.push({
      kind: 'spread',
      title: `${label(top)} sits ${pct(top) - pct(bottom)} percentile points above ${label(bottom)}`,
      body: `The widest split in this profile. A gap this size usually shows up as the ${label(top).toLowerCase()} side carrying situations that would be easier to meet with the ${label(bottom).toLowerCase()} side — worth naming in conversation rather than reading as a deficit.`,
    })
  }

  // The dimension that moves furthest under load is the one a student is least
  // likely to see coming, because by definition it is not how they normally are.
  const swing = pressureSwing(sc, data.T)[0]
  if (Math.abs(swing.d) >= 6) {
    out.push({
      kind: 'pressure',
      title: `${label(swing.dim)} moves ${swing.d > 0 ? 'up' : 'down'} ${Math.abs(swing.d)} points under pressure`,
      body: `Further than any other dimension here. Under load this profile ${swing.d > 0 ? `reaches for more ${label(swing.dim).toLowerCase()} than it normally runs on` : `has less ${label(swing.dim).toLowerCase()} available than the natural pattern suggests`} — which is the gap between how this student reads on a good week and how they read in week ten.`,
    })
  }

  // Real movement between two real assessments — the only claim here that rests
  // on measurement at two points rather than on one snapshot.
  if (prev) {
    const moved = data.T
      .map((t) => ({ t, d: sc[t] - prev[t] }))
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0]
    if (Math.abs(moved.d) >= 8) {
      out.push({
        kind: 'movement',
        title: `${label(moved.t)} ${moved.d > 0 ? 'rose' : 'fell'} ${Math.abs(moved.d)} points since the first assessment`,
        body: `Measured at two points a year apart, not inferred. Large enough to be worth asking about — what changed between the two sittings is not something the instrument can see.`,
      })
    }
  }

  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-assessment engagement
// ─────────────────────────────────────────────────────────────────────────────

/** The five DEPTH stages, in order, with the prompt each one carries. */
export const DEPTH_STAGES = [
  { key: 'describe', name: 'Describe', q: 'What is the pattern, right now?' },
  { key: 'explain', name: 'Explain', q: 'Why does it show up this way?' },
  { key: 'predict', name: 'Predict', q: 'How might this respond under pressure?' },
  { key: 'transform', name: 'Transform', q: 'What needs to grow or regulate?' },
  { key: 'harmonise', name: 'Harmonise', q: 'How does this work better with others?' },
] as const

export const PLAN_WEEKS = [
  { week: 1, verb: 'NOTICE', milestone: 'Pattern logged' },
  { week: 2, verb: 'DEFINE', milestone: '"Done" defined upfront' },
  { week: 3, verb: 'PRACTICE', milestone: 'Timed closure practised' },
  { week: 4, verb: 'SHARE', milestone: 'Reasoning shared aloud' },
] as const

export interface Engagement {
  reportOpened: boolean
  /** How many of the five DEPTH stages have been written to. Never what was written. */
  depthDone: number
  planStarted: boolean
  /** Milestones with evidence attached, 0–4. */
  evidenced: number
  lastActive: string | null
}

/**
 * Where a student got to after the assessment closed.
 *
 * A funnel that stops at "completed" measures whether the instrument was filled
 * in, not whether it did anything. This is the rest of it. The drop-off is steep
 * on purpose — most students open the report and stop, which is the honest shape
 * and the reason the screen is worth having.
 */
export function engagementFor(studentId: string, completedAt: string): Engagement {
  const rnd = stream(studentId + ':engagement')
  const opened = rnd() < 0.71
  const depthDone = !opened ? 0 : rnd() < 0.52 ? 0 : 1 + Math.floor(rnd() * 5)
  const planStarted = depthDone >= 3 && rnd() < 0.64
  const evidenced = !planStarted ? 0 : Math.floor(rnd() * 5)
  return {
    reportOpened: opened,
    depthDone,
    planStarted,
    evidenced,
    lastActive: opened ? completedAt : null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Response quality
// ─────────────────────────────────────────────────────────────────────────────

export interface ResponseQuality {
  minutes: number
  /** Longest run of identical answers. 36 items on a 5-point scale; 8+ is a flag. */
  longestRun: number
  skipped: number
  verdict: 'GOOD' | 'REVIEW'
  note: string
}

/**
 * Whether this profile is worth acting on.
 *
 * Nothing on the report answers that, which matters because a straight-lined
 * sitting produces the same confident bars as a considered one. Rushing and
 * long identical runs are the two signals a 36-item instrument can actually
 * see. See docs/report-gap-analysis.md §1.8.
 */
export function responseQualityFor(studentId: string): ResponseQuality {
  const rnd = stream(studentId + ':quality')
  const minutes = Math.round((4 + rnd() * 11) * 10) / 10
  const longestRun = 2 + Math.floor(rnd() * (rnd() < 0.12 ? 9 : 4))
  const skipped = rnd() < 0.08 ? 1 + Math.floor(rnd() * 2) : 0
  const rushed = minutes < 5
  const straight = longestRun >= 8
  const verdict = rushed || straight || skipped > 1 ? 'REVIEW' : 'GOOD'
  return {
    minutes, longestRun, skipped, verdict,
    note: straight
      ? `${longestRun} identical answers in a row — read the pattern, not the points.`
      : rushed
        ? `Completed in ${minutes} minutes. Fast enough to be worth a second look.`
        : skipped
          ? `${skipped} item${skipped > 1 ? 's' : ''} left blank; the rest is clean.`
          : 'Paced normally, no long identical runs, nothing skipped.',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cohort roll-ups
// ─────────────────────────────────────────────────────────────────────────────

export interface PostFunnel {
  completed: number
  reportOpened: number
  depthStarted: number
  planStarted: number
  evidenced: number
  reassessed: number
}

/**
 * The half of the funnel that starts where the campaign one stops.
 *
 * `reassessed` is not synthesised — `pairIds` is the set of students who really
 * do hold two completed assessments, so the last stage of this funnel is the
 * same number Longitudinal is built on.
 */
export function postFunnel(data: DemoData): PostFunnel {
  const f: PostFunnel = {
    completed: 0, reportOpened: 0, depthStarted: 0, planStarted: 0, evidenced: 0,
    reassessed: data.pairIds.length,
  }
  for (const st of data.students) {
    const r = latest(data, st.id)
    if (!r) continue
    f.completed++
    const e = engagementFor(st.id, r.at)
    if (e.reportOpened) f.reportOpened++
    if (e.depthDone > 0) f.depthStarted++
    if (e.planStarted) f.planStarted++
    if (e.evidenced > 0) f.evidenced++
  }
  return f
}

export interface QualityRollup {
  n: number
  review: number
  medianMinutes: number
}

export function qualityRollup(data: DemoData): QualityRollup {
  const mins: number[] = []
  let review = 0
  for (const st of data.students) {
    if (!latest(data, st.id)) continue
    const q = responseQualityFor(st.id)
    mins.push(q.minutes)
    if (q.verdict === 'REVIEW') review++
  }
  mins.sort((a, b) => a - b)
  return {
    n: mins.length,
    review,
    medianMinutes: mins.length ? mins[Math.floor(mins.length / 2)] : 0,
  }
}

/** Convenience for the profile screen — everything it needs for one student, in one call. */
export function profileLayers(data: DemoData, st: Student, rec: WaveResult, prev: WaveResult | null) {
  const cohort = cohortScores(data)
  const faculty = cohortScores(data, st.faculty)
  return {
    cohort,
    dims: data.T.map((t, i) => {
      const pct = percentileOf(rec.sc[t], cohort[t])
      return {
        dim: t,
        label: data.LABELS[i],
        short: data.SHORT[i],
        v: rec.sc[t],
        pct,
        facultyPct: percentileOf(rec.sc[t], faculty[t]),
        band: bandOf(pct),
        facets: facetsFor(st.id, t, rec.sc[t], cohort[t]),
      }
    }),
    pressure: underPressure(rec.sc, data.T),
    swing: pressureSwing(rec.sc, data.T),
    watchOuts: watchOuts(data, rec.sc, prev?.sc ?? null, cohort),
    engagement: engagementFor(st.id, rec.at),
    quality: responseQualityFor(st.id),
  }
}
