/**
 * Runs a validated `QuerySpec` against the cohort in the browser.
 *
 * Every figure the assistant appears to know is produced here, by the same
 * functions the pages render from — so an answer cannot disagree with the screen
 * it is sitting next to. The model's only contribution is the predicate.
 *
 * `rule` is not decoration. Because the model can still map an intent to the
 * wrong-but-valid filter, the resolved rule is the presenter's only chance to
 * catch it mid-demo, so it is written in the same uppercase vocabulary the
 * Segments page already uses for `SEGMENT_META.rule`.
 */
import { latest } from './derive.ts'
import { SEGMENT_META } from './demo.ts'
import type { DemoData, SendStatus, Student } from './generator.ts'
import { k7s, kband } from './layers.ts'
import { READS, readinessOf } from './readiness.ts'
import { MAX_ROWS_SHOWN, RANK_KEYS, type Column, type QuerySpec, type RankKey } from './query-schema.ts'

export interface QueryRow {
  id: string
  /** Aligned to `QueryResult.columns`. */
  cells: string[]
}

export interface QueryResult {
  /** The filter as applied, for display beside the result. */
  rule: string
  columns: Column[]
  headers: string[]
  rows: QueryRow[]
  /** Everyone who matched, which may exceed `rows.length`. */
  total: number
}

const HEADERS: Record<Column, string> = {
  name: 'NAME',
  faculty: 'FACULTY',
  segment: 'SEGMENT',
  action: 'RECOMMENDED STEP',
  score: 'SCORE',
  inviteStatus: 'INVITE',
}

/**
 * Derived from `READS` rather than restated, so renaming a bundle on the
 * Readiness page renames it here too. The one mismatch is deliberate: the
 * fifth read is keyed `press` there because it carries no facet bundle, while
 * the rank key is `swing` because that is the number being sorted on.
 */
const READ_NAMES = Object.fromEntries(
  RANK_KEYS.map((k) => [k, READS.find((r) => r.key === (k === 'swing' ? 'press' : k))!.name]),
) as Record<RankKey, string>

/**
 * Furthest-along outcome across the three campaigns.
 *
 * Ordered so `bounced` loses to any real engagement: a student whose first
 * invite bounced but who opened the second has been reached, and calling them
 * bounced would send someone chasing an address that works.
 */
const STATUS_ORDER: SendStatus[] = ['bounced', 'sent', 'opened', 'started', 'completed']

function inviteStatusOf(st: Student): string {
  let best = -1
  for (const s of [st.sA, st.sB, st.sC]) {
    if (!s) continue
    best = Math.max(best, STATUS_ORDER.indexOf(s))
  }
  return best < 0 ? 'not invited' : STATUS_ORDER[best]
}

/** `swing` lives on the row itself; the four bundles live in `scores`. */
const rankValue = (row: { scores: Record<string, number>; swing: number }, by: RankKey) =>
  by === 'swing' ? row.swing : row.scores[by]

function buildRule(data: DemoData, spec: QuerySpec): string {
  const parts: string[] = []

  if (spec.where?.segment) {
    const names = spec.where.segment.map((id) => data.SEGS.find((g) => g.id === id)?.name ?? id)
    parts.push(names.join(' · ').toUpperCase())
  }
  if (spec.where?.completed === false) parts.push('NO COMPLETED RESULT')
  if (spec.where?.completed === true) parts.push('COMPLETED A RESULT')
  if (spec.where?.faculty) parts.push(spec.where.faculty.toUpperCase())
  if (spec.where?.intakeYear) parts.push(`${spec.where.intakeYear} INTAKE`)
  if (spec.rank) {
    // Always descending. For `swing` that means widest-first, which is stated
    // outright because "best under pressure" and "most volatile" want opposite
    // ends and only the visible rule reveals which one was applied.
    const suffix = spec.rank.by === 'swing' ? ' (WIDEST SWING FIRST)' : ''
    parts.push(`TOP ${spec.rank.topN} BY ${READ_NAMES[spec.rank.by].toUpperCase()}${suffix}`)
  }

  return parts.join(' · ') || 'ALL STUDENTS'
}

export function runQuery(data: DemoData, spec: QuerySpec): QueryResult {
  const where = spec.where
  let matched: Student[] = data.students

  if (where?.faculty) {
    const want = where.faculty.toLowerCase()
    matched = matched.filter((st) => st.faculty.toLowerCase() === want)
  }
  if (where?.intakeYear !== undefined) matched = matched.filter((st) => st.intakeYear === where.intakeYear)
  if (where?.completed !== undefined)
    matched = matched.filter((st) => (latest(data, st.id) !== null) === where.completed)
  if (where?.segment) {
    const want = new Set<string>(where.segment)
    // A student with no completed result has no segment, so this filter excludes
    // them rather than treating "unflagged" as a default.
    matched = matched.filter((st) => {
      const rec = latest(data, st.id)
      return rec !== null && want.has(rec.seg)
    })
  }

  // Scores exist only for students holding a record, so ranking is computed
  // once for the cohort and then joined — never recomputed per row.
  const scoreOf = new Map<string, number>()
  if (spec.rank || spec.show.includes('score')) {
    const by = spec.rank?.by ?? 'lead'
    for (const row of readinessOf(data, 'latest')) {
      const v = rankValue(row, by)
      if (v !== undefined) scoreOf.set(row.id, v)
    }
  }

  if (spec.rank) {
    matched = matched
      .filter((st) => scoreOf.has(st.id))
      .sort((a, b) => scoreOf.get(b.id)! - scoreOf.get(a.id)!)
      .slice(0, spec.rank.topN)
  }

  const total = matched.length
  const columns = spec.show
  const rows = matched.slice(0, MAX_ROWS_SHOWN).map((st) => {
    const rec = latest(data, st.id)
    const score = scoreOf.get(st.id)
    const cells = columns.map((c) => {
      switch (c) {
        case 'name':
          return st.name
        case 'faculty':
          return `${st.faculty} · ${st.intakeYear}`
        case 'segment':
          return rec ? (data.SEGS.find((g) => g.id === rec.seg)?.name ?? rec.seg) : '—'
        case 'action':
          return rec ? SEGMENT_META[rec.seg].action : '—'
        case 'score':
          return score === undefined ? '—' : `${k7s(score)} ${kband(score).t}`
        case 'inviteStatus':
          return inviteStatusOf(st)
      }
    })
    return { id: st.id, cells }
  })

  return { rule: buildRule(data, spec), columns, headers: columns.map((c) => HEADERS[c]), rows, total }
}

/**
 * Suggested questions. Presenter-facing, so each one is known to resolve — and
 * between them they demonstrate both intents and filter composition, because the
 * empty state is the only place the assistant's range is visible.
 */
export const SUGGESTIONS = [
  'Show me the students in need of intervention',
  'Show me students with leadership skills',
  "Show me students who haven't completed their assessment",
  'Who is most resilient in Engineering?',
  'What do the six dimensions measure?',
] as const

/** Read display names, exported so the drawer and tests share one source. */
export { READ_NAMES }
