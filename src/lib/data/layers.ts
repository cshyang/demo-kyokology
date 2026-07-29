/**
 * The interpretive layers the printed report has and the generator does not:
 * facets, magnitude bands on the 1–7 scale, the dynamic range under pressure,
 * the Apr 2026 check-in wave, plus post-assessment engagement and response
 * quality.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  PORTED FROM THE DESIGN PROJECT (`Kykology 6D Admin.dc.html`).
 *
 *  The scale, the band cuts, the facet loadings, the dynamic-range weights and
 *  the blind-spot threshold are all the design's, verbatim. They are not
 *  defaults to be tuned — they are what the printed report a student holds in
 *  their hand already says, so a number that disagrees here is wrong twice.
 *
 *  EVERYTHING HERE IS DOWNSTREAM OF buildData() AND PURE. No new per-student
 *  data is born in the generator: facets and dynamic values are drawn from a
 *  hash of the student id, never from the mulberry32 stream seeded at
 *  0x4B59A71D, so no measured segment count can shift. Pure means pure — no
 *  module-scope mutation, because demo.ts caches DemoData across every viewer
 *  of the deployed demo.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { DIMS, type Campaign, type DemoData, type Dim, type Scores, type Student, type WaveResult } from './generator.ts'
import { latest } from './derive.ts'

/** The report's 36 facet names, six per dimension, in T order. */
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

/**
 * Fixed per-facet loading, summing to zero within each dimension, so the same
 * facets consistently lead for every student rather than the ordering shuffling
 * per person. Without this a facet list is noise with names on it.
 */
const FACETB: Record<Dim, readonly number[]> = {
  sa: [5, 3, 1, 0, -4, -5],
  e: [6, 2, -1, -2, -2, -3],
  so: [5, 1, 0, 0, -2, -4],
  se: [3, 2, 0, -1, -1, -3],
  c: [5, 4, 1, -2, -3, -5],
  sp: [2, 1, 0, 0, -1, -2],
}

export const DIMDESC: Record<Dim, string> = {
  sa: 'Drive toward growth, achievement and personal meaning.',
  e: 'Self-focused drive for influence, authority and control.',
  so: 'Orientation toward others: empathy, connection and belonging.',
  se: 'Need for stability, order, precision and predictability.',
  c: 'Engagement with ideas, change and analytical depth.',
  sp: 'Connection to meaning beyond the self.',
}

// ─────────────────────────────────────────────────────────────────────────────
// The 1–7 scale and its bands
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 0–100 → 1–7 for display only; the stored score stays 0–100 everywhere else.
 *
 * It is `s * 0.07`, NOT `1 + s/100*6`. The published band cuts are proportions
 * of the scale maximum — 2.44/7 is 35%, 5.59/7 is 80% — so only the plain
 * multiple puts a boundary where the report prints it. The affine version looks
 * more correct and silently moves every band edge.
 */
export const k7 = (s: number) => s * 0.07
export const k7s = (s: number) => (s * 0.07).toFixed(1)
/** Signed delta on the 1–7 scale, with a true minus sign rather than a hyphen. */
export const k7d = (d: number) => (d > 0 ? '+' : d < 0 ? '−' : '') + (Math.abs(d) * 0.07).toFixed(1)

export type BandName = 'LOW' | 'DEVELOPING' | 'MODERATE' | 'STRONG' | 'VERY STRONG'

const BAND_COLOR: Record<BandName, string> = {
  LOW: '#8A8F94',
  DEVELOPING: '#6E96BF',
  MODERATE: '#B98B3C',
  STRONG: '#1E6F63',
  'VERY STRONG': '#14283C',
}

/** The five magnitude bands, as printed. Facet-level vocabulary. */
export function kband(s: number): { t: BandName; c: string } {
  const v = k7(s)
  const t: BandName =
    v < 2.45 ? 'LOW' : v < 4.2 ? 'DEVELOPING' : v < 5.6 ? 'MODERATE' : v < 6.3 ? 'STRONG' : 'VERY STRONG'
  return { t, c: BAND_COLOR[t] }
}

