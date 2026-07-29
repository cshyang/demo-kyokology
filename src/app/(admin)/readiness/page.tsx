'use client'

import { useMemo, useState } from 'react'
import { Header } from '@/components/Header'
import { CohortFilters } from '@/components/CohortFilters'
import { useDemoData } from '@/lib/data/demo.ts'
import type { CohortFilter } from '@/lib/data/derive.ts'
import { LAYER_NOTE } from '@/lib/data/layers.ts'
import { readinessOf, tally, type TileView } from '@/lib/data/readiness.ts'

/**
 * The gap analysis's §1.3, restated for bundles rather than for one dimension.
 *
 * Kept in sync by hand with `UNMAPPED` in the profile's ProfileLayers — same
 * facts, different sentences, because that panel discloses one dimension at a
 * time and this one has to account for a bundle spanning three.
 */
const UNMAPPED_NOTE =
  'These five reads lay facet names from the printed report over an item bank that measures ' +
  'somewhat different constructs. Leadership potential is the most affected: this platform’s ' +
  'Egocentricity items read as grievance — keeping score, sitting with criticism — where the ' +
  'report reads agency, and no item in the bank asks about persuasion, so Inspiring & Influencing ' +
  'is carried by items about ambiguity and pattern-finding. Team compatibility is the one read ' +
  'with no such gap. All five are provisional until the item bank is written to match the names.'

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
 */
function Tile({ t }: { t: TileView }) {
  return (
    // No `self-start`: in the grid it lets two tiles in a row match heights, and
    // in the flex column below it lets the pressure tile span the full width.
    <section className="flex min-w-0 flex-col rounded-[10px] border border-ink/10 bg-white p-[20px_24px]">
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
