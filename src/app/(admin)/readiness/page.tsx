'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { CohortFilters } from '@/components/CohortFilters'
import { useDemoData, SEGMENT_META, toCsv } from '@/lib/data/demo.ts'
import { recordFor, type CohortFilter } from '@/lib/data/derive.ts'
import { k7s, LAYER_NOTE } from '@/lib/data/layers.ts'
import {
  READS,
  bandColorOf,
  bandOf,
  readinessOf,
  tally,
  type ReadinessRow,
  type TileView,
} from '@/lib/data/readiness.ts'
import { tint } from '@/lib/color'

/**
 * The gap analysis's §1.3, restated for bundles rather than one dimension.
 *
 * Kept in sync by hand with `UNMAPPED` in the profile's ProfileLayers — the same
 * facts, different sentences, because that panel discloses one dimension at a
 * time and this one has to account for a bundle spanning three.
 */
const UNMAPPED_NOTE =
  'These five reads lay facet names from the printed report over an item bank that measures ' +
  'somewhat different constructs. Leadership potential is the most affected: the platform’s ' +
  'Egocentricity items read as grievance — keeping score, sitting with criticism — where the ' +
  'report reads agency, and no item in the bank asks about persuasion, so Inspiring & Influencing ' +
  'is carried by items about ambiguity and pattern-finding. Collaborative spirit is the one read ' +
  'with no such gap. All five are provisional until the item bank is written to match the names.'

const GRID =
  '[grid-template-columns:118px_128px_52px_repeat(4,minmax(0,1fr))_64px_146px]'

/** Which read the roster ranks on, and optionally which band of it. */
interface Selection {
  key: string
  band: string | null
}

/**
 * The educator half of "one framework, two views".
 *
 * Fingerprint reads the same facet evidence as six dimensions, for someone who
 * knows the model. This reads it as five outcomes, for a Dean who does not. The
 * overlap is the product's stated architecture, not an accident — the fact sheet
 * calls it "the same facet evidence, read for a different purpose".
 *
 * The tiles are the briefing; the roster beneath them answers "so who are they?".
 * The spec (§ D1) shipped this as a briefing surface with no drill-through and
 * named that question as the condition for adding one. It was asked.
 */
