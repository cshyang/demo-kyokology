import { DIMS, type DemoData, type Dim } from './generator.ts'
import { recordFor, type Wave } from './derive.ts'
import { dynOf, extraWaves, facetsOf, waveSeries } from './layers.ts'

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