/**
 * Dimension-level chip. Coarser than the facet bands and cut on the same ruler —
 * HIGH at the MODERATE→STRONG edge, MEDIUM at DEVELOPING→MODERATE.
 */
export function kmag(s: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  const v = k7(s)
  return v >= 5.6 ? 'HIGH' : v >= 4.2 ? 'MEDIUM' : 'LOW'
}
export function kmagC(s: number): string {
  const m = kmag(s)
  return m === 'HIGH' ? '#1E6F63' : m === 'MEDIUM' ? '#B98B3C' : '#6E96BF'
}

export const MAG_LEGEND: { t: BandName; r: string; c: string }[] = [
  { t: 'LOW', r: '1.00–2.44', c: BAND_COLOR.LOW },
  { t: 'DEVELOPING', r: '2.45–4.19', c: BAND_COLOR.DEVELOPING },
  { t: 'MODERATE', r: '4.20–5.59', c: BAND_COLOR.MODERATE },
  { t: 'STRONG', r: '5.60–6.29', c: BAND_COLOR.STRONG },
  { t: 'VERY STRONG', r: '6.30–7.00', c: BAND_COLOR['VERY STRONG'] },
]

export const LAYER_NOTE =
  'A lower magnitude is not automatically a weakness and a higher one is not automatically better — suitability depends on context, balance and timing. Healthy, Shadow and Dynamic are separate interpretive layers and are never averaged into one score.'

// ─────────────────────────────────────────────────────────────────────────────
// Hash-seeded randomness
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gaussian draws keyed on a string rather than on a position in a stream.
 *
 * This is the whole reason facets and dynamic ranges cannot disturb anything:
 * there is no shared cursor to advance, so adding a layer here can never shift
 * a draw inside buildData() and re-roll a published segment count.
 */