export default function ReadinessPage() {
  const data = useDemoData()
  const router = useRouter()
  const [filter, setFilter] = useState<CohortFilter>({ fac: 'All', yr: 'All', wave: 'latest' })
  const [sel, setSel] = useState<Selection>({ key: 'lead', band: null })

  // The whole cohort, once per wave — 13 ms measured.
  const rows = useMemo(() => readinessOf(data, filter.wave), [data, filter.wave])

  // Faculty and intake only re-filter a precomputed array, so those two selects
  // stay instant. Same predicate as selectRecords, applied to rows rather than
  // records so there is no join back through the generator.
  const keep = useMemo(
    () =>
      rows.filter((r) => {
        const st = data.byId[r.id]
        return (
          (filter.fac === 'All' || st.faculty === filter.fac) &&
          (filter.yr === 'All' || String(st.intakeYear) === filter.yr)
        )
      }),
    [data, rows, filter.fac, filter.yr],
  )

  const tiles = useMemo(() => tally(keep), [keep])
  const bundles = tiles.filter((t) => t.facetNames)
  const pressure = tiles.find((t) => !t.facetNames)!
  const n = tiles[0].n

  const read = READS.find((r) => r.key === sel.key)!
  const isSwing = sel.key === 'press'

  /**
   * Roster sort. Null is not "unsorted" as it is on Segments — it is the read's
   * own ranking, weakest first, which is the answer to the question that brought
   * anyone here. Swing inverts it: the interesting end of a swing is the wide one.
   */
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)

  const roster = useMemo(() => {
    const band = sel.band
    const matched = band ? keep.filter((r) => bandOf(r, sel.key) === band) : [...keep]

    const value = (r: ReadinessRow): string | number => {
      const st = data.byId[r.id]
      switch (sort?.key) {
        case 'name':
          return st.name
        case 'faculty':
          return st.faculty
        case 'intake':
          return st.intakeYear
        case 'seg':
          return recordFor(data, r.id, filter.wave)?.seg ?? ''
        case 'press':
          return r.swing
        default:
          return r.scores[sort!.key]
      }
    }

    if (!sort) {
      return matched.sort((a, b) =>
        isSwing ? b.swing - a.swing : a.scores[sel.key] - b.scores[sel.key],
      )
    }
    return matched.sort((a, b) => {
      const x = value(a)
      const y = value(b)
      const d =
        typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
      return d * sort.dir
    })
  }, [data, keep, sel, sort, isSwing, filter.wave])

  /** Third click clears back to the read's own ranking, which carries meaning. */
  const toggleSort = (key: string) =>
    setSort((prev) =>
      prev?.key !== key ? { key, dir: 1 } : prev.dir === 1 ? { key, dir: -1 } : null,
    )

  /**
   * A plain function, not a component, so React does not see a fresh component
   * type each render and remount all nine headers. The arrow's slot is reserved
   * whether or not it shows, because a nine-column header row jolts otherwise.
   */
  const sortable = (key: string, label: string, center = false) => {
    const active = sort?.key === key
    return (
      <button
        key={key}
        onClick={() => toggleSort(key)}
        title={`Sort by ${label.toLowerCase()}`}
        className={`flex cursor-pointer items-center gap-[3px] font-semibold tracking-[.1em] uppercase ${
          center ? 'justify-center' : ''
        } ${active ? 'text-ink' : 'hover:text-ink/70'}`}
      >
        {label}
        <span className="inline-block w-[5px] text-left">
          {active ? (sort.dir === 1 ? '↑' : '↓') : ''}
        </span>
      </button>
    )
  }

  function exportCsv() {
    const head = ['Student', 'Faculty', 'Intake', ...READS.map((r) => r.name), 'Pattern']
    const body = roster.map((r) => {
      const st = data.byId[r.id]
      const rec = recordFor(data, r.id, filter.wave)
      return [
        st.name,
        st.faculty,
        String(st.intakeYear),
        ...READS.map((x) => (x.facets ? k7s(r.scores[x.key]) : String(r.swing))),
        rec ? (data.SEGS.find((g) => g.id === rec.seg)?.name ?? rec.seg) : '—',
      ]
    })
    const url = URL.createObjectURL(
      new Blob([toCsv([head, ...body])], { type: 'text/csv;charset=utf-8' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `${sel.key}${sel.band ? `-${sel.band.toLowerCase().replace(/ /g, '-')}` : ''}-readiness.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const bandColor = sel.band
    ? (tiles.find((t) => t.key === sel.key)!.bands.find((b) => b.name === sel.band)?.color ?? null)
    : null

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
        <div key={`${filter.fac}|${filter.yr}|${filter.wave}`} className="chart-appear flex flex-col gap-4">
          <div className="grid content-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(380px,1fr))]">
            {bundles.map((t) => (
              <Tile key={t.key} t={t} sel={sel} onSelect={setSel} />
            ))}
          </div>
          <Tile t={pressure} sel={sel} onSelect={setSel} />
        </div>

        {/*
          The min-height is load-bearing. `flex-1` inside a scrolling flex column
          divides the space left over rather than claiming its natural height, so
          on a shorter viewport the tiles take nearly all of it and this roster
          collapses to two visible rows. A floor keeps it usable.
        */}
        <section className="flex min-h-[340px] flex-1 flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-white">
          <div className="flex flex-none flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink/8 px-[18px] py-[15px]">
            <h2 className="text-[13px] leading-none font-bold text-ink">{read.name}</h2>
            {sel.band && bandColor && (
              <button
                onClick={() => setSel({ key: sel.key, band: null })}
                title="Show the whole read again"
                className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9px] leading-none font-semibold tracking-[.1em]"
                style={{ background: `${tint('ink', 5)}`, color: bandColor }}
              >
                {sel.band}
                <span className="text-ink/40">✕</span>
              </button>
            )}
            <div className="font-mono text-[10.5px] leading-none text-ink/45">
              {roster.length} STUDENTS
              {sort ? '' : isSwing ? ' · WIDEST SWING FIRST' : ' · WEAKEST FIRST'}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden font-mono text-[9.5px] leading-none tracking-[.08em] text-ink/35 lg:inline">
                CLICK A TILE FOR THE READ · A BAND FOR THAT BAND
              </span>
              <button
                onClick={exportCsv}
                disabled={roster.length === 0}
                className="cursor-pointer rounded-md border border-ink/18 px-[13px] py-[9px] text-[11.5px] leading-none font-bold text-ink hover:bg-parchment disabled:opacity-40"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div
            className={`grid flex-none gap-2.5 border-b border-ink/8 bg-cream px-[18px] py-2.5 font-mono text-[8.5px] leading-none font-semibold tracking-[.1em] text-ink/42 ${GRID}`}
          >
            {sortable('name', 'STUDENT')}
            {sortable('faculty', 'FACULTY')}
            {sortable('intake', 'INTAKE')}
            {READS.map((r) => (
              <span key={r.key} className={r.key === sel.key ? 'font-bold text-ink' : ''}>
                {sortable(r.key, r.short, true)}
              </span>
            ))}
            {sortable('seg', 'PATTERN')}
          </div>

          {/* Keyed on the selection so the roster crossfades instead of swapping
              under a stationary header. */}
          <div key={`${sel.key}|${sel.band}`} className="chart-appear min-h-0 flex-1 overflow-auto">
            {roster.length === 0 ? (
              <p className="px-[18px] py-6 text-[12.5px] leading-[1.6] text-ink/50">
                Nobody sits in {sel.band ?? 'this read'} under the current filter. The band stays in
                the bar above because a share of zero is a finding, not a gap.
              </p>
            ) : (
              roster.map((r) => {
                const st = data.byId[r.id]
                const rec = recordFor(data, r.id, filter.wave)
                const seg = rec ? data.SEGS.find((g) => g.id === rec.seg) : null
                return (
                  <div
                    key={r.id}
                    onClick={() => router.push(`/students/profile?id=${r.id}`)}
                    className={`grid cursor-pointer items-center gap-2.5 border-b border-ink/6 px-[18px] py-[11px] text-[12px] leading-[1.3] text-ink/70 hover:bg-cream ${GRID}`}
                  >
                    <div className="truncate font-bold text-ink">{st.name}</div>
                    <div className="truncate">{st.faculty}</div>
                    <div className="font-mono text-[11px] leading-none">{st.intakeYear}</div>
                    {READS.map((x) => {
                      const on = x.key === sel.key
                      return (
                        <div
                          key={x.key}
                          // The five numbers are near-identical across a row, so
                          // the ranked column is coloured by its band — otherwise
                          // nothing on screen says which one produced this order.
                          className={`text-center font-mono text-[11.5px] leading-none ${on ? 'font-bold' : 'font-semibold text-ink/55'}`}
                          style={on ? { color: bandColorOf(r, x.key) } : undefined}
                        >
                          {x.facets ? k7s(r.scores[x.key]) : r.swing}
                        </div>
                      )
                    })}
                    <div className="flex min-w-0 items-center gap-2">
                      {seg ? (
                        <>
                          <span
                            className="size-2 flex-none rounded-full"
                            style={{ background: seg.color }}
                          />
                          <span className="truncate" title={SEGMENT_META[seg.id].action}>
                            {seg.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-ink/35">—</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <div className="flex flex-col gap-2.5 px-0.5 pb-1">
          <p className="max-w-[92ch] text-[11.5px] leading-[1.7] text-pretty text-ink/50">{LAYER_NOTE}</p>
          <p className="max-w-[92ch] border-l-2 border-ink/14 pl-3.5 text-[11.5px] leading-[1.65] text-pretty text-ink/55">
            <strong className="font-bold text-ink/75">Names ahead of items.</strong> {UNMAPPED_NOTE}
          </p>
        </div>
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
 *
 * Both the heading and each band are click targets, and the heading is the
 * primary one on measured grounds: averaging three facets collapses variance, so
 * of twenty bundle bands unfiltered, leadership VERY STRONG holds nobody and
 * resilience STRONG holds one. An empty band is a real finding on the bar and a
 * dead end as a target, so it renders unclickable rather than clicking to
 * nothing.
 */
function Tile({
  t,
  sel,
  onSelect,
}: {
  t: TileView
  sel: { key: string; band: string | null }
  onSelect: (s: { key: string; band: string | null }) => void
}) {
  const active = sel.key === t.key
  return (
    // No `self-start`: in the grid it lets two tiles in a row match heights, and
    // in the flex column below it lets the pressure tile span full width.
    <section
      className="flex min-w-0 flex-col rounded-[10px] bg-white p-[20px_24px]"
      style={{
        boxShadow: active ? `inset 0 0 0 2px ${tint('ink', 55)}` : `inset 0 0 0 1px ${tint('ink', 12)}`,
      }}
    >
      <div className="flex flex-none items-baseline gap-3">
        <button
          onClick={() => onSelect({ key: t.key, band: null })}
          aria-pressed={active && !sel.band}
          title={
            t.facetNames === null
              ? 'List these students, widest swing first'
              : 'List these students, weakest first'
          }
          className="cursor-pointer text-left text-[13px] leading-none font-bold text-ink hover:underline"
        >
          {t.name}
        </button>
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
              <button
                key={b.name}
                disabled={b.n === 0}
                onClick={() => onSelect({ key: t.key, band: b.name })}
                title={b.n === 0 ? `Nobody is ${b.name}` : `List the ${b.n} student${b.n === 1 ? '' : 's'} in ${b.name}`}
                style={{
                  width: `${b.pct}%`,
                  background: b.color,
                  opacity: active && sel.band && sel.band !== b.name ? 0.3 : 1,
                }}
                className={b.n === 0 ? 'cursor-default' : 'cursor-pointer'}
              />
            ))}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {t.bands.map((b) => {
              const on = active && sel.band === b.name
              return (
                <button
                  key={b.name}
                  disabled={b.n === 0}
                  onClick={() => onSelect({ key: t.key, band: b.name })}
                  aria-pressed={on}
                  title={b.n === 0 ? `Nobody is ${b.name}` : `List the ${b.n} student${b.n === 1 ? '' : 's'} in ${b.name}`}
                  className={`flex items-center gap-1.5 font-mono text-[9px] leading-none tracking-[.08em] ${
                    b.n === 0
                      ? 'cursor-default text-ink/28'
                      : on
                        ? 'cursor-pointer font-bold text-ink'
                        : 'cursor-pointer text-ink/50 hover:text-ink/80'
                  }`}
                >
                  <span className="size-[7px] flex-none rounded-full" style={{ background: b.color }} />
                  {b.name} {b.pct}%
                </button>
              )
            })}
          </div>

          <p className="mt-3.5 font-mono text-[10.5px] leading-none font-bold tracking-[.1em] text-ink/55">
            {t.headline}
          </p>
        </>
      )}
    </section>
  )
}
