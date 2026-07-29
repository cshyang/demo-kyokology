import type { Campaign, DemoData, Dim, SegmentId, Student } from './generator.ts'

/**
 * Funnel counts for one campaign.
 *
 * A student's status is their FURTHEST point, not a cumulative flag: `sent`
 * means "delivered, never opened". So each stage is the remainder after
 * subtracting everyone who stalled at the previous one.
 */
export interface Funnel {
  bounced: number
  sent: number
  opened: number
  started: number
  completed: number
}

export function campaignFunnel(c: Campaign): Funnel {
  const t: Record<string, number> = {}
  for (const st of c.list) {
    const v = st[c.key]
    if (v) t[v] = (t[v] ?? 0) + 1
  }
  const bounced = t.bounced ?? 0
  const sent = c.list.length - bounced
  const opened = sent - (t.sent ?? 0)
  const started = opened - (t.opened ?? 0)
  return { bounced, sent, opened, started, completed: t.completed ?? 0 }
}

export function latest(data: DemoData, id: string) {
  return data.w2[id] ?? data.w3[id] ?? null
}

export function segmentTally(data: DemoData): Record<SegmentId, number> {
  const n = {} as Record<SegmentId, number>
  for (const s of data.SEGS) n[s.id] = 0
  for (const st of data.students) {
    const r = latest(data, st.id)
    if (r) n[r.seg]++
  }
  return n
}

/** Mean of each dimension over whichever record `pick` returns, skipping students without one. */
export function dimMeans(data: DemoData, pick: (st: Student) => { sc: Record<Dim, number> } | null | undefined) {
  return data.T.map((t) => {
    let a = 0, n = 0
    for (const st of data.students) {
      const r = pick(st)
      if (!r) continue
      a += r.sc[t]
      n++
    }
    return n ? a / n : 0
  })
}

export interface Mover {
  name: string
  d: number
  txt: string
  color: string
}

/** Per-faculty, per-dimension mean change between first assessment and re-assessment. */
export function movers(data: DemoData): Mover[] {
  const out: Mover[] = []
  for (const f of data.FACULTIES) {
    const ids = data.pairIds.filter((id) => data.byId[id].faculty === f.name)
    data.T.forEach((t, i) => {
      const d = ids.length
        ? ids.reduce((s, id) => s + (data.w2[id].sc[t] - data.w1[id].sc[t]), 0) / ids.length
        : 0
      out.push({
        name: `${f.name} · ${data.LABELS[i]}`,
        d,
        txt: (d > 0 ? '+' : '') + d.toFixed(1),
        color: d >= 0 ? '#5E8F80' : '#A6503F',
      })
    })
  }
  return out.sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
}

/** A signed bar drawn from the centre of its track. */
export interface CentredBar {
  txt: string
  color: string
  /** Bar width as a percentage of the track. */
  w: number
  /** Left offset as a percentage — 50 for a rise, 50-w for a fall. */
  l: number
}

function centredBar(d: number, span: number): CentredBar {
  const mag = Math.min(Math.abs(d) / 8, 1) * span
  return {
    txt: (d > 0 ? '+' : '') + d.toFixed(1),
    color: d >= 0 ? '#5E8F80' : '#A6503F',
    w: +mag.toFixed(1),
    l: d >= 0 ? 50 : +(50 - mag).toFixed(1),
  }
}

/** Per-faculty mean change on each dimension, first assessment → re-assessment. */
export function facultyDeltas(data: DemoData) {
  return data.FACULTIES.map((f) => {
    const ids = data.pairIds.filter((id) => data.byId[id].faculty === f.name)
    return {
      name: f.name,
      bars: data.T.map((t) => {
        const d = ids.length
          ? ids.reduce((s, id) => s + (data.w2[id].sc[t] - data.w1[id].sc[t]), 0) / ids.length
          : 0
        return centredBar(d, 44)
      }),
    }
  })
}

export function topMovers(data: DemoData, n = 4) {
  return movers(data).slice(0, n).map((m) => ({ name: m.name, ...centredBar(m.d, 48) }))
}

export interface Migration {
  id: SegmentId
  name: string
  color: string
  n: number
  out: number
  stay: number
  empty: boolean
  line: string
  stayW: number
  outW: number
  note: string
}

/**
 * Where each Wave-1 segment's members ended up at Wave 2. Only students with
 * both assessments (pairIds) can migrate, so that is the population.
 */