function hrand(str: string): () => number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h = (h + 0x6d2b79f5) | 0
    let t = h
    t = Math.imul(t ^ (t >>> 15), 1 | t)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hgauss(str: string): () => number {
  const r = hrand(str)
  return () => {
    let u = 0, v = 0
    while (!u) u = r()
    while (!v) v = r()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The Apr 2026 check-in
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A mid-year check-in for the 2024 intake, so at least one cohort on the demo
 * shows three points rather than two — a trend line needs three to be a line.
 *
 * Scoped to students who already hold both October waves, and it is never the
 * latest record for anyone, so `latest()` still returns the Oct 2026 retest and
 * every segment count, migration figure and checkpoint stays exactly where it
 * was. Its own seed, drawn nowhere near the generator's stream.
 */
export function extraWaves(data: DemoData): Record<string, WaveResult> {
  let sd = 0x7c1a93f5
  const rnd = () => {
    sd |= 0
    sd = (sd + 0x6d2b79f5) | 0
    let t = Math.imul(sd ^ (sd >>> 15), 1 | sd)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const g = () => {
    let u = 0, v = 0
    while (!u) u = rnd()
    while (!v) v = rnd()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  const out: Record<string, WaveResult> = {}
  for (const st of data.students) {
    if (!(data.w1[st.id] && data.w2[st.id])) continue
    if (st.intakeYear !== 2024) continue
    const prev = data.w2[st.id]
    const sc = {} as Scores
    for (const t of data.T) sc[t] = Math.max(0, Math.min(100, Math.round(prev.sc[t] + g() * 3.6 + 1)))
    const ord = data.T.map((t, i) => ({ i, v: sc[t] })).sort((x, y) => y.v - x.v)
    const key = [ord[0].i, ord[1].i].sort((x, y) => x - y).join(',')
    const sticky = ord[1].v - ord[2].v >= 8
    // Recomputed from the check-in's own scores, never inherited. A ±3.6 nudge
    // is enough to cross `se < 35` or `c < 40`, so carrying October's label
    // forward puts a segment on the card that the scores beside it contradict.
    out[st.id] = {
      sc,
      arch: sticky ? data.ARCH[key] ?? prev.arch : prev.arch,
      seg: data.segOf(sc, st),
      at: '14 Apr 2026',
    }
  }
  return out
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const waveOrd = (at: string) => {
  const p = String(at).split(' ')
  return (Number(p[2]) || 2025) * 12 + MONTHS.indexOf(p[1])
}

export interface WaveNode {
  n: number
  total: number
  date: string
  campaign: string
  sc: Scores
  arch: string
  segId: string
}

/** Every assessment a student holds, oldest first, whichever campaign produced it. */
export function waveSeries(data: DemoData, st: Student, xw: Record<string, WaveResult>): WaveNode[] {
  const raw: [WaveResult | undefined, string][] = [
    [data.w1[st.id], 'Oct 2025 baseline'],
    [data.w2[st.id], 'Oct 2026 retest'],
    [xw[st.id], 'Apr 2026 check-in'],
    [data.w3[st.id], 'Oct 2026 mid-flight'],
  ]
  return raw
    .filter((r): r is [WaveResult, string] => !!r[0])
    .sort((x, y) => waveOrd(x[0].at) - waveOrd(y[0].at))
    .map(([r, campaign], k, arr) => ({
      n: k + 1,
      total: arr.length,
      date: r.at,
      campaign,
      sc: r.sc,
      arch: r.arch,
      segId: data.segOf(r.sc, st),
    }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Facets
// ─────────────────────────────────────────────────────────────────────────────

export interface Facet {
  name: string
  s: number
  band: BandName
  bandC: string
  v7: string
}

/**
 * Six facets for one dimension, strongest first.
 *
 * Offsets are centred, then clamped and re-centred four times, so the facets
 * average back to the dimension score the rest of the app already publishes
 * instead of quietly drifting off it. Clamping without re-centring is what makes
 * a low dimension's facets average high.
 */
export function facetsOf(studentId: string, waveN: number, dim: Dim, score: number): Facet[] {
  // Seeded on the dimension's INDEX, not its key. The seed string is part of the
  // design's output, not an implementation detail: `…|f|3|0` and `…|f|3|sa` are
  // different hashes, so using the key silently produces a different — and
  // wrong — set of facet values for every student.
  const g = hgauss(`${studentId}|f|${waveN}|${DIMS.indexOf(dim)}`)
  let off = FACETB[dim].map((b) => b * 1.9 + g() * 7)
  const m0 = off.reduce((a, b) => a + b, 0) / 6
  off = off.map((x) => x - m0)

  let vals = off.map((x) => score + x)
  for (let k = 0; k < 4; k++) {
    vals = vals.map((v) => Math.max(3, Math.min(97, v)))
    const dd = score - vals.reduce((a, b) => a + b, 0) / 6
    vals = vals.map((v) => v + dd)
  }
  vals = vals.map((v) => Math.max(3, Math.min(97, Math.round(v))))

  return FACETS[dim]
    .map((name, k) => {
      const b = kband(vals[k])
      return { name, s: vals[k], band: b.t, bandC: b.c, v7: k7s(vals[k]) }
    })
    .sort((a, b) => b.s - a.s)
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic range under pressure
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Signed movement per dimension when a situation stops being controlled.
 *
 * Not symmetric noise. A student's two leading dimensions give ground (−6),
 * anything already low reaches up, and Security reaches hardest (+15 against +5
 * elsewhere) because structure is what people grab for when the ground moves.
 * Spirituality is damped to a third — the report's most stable thread.
 */
export function dynOf(studentId: string, waveN: number, dims: readonly Dim[], sc: Scores, dim: Dim): number {
  const i = dims.indexOf(dim)
  const score = sc[dim]
  const g = hgauss(`${studentId}|d|${waveN}|${i}`)
  const ord = dims.map((t, k) => k).sort((a, b) => sc[dims[b]] - sc[dims[a]] || a - b)
  const lead2 = [ord[0], ord[1]]

  let d = g() * 5.5
  if (lead2.indexOf(i) >= 0) d -= 6
  if (score < 42) d += dim === 'se' ? 15 : 5
  if (dim === 'sp') d *= 0.35
  return Math.max(-24, Math.min(24, Math.round(d)))
}

// ─────────────────────────────────────────────────────────────────────────────
// Percentiles — used by the calibration line
// ─────────────────────────────────────────────────────────────────────────────

/** Every assessed student's latest score on each dimension, ascending. */
export function cohortScores(data: DemoData): Record<Dim, number[]> {
  const out = {} as Record<Dim, number[]>
  for (const t of data.T) out[t] = []
  for (const st of data.students) {
    const r = latest(data, st.id)
    if (!r) continue
    for (const t of data.T) out[t].push(r.sc[t])
  }
  for (const t of data.T) out[t].sort((a, b) => a - b)
  return out
}

export function percentileOf(value: number, sorted: number[]): number {
  if (!sorted.length) return 50
  let lo = 0
  while (lo < sorted.length && sorted[lo] < value) lo++
  return Math.round((lo / sorted.length) * 100)
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-assessment engagement — not in the report, and the reason the profile is
// worth reopening
// ─────────────────────────────────────────────────────────────────────────────

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
  evidenced: number
  lastActive: string | null
}

/**
 * Where a student got to after the assessment closed. The drop-off is steep on
 * purpose: most open the report and stop, which is the honest shape and the
 * reason the funnel is worth showing at all.
 */
export function engagementFor(studentId: string, completedAt: string): Engagement {
  // A real uniform, not a gaussian squashed into [0,1] — every threshold below
  // is a share of the cohort, and against a bell centred on 0.5 `< 0.71` stops
  // meaning "71% of them".
  const u = hrand(studentId + '|engagement')
  const opened = u() < 0.71
  const depthDone = !opened ? 0 : u() < 0.52 ? 0 : 1 + Math.floor(u() * 5)
  const planStarted = depthDone >= 3 && u() < 0.64
  const evidenced = !planStarted ? 0 : Math.floor(u() * 5)
  return { reportOpened: opened, depthDone, planStarted, evidenced, lastActive: opened ? completedAt : null }
}

export interface ResponseQuality {
  minutes: number
  longestRun: number
  skipped: number
  verdict: 'GOOD' | 'REVIEW'
  note: string
}

/**
 * Whether this profile is worth acting on — the question nothing on the printed
 * report answers. A straight-lined sitting draws the same confident bars as a
 * considered one.
 */
export function responseQualityFor(studentId: string): ResponseQuality {
  const u = hrand(studentId + '|quality')
  const minutes = Math.round((4 + u() * 11) * 10) / 10
  const longestRun = 2 + Math.floor(u() * (u() < 0.12 ? 9 : 4))
  const skipped = u() < 0.08 ? 1 + Math.floor(u() * 2) : 0
  const rushed = minutes < 5
  const straight = longestRun >= 8
  return {
    minutes, longestRun, skipped,
    verdict: rushed || straight || skipped > 1 ? 'REVIEW' : 'GOOD',
    note: straight
      ? `${longestRun} identical answers in a row — read the pattern, not the points.`
      : rushed
        ? `Completed in ${minutes} minutes. Fast enough to be worth a second look.`
        : skipped
          ? `${skipped} item${skipped > 1 ? 's' : ''} left blank; the rest is clean.`
          : 'Paced normally, no long identical runs, nothing skipped.',
  }
}

export interface PostFunnel {
  completed: number
  reportOpened: number
  depthStarted: number
  planStarted: number
  evidenced: number
  reassessed: number
}

/** The half of the funnel that starts where the campaign one stops. */
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
  return { n: mins.length, review, medianMinutes: mins.length ? mins[Math.floor(mins.length / 2)] : 0 }
}

// ─────────────────────────────────────────────────────────────────────────────
// The whole profile, assembled
// ─────────────────────────────────────────────────────────────────────────────

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

const SEG_ACTION: Record<string, string | null> = {
  silent: 'structured role assignment in group work',
  driven: 'an early check-in and workload pacing',
  explorer: 'elective breadth or a research placement',
  fragile: 'an orientation follow-up in week 4',
  adrift: 'a values and careers conversation',
  steady: null,
  unflagged: null,
}

export interface TraitView {
  dim: Dim
  label: string
  v: number
  v7: string
  uni: number
  mag: 'HIGH' | 'MEDIUM' | 'LOW'
  magC: string
  delta: string
  deltaC: string
  hasDelta: boolean
  dynPct: number
  dynC: string
  dynLabel: string
}

export function profileLayers(
  data: DemoData,
  st: Student,
  series: WaveNode[],
  selIdx: number,
  sdim: number,
  campaigns: Campaign[],
) {
  const { T, LABELS, uni, ARCHNOTE } = data
  const n = series.length
  const cur = series[selIdx]
  const prevW = selIdx > 0 ? series[selIdx - 1] : null
  const first = series[0]
  const seg = data.SEGS.find((g) => g.id === cur.segId)!

  const dyns = T.map((t) => dynOf(st.id, cur.n, T, cur.sc, t))

  const traits: TraitView[] = T.map((t, i) => {
    const v = cur.sc[t]
    const dv = prevW ? v - prevW.sc[t] : null
    const dy = dyns[i]
    return {
      dim: t,
      label: LABELS[i],
      v,
      v7: k7s(v),
      uni: uni[t],
      mag: kmag(v),
      magC: kmagC(v),
      delta: dv === null ? '' : k7d(dv),
      deltaC: dv === null ? 'transparent' : dv > 0 ? '#1E6F63' : dv < 0 ? '#A6503F' : 'rgba(20,40,60,.4)',
      hasDelta: dv !== null,
      dynPct: Math.max(3, Math.min(97, v + dy)),
      dynC: dy > 0 ? '#B98B3C' : dy < 0 ? '#6E96BF' : 'rgba(20,40,60,.28)',
      dynLabel:
        Math.abs(dy) < 3
          ? 'HOLDS STEADY'
          : `${dy > 0 ? '↑ +' : '↓ −'}${(Math.abs(dy) * 0.07).toFixed(1)} PRESSURE`,
    }
  })

  const sd = Math.min(5, Math.max(0, sdim))
  const sdimT = T[sd]
  const fl = facetsOf(st.id, cur.n, sdimT, cur.sc[sdimT])
  const fTop = fl[0], fBot = fl[5]
  const gap7 = (fTop.s - fBot.s) * 0.07

  const fdim = {
    label: LABELS[sd],
    desc: DIMDESC[sdimT],
    v7: k7s(cur.sc[sdimT]),
    mag: kmag(cur.sc[sdimT]),
    magC: kmagC(cur.sc[sdimT]),
    spread: `SPREAD ${k7s(fBot.s)}–${k7s(fTop.s)}`,
    facets: fl,
    /**
     * Derived from the widest gap inside the dimension, which is the report's
     * own stated mechanic. Below 1.15 points the spread is not wide enough to
     * carry a claim, and the evenness is itself the finding.
     */
    blindSpot:
      gap7 >= 1.15
        ? `${fTop.name} sits ${gap7.toFixed(1)} points above ${fBot.name} — the widest spread inside this dimension. It means the dimension runs on ${fTop.name} far more than on ${fBot.name}, which stays quiet even when the dimension is engaged.`
        : `No facet here swings far from the others (${k7s(fBot.s)}–${k7s(fTop.s)}). This is not a dimension defined by one standout strength — it is an even orientation, which is a finding in itself rather than a missing one.`,
  }

  // Narrative
  const swing = T.map((t, i) => ({ label: LABELS[i], d: dyns[i] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
  const rangeLine =
    Math.abs(swing[0].d) < 3
      ? 'Nothing in this profile moves far under pressure — the natural pattern and the dynamic range sit almost on top of each other.'
      : `${swing[0].label} swings widest of the six, ${swing[0].d > 0 ? 'rising' : 'easing back'} ${(Math.abs(swing[0].d) * 0.07).toFixed(1)} points under pressure or in a less controlled situation. ${swing[5].label} barely moves at all — the most stable thread in the profile.`

  let moversLine: string
  if (n === 1) {
    moversLine = 'One assessment so far, so no movement read yet — the next assessment turns these values into a direction.'
  } else {
    const mv = T.map((t, i) => ({ label: LABELS[i], d: cur.sc[t] - prevW!.sc[t] }))
      .filter((m) => Math.abs(m.d) >= 4)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
      .slice(0, 3)
    moversLine = mv.length
      ? `Since ${prevW!.date}, ${mv.map((m) => `${m.label} ${m.d > 0 ? 'rose' : 'fell'} ${(Math.abs(m.d) * 0.07).toFixed(1)} points`).join(', ')}. Everything else moved within the ±0.2 noise band.`
      : `Nothing moved more than the ±0.2 noise band since ${prevW!.date} — a genuinely stable profile.`
  }

  const cohort = cohortScores(data)
  const assessedN = cohort[T[0]].length
  const notable = T.map((t, i) => ({ label: LABELS[i], v: cur.sc[t], p: percentileOf(cur.sc[t], cohort[t]) }))
    .filter((x) => x.p <= 15 || x.p >= 85)
    .sort((a, b) => Math.min(a.p, 100 - a.p) - Math.min(b.p, 100 - b.p))
    .slice(0, 3)
  const calibLine = notable.length
    ? `${notable.map((x) => `${x.label} (${k7s(x.v)}) sits in the ${x.p >= 85 ? `top ${100 - x.p}` : `bottom ${x.p === 0 ? 1 : x.p}`}% of ${assessedN} assessed students`).join('; ')}. The rest sit in the middle of the pack.`
    : `None of the six dimensions is extreme against the ${assessedN} assessed students — a middle-of-the-pack profile on every axis.`

  const segAction = SEG_ACTION[seg.id] ?? null
  const lead =
    `${st.name} is a ${st.intakeYear}-intake ${st.faculty} student, assessed ` +
    // The design reads "once, in <date>"; "on" is the correct preposition for a
    // single day, and it is the only word here that is not the design's.
    (n === 1 ? `once, on ${cur.date}` : `${n} times between ${first.date} and ${series[n - 1].date}`) +
    `. Their profile reads as ${cur.arch} — ${lowerFirst(ARCHNOTE[cur.arch] ?? '')} ` +
    (seg.id === 'steady'
      ? 'All six dimensions sit in the healthy middle band: nothing here calls for action.'
      : segAction
        ? `They currently match ${seg.name}, which the university attaches to ${segAction}.`
        : 'No flagged pattern matched, which is the ordinary result and the reason the flagged ones are worth reading.')

  const archMove = !prevW
    ? ''
    : prevW.arch !== cur.arch
      ? `Moved from ${prevW.arch} at assessment ${prevW.n}. Labels only change when the second dimension leads the third by 8 points or more.`
      : `Unchanged since assessment ${prevW.n}.`

  const nextLine =
    seg.id === 'steady' || seg.id === 'unflagged'
      ? 'No intervention is called for. The Oct 2026 retest keeps the trend line honest.'
      : `${st.name} currently matches ${seg.name}. The attached action is ${segAction} — the platform flags, staff decide.`

  return {
    cur, prevW, first, seg, traits, fdim, rangeLine, moversLine, calibLine, nextLine, lead, archMove,
    assessedN,
    consentLine: `Shared with your institution · ${cur.date}`,
    consentNote: n === 1 ? 'One consent on record.' : `${n} consents on record, one per assessment.`,
    consentRows: series.map((w) => ({
      date: w.date,
      scope: 'Results shared with Kykology University · student sees their own profile',
    })),
    comms: campaigns
      .filter((c) => c.list.indexOf(st) >= 0)
      .map((c) => ({ name: c.name, sent: c.sentLabel, status: (st[c.key] ?? 'sent') as string })),
    engagement: engagementFor(st.id, cur.date),
    quality: responseQualityFor(st.id),
  }
}
