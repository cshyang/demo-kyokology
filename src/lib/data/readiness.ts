import { token } from '../color.ts'
import { DIMS, type DemoData, type Dim } from './generator.ts'
import { recordFor, waffleCells, type Wave } from './derive.ts'
import { dynOf, extraWaves, facetsOf, k7s, kband, MAG_LEGEND, waveSeries } from './layers.ts'

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
  /** Column header in the roster, where the full name will not fit. */
  short: string
  /** Plain-language gloss, used where a tile has no facet list to show. */
  blurb: string
  /** null marks the pressure read, which is a swing magnitude, not a score. */
  facets: readonly (readonly [Dim, string])[] | null
}

export const READS: readonly Read[] = [
  {
    key: 'lead',
    name: 'Leadership potential',
    short: 'LEADERSHIP',
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
    short: 'TEAM',
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
    short: 'RESILIENCE',
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
    short: 'WORKPLACE',
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
    short: 'SWING',
    blurb: 'The widest shift a student shows when a situation stops being controlled.',
    facets: null,
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Per-student rows
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Cohort tiles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Swing magnitude bands. A ramp by size, not a verdict — the report frames
 * dynamic range as developmental, so no band is coloured as a failure.
 */
export const SWING_BANDS = [
  { name: 'STEADY', lo: 0, hi: 8, color: token('stone') },
  { name: 'SHIFTS', lo: 8, hi: 13, color: token('sky') },
  { name: 'WIDE', lo: 13, hi: 18, color: token('gold') },
  { name: 'VOLATILE', lo: 18, hi: Infinity, color: token('rust') },
] as const

export const NOT_MEASURABLE = 'NOT YET MEASURABLE'

/**
 * Which band one student falls in for one read.
 *
 * The single cut. `tally` counts through it and the roster filters through it,
 * so a band holding 17 students in the bar cannot list 19 underneath — the
 * failure this codebase is otherwise built to prevent.
 */
export function bandOf(row: ReadinessRow, key: string): string {
  if (key === 'press') return SWING_BANDS.find((b) => row.swing >= b.lo && row.swing < b.hi)!.name
  return kband(row.scores[key]).t
}

/** The colour that band is drawn in, so a roster cell matches the bar above it. */
export function bandColorOf(row: ReadinessRow, key: string): string {
  const name = bandOf(row, key)
  return key === 'press'
    ? SWING_BANDS.find((b) => b.name === name)!.color
    : MAG_LEGEND.find((b) => b.t === name)!.c
}

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
      const counts = MAG_LEGEND.map((b) => rows.filter((x) => bandOf(x, r.key) === b.t).length)
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
        headline: n
          ? `DEVELOPING or below for ${Math.round((below / n) * 100)}% of ${n}`
          : NOT_MEASURABLE,
        n,
      }
    }

    const sw = rows.map((x) => x.swing).sort((a, b) => a - b)
    const counts = SWING_BANDS.map((b) => rows.filter((x) => bandOf(x, r.key) === b.name).length)
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
      headline: n
        ? `Shifts widely or more for ${Math.round((wide / n) * 100)}% of ${n}`
        : NOT_MEASURABLE,
      n,
    }
  })
}