export function migration(data: DemoData): Migration[] {
  const w1seg: Record<string, SegmentId> = {}
  const w2seg: Record<string, SegmentId> = {}
  for (const id of data.pairIds) {
    w1seg[id] = data.segOf(data.w1[id].sc, data.byId[id])
    w2seg[id] = data.segOf(data.w2[id].sc, data.byId[id])
  }
  return data.SEGS.filter((g) => g.id !== 'unflagged').map((g) => {
    const ids = data.pairIds.filter((id) => w1seg[id] === g.id)
    const out = ids.filter((id) => w2seg[id] !== g.id).length
    const stay = ids.length - out
    const dest: Partial<Record<SegmentId, number>> = {}
    for (const id of ids) {
      const d = w2seg[id]
      if (d !== g.id) dest[d] = (dest[d] ?? 0) + 1
    }
    const top = (Object.keys(dest) as SegmentId[]).sort((a, b) => dest[b]! - dest[a]!)[0]
    return {
      id: g.id, name: g.name, color: g.color, n: ids.length, out, stay,
      // An empty bucket here is structural, not a null result: Transition Fragile
      // is scoped to the 2026 intake, and the twice-assessed population is the
      // 2024/2025 intakes. Rendering "0 → 0 STAYED · 0 MOVED" reads as a bug.
      empty: ids.length === 0,
      line: ids.length === 0 ? 'NOT YET MEASURABLE' : `${ids.length} → ${stay} STAYED · ${out} MOVED`,
      stayW: ids.length ? Math.round((stay / ids.length) * 100) : 0,
      outW: ids.length ? Math.round((out / ids.length) * 100) : 0,
      note:
        ids.length === 0
          ? 'Nobody in the twice-assessed group matched this pattern at baseline — it is scoped to the 2026 intake, who have only been assessed once so far.'
          : top
            ? `Most of the movers landed in ${data.SEGS.find((s) => s.id === top)!.name} (${dest[top]}).`
            : 'Everyone who started here stayed here.',
    }
  })
}

/** The proof-it-worked line: Silent Contributors who left the pattern, and why. */
export function migrationHeadline(data: DemoData) {
  const silent = migration(data).find((m) => m.id === 'silent')!
  const ids = data.pairIds.filter((id) => data.segOf(data.w1[id].sc, data.byId[id]) === 'silent')
  const rise = ids.length
    ? (ids.reduce((a, id) => a + (data.w2[id].sc.so - data.w1[id].sc.so), 0) / ids.length).toFixed(1)
    : '0'
  return {
    n: silent.n,
    out: silent.out,
    seg: 'Silent Contributors',
    tail: `Sociocentricity in that group rose ${rise} points on average after the team-role intervention.`,
  }
}

export interface Checkpoint {
  yr: string
  assessed: number
  invited: number
  flagged: number
  se: number
  current?: boolean
}

/**
 * Five October checkpoints. 2022–2024 are fixed history — the demo asserts the
 * university ran the instrument before this deployment; 2025 and 2026 are
 * computed from the generated waves.
 */
export function checkpoints(data: DemoData): Checkpoint[] {
  const tally = segmentTally(data)
  const assessed = Object.values(tally).reduce((a, b) => a + b, 0)
  const flagged = assessed - tally.steady - tally.unflagged

  let w1seSum = 0, w1seN = 0
  for (const st of data.students) {
    const r = data.w1[st.id]
    if (r) { w1seSum += r.sc.se; w1seN++ }
  }
  const flag25 = data.students.filter((st) => {
    const r = data.w1[st.id]
    return r ? !['steady', 'unflagged'].includes(data.segOf(r.sc, st)) : false
  }).length

  const latestMeans = dimMeans(data, (st) => data.w2[st.id] ?? data.w3[st.id])

  return [
    { yr: '2022', assessed: 156, invited: 210, flagged: 52, se: 57.6 },
    { yr: '2023', assessed: 214, invited: 320, flagged: 74, se: 57.0 },
    { yr: '2024', assessed: 259, invited: 430, flagged: 92, se: 56.2 },
    { yr: '2025', assessed: 291, invited: 560, flagged: flag25, se: w1seN ? w1seSum / w1seN : 0 },
    { yr: '2026', assessed, invited: 840, flagged, se: latestMeans[data.T.indexOf('se')], current: true },
  ]
}

/**
 * 10×10 waffle, one square per percent, using largest-remainder rounding so the
 * squares total exactly 100 rather than 97 or 103.
 */
export function waffleCells(values: number[], total: number): number[] {
  const exact = values.map((v) => (v / total) * 100)
  const cells = exact.map((v) => Math.floor(v))
  let rem = 100 - cells.reduce((a, b) => a + b, 0)
  exact
    .map((v, i) => ({ i, f: v - Math.floor(v) }))
    .sort((a, b) => b.f - a.f)
    .forEach((o) => { if (rem > 0) { cells[o.i]++; rem-- } })
  return cells
}

export function wafflePath(startIndex: number, count: number, cols = 10, cell = 12, gap = 3): string {
  const step = cell + gap
  let d = ''
  for (let j = 0, ci = startIndex; j < count; j++, ci++) {
    const x = (ci % cols) * step
    const y = Math.floor(ci / cols) * step
    d += `M${x} ${y}h${cell}v${cell}h-${cell}z`
  }
  return d
}
