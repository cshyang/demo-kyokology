import { tint, token } from '../color.ts'

/**
 * KYKOLOGY 6D — seeded demo data generator.
 *
 * PORTED VERBATIM from the Claude Design prototype (`Kykology 6D Admin.dc.html`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  DO NOT REFACTOR THE BODY OF buildData().
 *
 *  Every published figure in this demo — the seven segment counts
 *  (44/25/28/17/21/139/95 = 369), the archetype churn percentage, the funnel
 *  quotas — is a function of the mulberry32 stream seeded at 0x4B59A71D *and
 *  the exact order in which rnd() is called*. Extracting a helper, reordering a
 *  loop, or hoisting a call out of a branch will silently change every number
 *  on the hero screen while the code still looks correct.
 *
 *  generator.test.ts asserts the counts exactly. If it fails after an edit, the
 *  edit is wrong — not the expectations.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const DIMS = ['sa', 'e', 'so', 'se', 'c', 'sp'] as const
export type Dim = (typeof DIMS)[number]
export type Scores = Record<Dim, number>

export type SendStatus = 'sent' | 'opened' | 'started' | 'completed' | 'bounced'
export type SegmentId =
  | 'silent'
  | 'driven'
  | 'explorer'
  | 'fragile'
  | 'adrift'
  | 'steady'
  | 'unflagged'

export interface Student {
  id: string
  name: string
  email: string
  faculty: string
  intakeYear: number
  base: Scores
  u: number
  sA?: SendStatus
  sB?: SendStatus
  sC?: SendStatus
}

export interface WaveResult {
  sc: Scores
  arch: string
  seg: SegmentId
  at: string
}

export interface Segment {
  id: SegmentId
  name: string
  color: string
  tint: string
  test: (sc: Scores, st: Student) => boolean
}

export interface Campaign {
  id: 'A' | 'B' | 'C'
  name: string
  key: 'sA' | 'sB' | 'sC'
  audience: string
  list: Student[]
  sentLabel: string
  base: [number, number, number]
  span: number
  status: 'COMPLETE' | 'IN FLIGHT'
}

export function buildData() {
  const T = DIMS
  const LABELS = ['Self-Actualisation', 'Egocentricity', 'Sociocentricity', 'Security', 'Complexity', 'Spirituality']
  const SHORT = ['SELF-ACT', 'EGO', 'SOCIO', 'SECURITY', 'COMPLEXITY', 'SPIRIT']
  const FACULTIES = [
    { name: 'Engineering', mean: [62, 48, 44, 68, 58, 42] },
    { name: 'Arts', mean: [56, 54, 56, 44, 68, 62] },
    { name: 'Business', mean: [66, 52, 54, 60, 54, 44] },
    { name: 'Health', mean: [54, 60, 70, 58, 50, 58] },
  ]
  const YEARS = [2024, 2025, 2026]
  /*
   * The two leading dimensions, named as career motivations rather than as a
   * personality type.
   *
   * "The Strategist" was a verdict on a person, and it sat as the 30px H1 of
   * their profile. These name what the work has to offer instead — one word per
   * dimension, used consistently, so a pair reads as its two drivers rather than
   * as a label to live up to: sa Mastery · e Leadership · so Service ·
   * se Structure · c Discovery · sp Meaning.
   *
   * All fifteen must stay distinct. Archetype churn counts labels that changed
   * between waves, so collapsing two pairs onto one string would silently drop
   * the published churn figure.
   */
  const ARCH: Record<string, string> = {
    '0,1': 'Mastery & Leadership', '0,2': 'Mastery & Service', '0,3': 'Mastery & Structure',
    '0,4': 'Mastery & Discovery', '0,5': 'Mastery & Meaning', '1,2': 'Leadership & Service',
    '1,3': 'Leadership & Structure', '1,4': 'Leadership & Discovery', '1,5': 'Leadership & Meaning',
    '2,3': 'Service & Structure', '2,4': 'Service & Discovery', '2,5': 'Service & Meaning',
    '3,4': 'Structure & Discovery', '3,5': 'Structure & Meaning', '4,5': 'Discovery & Meaning',
  }
  /*
   * Verb phrases, deliberately. Each says what a student is drawn toward, never
   * how they behave — "want work that rewards deep skill", not "designs the
   * system before touching it". They render after "they", so they start
   * lowercase and stay subject-less.
   */
  const ARCHNOTE: Record<string, string> = {
    'Mastery & Leadership': 'want work that rewards deep skill and gives them people to lead.',
    'Mastery & Service': 'want to get good at something that visibly helps people.',
    'Mastery & Structure': 'are drawn to craft, high standards, and work that holds up.',
    'Mastery & Discovery': 'want room to learn hard things and follow the questions out.',
    'Mastery & Meaning': 'want growth that adds up to something worth having done.',
    'Leadership & Service': 'want responsibility for people, not only for outcomes.',
    'Leadership & Structure': 'are drawn to running things that have to work reliably.',
    'Leadership & Discovery': 'want to build something new and be accountable for it.',
    'Leadership & Meaning': 'want influence in service of a cause they can name.',
    'Service & Structure': 'want to look after people through dependable systems.',
    'Service & Discovery': 'are drawn to human problems that need a new approach.',
    'Service & Meaning': 'want work whose value to other people is the whole point.',
    'Structure & Discovery': 'want difficult problems and the time to get them right.',
    'Structure & Meaning': 'are drawn to stewardship of what matters, done carefully.',
    'Discovery & Meaning': 'want open questions that matter beyond the immediate.',
  }

  // mulberry32 — the seed and the call order below are load-bearing.
  let s = 0x4b59a71d
  const rnd = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const gauss = () => {
    let u = 0, v = 0
    while (!u) u = rnd()
    while (!v) v = rnd()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  const ri = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1))
  const cl = (v: number) => Math.max(3, Math.min(97, Math.round(v)))
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const fmtDate = (d: Date) => d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear()

  const students: Student[] = []
  let n = 0
  for (const f of FACULTIES)
    for (const y of YEARS)
      for (let i = 0; i < 70; i++) {
        n++
        const sc = {} as Scores
        T.forEach((t, k) => (sc[t] = cl(f.mean[k] + gauss() * 13)))
        const u2 = rnd()
        let cluster = 'base'
        if (y === 2026 && u2 < 0.26) cluster = 'fragile'
        else {
          const q = rnd()
          if (q < 0.2) cluster = 'silent'
          else if (q < 0.29) cluster = 'driven'
          else if (q < 0.405) cluster = 'explorer'
          else if (q < 0.49) cluster = 'adrift'
          else if (q < 0.93) cluster = 'steady'
        }
        if (cluster === 'silent') { sc.so = ri(16, 33); sc.se = ri(68, 90) }
        if (cluster === 'driven') { sc.sa = ri(82, 96); sc.e = ri(20, 38) }
        if (cluster === 'explorer') { sc.c = ri(82, 97); sc.se = ri(12, 33) }
        if (cluster === 'fragile') { sc.se = ri(16, 33); sc.c = ri(20, 38) }
        if (cluster === 'adrift') { sc.sp = ri(8, 28); sc.sa = ri(25, 44) }
        if (cluster === 'steady') { T.forEach((t) => (sc[t] = ri(37, 68))) }
        const pad = String(n).padStart(4, '0')
        students.push({
          id: 'S' + pad,
          name: 'Student ' + pad,
          email: 'student' + pad + '@kykology.edu',
          faculty: f.name,
          intakeYear: y,
          base: sc,
          u: rnd(),
        })
      }

  const rank = (sc: Scores) => T.map((t, i) => i).sort((a, b) => sc[T[b]] - sc[T[a]] || a - b)
  const arch = (sc: Scores, prev: string | null): string => {
    const r = rank(sc)
    if (prev && sc[T[r[1]]] - sc[T[r[2]]] < 8) return prev
    const p = [r[0], r[1]].sort((a, b) => a - b)
    return ARCH[p[0] + ',' + p[1]]
  }

  const SEGS: Segment[] = [
    { id: 'silent', name: 'Silent Contributors', color: token('teal'), tint: tint('teal', 10), test: (sc) => sc.so < 35 && sc.se > 65 },
    { id: 'driven', name: 'Driven, Under-Regulated', color: token('rust'), tint: tint('rust', 10), test: (sc) => sc.sa > 80 && sc.e < 40 },
    { id: 'explorer', name: 'Under-stretched Explorers', color: token('gold'), tint: tint('gold', 12), test: (sc) => sc.c > 80 && sc.se < 35 },
    { id: 'fragile', name: 'Transition Fragile', color: token('sky'), tint: tint('sky', 13), test: (sc, st) => sc.se < 35 && sc.c < 40 && st.intakeYear === 2026 },
    { id: 'adrift', name: 'Purpose Adrift', color: token('slate'), tint: tint('slate', 10), test: (sc) => sc.sp < 30 && sc.sa < 45 },
    { id: 'steady', name: 'Steady Core', color: token('sage'), tint: tint('sage', 11), test: (sc) => T.every((t) => sc[t] >= 35 && sc[t] <= 70) },
    { id: 'unflagged', name: 'Unflagged', color: token('stone'), tint: tint('ink', 4), test: () => true },
  ]
  const segOf = (sc: Scores, st: Student): SegmentId => SEGS.find((g) => g.test(sc, st))!.id

  const quota = (list: Student[], q: [SendStatus, number][], key: 'sA' | 'sC') => {
    const o = list.slice().sort((a, b) => a.u - b.u)
    let i = 0
    for (const [k, c] of q) { for (let j = 0; j < c; j++, i++) o[i][key] = k }
  }
  const AB = students.filter((x) => x.intakeYear !== 2026)
  const C = students.filter((x) => x.intakeYear === 2026)
  quota(AB, [['bounced', 11], ['completed', 291], ['started', 50], ['opened', 95], ['sent', 113]], 'sA')
  quota(C, [['bounced', 6], ['completed', 78], ['started', 36], ['opened', 64], ['sent', 96]], 'sC')

  const w1: Record<string, WaveResult> = {}
  const w2: Record<string, WaveResult> = {}
  const w3: Record<string, WaveResult> = {}
  for (const st of AB) {
    st.sB = st.sA
    if (st.sA !== 'completed') continue
    const seg1 = segOf(st.base, st)
    w1[st.id] = { sc: st.base, arch: arch(st.base, null), seg: seg1, at: fmtDate(new Date(2025, 9, 6 + ri(0, 20))) }
    const boost = ({ silent: 'so', driven: 'e', explorer: 'se', fragile: 'se', adrift: 'sp' } as Record<string, Dim>)[seg1]
    const d = {} as Scores
    T.forEach((t) => (d[t] = cl(st.base[t] + gauss() * 3.4 + 1 + (boost === t ? 7 : 0))))
    w2[st.id] = { sc: d, arch: arch(d, w1[st.id].arch), seg: segOf(d, st), at: fmtDate(new Date(2026, 9, 5 + ri(0, 20))) }
  }
  for (const st of C) {
    if (st.sC === 'completed')
      w3[st.id] = { sc: st.base, arch: arch(st.base, null), seg: segOf(st.base, st), at: fmtDate(new Date(2026, 9, 19 + ri(0, 3))) }
  }

  const campaigns: Campaign[] = [
    { id: 'A', name: '6D Profile · Autumn 2025 baseline', key: 'sA', audience: '2024 + 2025 intakes', list: AB, sentLabel: '6 Oct 2025', base: [2025, 9, 6], span: 20, status: 'COMPLETE' },
    { id: 'B', name: '6D Profile · Autumn 2026 retest', key: 'sB', audience: 'Same 560 students', list: AB, sentLabel: '5 Oct 2026', base: [2026, 9, 5], span: 20, status: 'COMPLETE' },
    { id: 'C', name: '6D Profile · 2026 intake onboarding', key: 'sC', audience: '2026 intake', list: C, sentLabel: '19 Oct 2026', base: [2026, 9, 19], span: 3, status: 'IN FLIGHT' },
  ]

  const byId: Record<string, Student> = {}
  students.forEach((st) => (byId[st.id] = st))
  const pairIds = Object.keys(w1).filter((id) => w2[id])
  const uni = {} as Scores
  T.forEach((t) => {
    let sum = 0, c = 0
    for (const st of students) { const r = w2[st.id] || w3[st.id]; if (!r) continue; sum += r.sc[t]; c++ }
    uni[t] = Math.round(sum / c)
  })
  let ch = 0
  pairIds.forEach((id) => { if (w2[id].arch !== w1[id].arch) ch++ })

  return {
    T, LABELS, SHORT, FACULTIES, SEGS, segOf, students, byId, pairIds,
    w1, w2, w3, campaigns, uni, ARCH, ARCHNOTE, fmtDate,
    churnPct: +((ch / pairIds.length) * 100).toFixed(1),
  }
}

export type DemoData = ReturnType<typeof buildData>

/** Segment counts over each student's most recent completed result (w2 ?? w3). */
export function segmentCounts(data: DemoData): Record<SegmentId, number> {
  const counts = {} as Record<SegmentId, number>
  for (const seg of data.SEGS) counts[seg.id] = 0
  for (const st of data.students) {
    const r = data.w2[st.id] || data.w3[st.id]
    if (!r) continue
    counts[r.seg]++
  }
  return counts
}
