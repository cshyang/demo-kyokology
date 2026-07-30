'use client'

import { useMemo, useState } from 'react'
import { Header } from '@/components/Header'
import { CohortFilters } from '@/components/CohortFilters'
import { useDemoData } from '@/lib/data/demo.ts'
import { useTweenedNumbers } from '@/lib/use-tweened-numbers.ts'
import { meanOf, recordFor, selectRecords, type CohortFilter } from '@/lib/data/derive.ts'
import { tint, token } from '@/lib/color'

// Radar geometry, verbatim from the prototype so the shape is identical.
const CX = 238, CY = 204, R = 118, VB_W = 476, VB_H = 404
const FACULTY_COLORS = [token('teal'), token('gold'), token('sky'), token('rust')]
const WAVE_NAME = { w1: 'first assessment', w2: 're-assessment', latest: 'latest' } as const

const point = (i: number, v: number): [number, number] => {
  const a = ((-90 + i * 60) * Math.PI) / 180
  const r = (R * v) / 100
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}
const poly = (vals: number[]) => vals.map((v, i) => point(i, v).map((z) => z.toFixed(1)).join(',')).join(' ')
const ring = (v: number) => poly(Array(6).fill(v))

export default function FingerprintPage() {
  const data = useDemoData()
  const [filter, setFilter] = useState<CohortFilter>({ fac: 'All', yr: 'All', wave: 'latest' })
  /** Which faculty the pointer is over in the legend, so the other three can fall back. */
  const [hoverFac, setHoverFac] = useState<number | null>(null)

  const v = useMemo(() => {
    const recs = selectRecords(data, filter)
    const refRecs = data.students
      .map((st) => recordFor(data, st.id, filter.wave))
      .filter((r): r is NonNullable<typeof r> => !!r)

    const coh = meanOf(data, recs)
    const uni = meanOf(data, refRecs)
    const isAll = filter.fac === 'All'
    // Faculty separation compares all four faculties, so it ignores the faculty
    // filter and honours only intake + wave. Deriving it from `recs` would blank
    // three rows the moment someone picks a faculty — emptying the one panel
    // whose entire job is the comparison.
    const acrossFaculties = selectRecords(data, { ...filter, fac: 'All' })
    const facMeans = data.FACULTIES.map((f) =>
      meanOf(data, acrossFaculties.filter((r) => r.st.faculty === f.name)),
    )
    const refShort = filter.wave === 'latest' ? 'campus' : `campus Oct ${filter.wave === 'w1' ? '25' : '26'}`

    const axes = data.SHORT.map((label, i) => {
      const a = ((-90 + i * 60) * Math.PI) / 180
      const co = Math.cos(a), si = Math.sin(a)
      const lr = Math.abs(si) > 0.9 ? R + 38 : R + 50
      const lx = CX + lr * co, ly = CY + lr * si
      const vals = facMeans.map((m) => m[i]).filter((x) => x > 0)
      const lo = vals.length ? Math.min(...vals) : 0
      const hi = vals.length ? Math.max(...vals) : 0
      const d = coh[i] - uni[i]
      // No vertex or headline number here: both ride the tweened values and are
      // computed at render, so the memo only carries what holds still.
      return {
        label,
        lpct: (lx / VB_W) * 100,
        tpct: (ly / VB_H) * 100,
        // Which side of the circle the label sits on decides how it is nudged clear of the shape.
        place: i === 0 ? 'top' : i === 3 ? 'bottom' : co > 0 ? 'right' : 'left',
        sub: isAll
          ? `${lo}–${hi} by faculty`
          : d === 0 ? '' : `${d > 0 ? '+' : ''}${d} vs ${refShort}`,
        subcol: isAll ? tint('ink', 42) : d > 2 ? token('teal') : d < -2 ? token('rust') : tint('ink', 40),
      }
    })

    const archCounts: Record<string, number> = {}
    for (const r of recs) archCounts[r.arch] = (archCounts[r.arch] ?? 0) + 1
    const archMax = Math.max(1, ...Object.values(archCounts))
    const archRows = Object.entries(archCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => ({ name, n, w: (n / archMax) * 100 }))

    // The lead reports the widest faculty gap, so it has to find it rather than
    // quote it: pick the dimension with the largest spread, then name the ends.
    let wi = 0, wd = 0
    for (let i = 0; i < 6; i++) {
      const vals = facMeans.map((m) => m[i])
      const d = Math.max(...vals) - Math.min(...vals)
      if (d > wd) { wd = d; wi = i }
    }
    const ranked = data.FACULTIES.map((f, i) => ({ name: f.name, v: facMeans[i][wi] })).sort((a, b) => b.v - a.v)

    return {
      recs, coh, uni, isAll, facMeans, axes, archRows,
      lead:
        `Across ${recs.length} assessed students the four faculties are more alike than different — ` +
        `the widest gap is ${wd} points, on ${data.LABELS[wi]}, between ${ranked[0].name} (${ranked[0].v}) ` +
        `and ${ranked[3].name} (${ranked[3].v}). The commonest reading is ${archRows[0]?.name ?? '—'}, ` +
        `${archRows[0]?.n ?? 0} students.`,
      refLabel: filter.wave === 'latest' ? 'Campus' : `Campus · ${WAVE_NAME[filter.wave]}`,
      caption: isAll
        ? 'Each axis shows the cohort mean and the spread across the four faculties.'
        : `Each axis shows ${filter.fac} against the ${filter.wave === 'latest' ? 'campus mean' : `campus, ${WAVE_NAME[filter.wave]}`}.`,
      cohFill: isAll ? tint('ink', 7) : tint('teal', 16),
      cohStroke: isAll ? token('ink') : token('teal'),
    }
  }, [data, filter])

  /*
   * Every series on the radar tweens as one moment: the cohort shape, the
   * campus reference behind it and the four faculty outlines all belong to
   * the same filter change, so they travel on a single clock. Splitting them
   * into five hooks would put five requestAnimationFrame loops on the same
   * subtree, each re-rendering it independently.
   */
  const tweened = useTweenedNumbers([...v.coh, ...v.uni, ...v.facMeans.flat()])
  const coh = tweened.slice(0, 6)
  const uni = tweened.slice(6, 12)
  const facMeans = [0, 1, 2, 3].map((k) => tweened.slice(12 + k * 6, 18 + k * 6))

  const placement: Record<string, string> = {
    top: 'translate(-50%, calc(-100% - 10px)) ',
    bottom: 'translate(-50%, 12px)',
    right: 'translate(12px, -50%)',
    left: 'translate(calc(-100% - 12px), -50%)',
  }

  return (
    <>
      <Header
        title="Cohort fingerprint"
        sub={
          filter.fac === 'All'
            ? `Six dimensions across ${v.recs.length} assessed students, with each faculty overlaid.`
            : `Six dimensions across ${v.recs.length} ${filter.fac} students, against the campus-wide average.`
        }
        /*
         * Clearing the hover alongside the filter, because picking "Engineering"
         * unmounts the four faculty chips and React fires no mouseleave on an
         * element that no longer exists. hoverFac would stay pinned at whichever
         * chip the pointer was resting on, leaving the cohort shape at 25% with
         * nothing left on screen to hover off.
         */
        filters={<CohortFilters value={filter} onChange={(next) => { setHoverFac(null); setFilter(next) }} />}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto bg-[#FCFCFA] px-[26px] py-[22px]">
        <p className="max-w-[86ch] px-0.5 pt-0.5 text-[13.5px] leading-[1.7] text-pretty text-ink/72">{v.lead}</p>

        <div className="grid content-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(380px,1fr))]">
          <section className="flex min-w-0 flex-col self-start rounded-[10px] border border-ink/10 bg-white p-[22px_26px]">
            <div className="flex flex-none items-baseline gap-3">
              <h2 className="text-[13px] leading-none font-bold text-ink">Six-dimension fingerprint</h2>
              <span className="ml-auto font-mono text-[11px] leading-none text-ink/45">{v.refLabel}</span>
            </div>
            <p className="flex-none pt-2 text-[11.5px] leading-[1.4] text-ink/50">{v.caption}</p>

            {v.recs.length === 0 ? (
              /*
               * Reachable and not an error: the 2026 intake has only ever been
               * assessed in the current wave, so asking for their Oct 2025
               * scores is a question with no answer. Rendering the radar anyway
               * collapses it to a dot with six zeroed axes, which reads as a
               * bug rather than an empty set.
               */
              <div className="flex flex-none flex-col items-center justify-center px-6 py-[72px] text-center">
                <div className="eyebrow text-[9px] tracking-[.16em] text-ink/40">NO DATA FOR THIS COMBINATION</div>
                <p className="mt-3.5 max-w-[46ch] text-[13px] leading-[1.7] text-ink/60">
                  {filter.yr === '2026' && filter.wave !== 'latest'
                    ? 'The 2026 intake has only been assessed once, in the current wave. There is no earlier assessment to show them in.'
                    : 'No student matches this faculty, intake and wave together.'}
                </p>
                <button
                  onClick={() => setFilter({ fac: 'All', yr: 'All', wave: 'latest' })}
                  className="mt-5 cursor-pointer rounded-md border border-ink/18 px-[15px] py-[10px] text-[11.5px] leading-none font-bold text-ink hover:bg-parchment"
                >
                  Reset filters
                </button>
              </div>
            ) : (
            <div className="flex flex-none items-center justify-center px-2 pt-[34px] pb-[18px]">
              <div className="relative w-full max-w-[640px]" style={{ aspectRatio: `${VB_W}/${VB_H}` }}>
                <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block h-full w-full overflow-visible">
                  <polygon points={ring(100)} fill="none" style={{ stroke: tint('ink', 13) }} />
                  <polygon points={ring(75)} fill="none" style={{ stroke: tint('ink', 9) }} />
                  <polygon points={ring(50)} fill="none" style={{ stroke: tint('ink', 9) }} />
                  <polygon points={ring(25)} fill="none" style={{ stroke: tint('ink', 7) }} />
                  <g className="chart-bloom">
                    {v.isAll &&
                      facMeans.map((m, k) => (
                        <polygon
                          key={k}
                          className="chart-fade"
                          points={poly(m)}
                          fill="none"
                          stroke={FACULTY_COLORS[k]}
                          strokeWidth={hoverFac === k ? 2.6 : 1.4}
                          opacity={hoverFac === null ? 0.55 : hoverFac === k ? 1 : 0.12}
                        />
                      ))}
                    {!v.isAll && (
                      <polygon points={poly(uni)} fill="rgba(196,194,187,.45)" stroke="#B4B2AB" strokeWidth={1.6} strokeDasharray="4 3" />
                    )}
                    <polygon
                      className="chart-fade"
                      points={poly(coh)}
                      fill={v.cohFill}
                      stroke={v.cohStroke}
                      strokeWidth={2.4}
                      opacity={hoverFac === null ? 1 : 0.25}
                    />
                    {v.axes.map((ax, i) => {
                      // Rides the tweened value, so the dot stays welded to the
                      // corner of the shape for every frame of the move.
                      const [vx, vy] = point(i, coh[i])
                      return (
                        <circle
                          key={ax.label}
                          className="chart-fade"
                          cx={vx}
                          cy={vy}
                          r={3.4}
                          fill={v.cohStroke}
                          opacity={hoverFac === null ? 1 : 0.25}
                        />
                      )
                    })}
                  </g>
                </svg>

                {v.axes.map((ax, i) => (
                  <div
                    key={ax.label}
                    className="absolute whitespace-nowrap"
                    style={{
                      left: `${ax.lpct}%`,
                      top: `${ax.tpct}%`,
                      transform: placement[ax.place],
                      textAlign: ax.place === 'left' ? 'right' : ax.place === 'right' ? 'left' : 'center',
                    }}
                  >
                    <div className="eyebrow text-[9px] tracking-[.12em] text-ink/50">{ax.label}</div>
                    {/*
                      Counts on the same clock as the shape rather than cutting to
                      the new figure — the number and the vertex it labels arrive
                      together. tabular-nums keeps the label from twitching sideways
                      as digits change width mid-count.
                    */}
                    <div className="mt-1.5 text-[15px] leading-none font-bold tabular-nums text-ink">
                      {v.isAll ? Math.round(coh[i]) : `${Math.round(coh[i])} / ${Math.round(uni[i])}`}
                    </div>
                    <div className="mt-1.5 font-mono text-[9.5px] leading-none" style={{ color: ax.subcol }}>
                      {ax.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            <div className="mt-1.5 flex flex-none flex-wrap gap-[18px] border-t border-ink/8 pt-4">
              <span className="flex items-center gap-2 text-[11.5px] leading-[1.4] text-ink/55">
                <span className="h-[3px] w-3.5 flex-none" style={{ background: v.cohStroke }} />
                {filter.fac}
              </span>
              {v.isAll ? (
                <span className="flex items-center gap-3.5">
                  {data.FACULTIES.map((f, k) => (
                    <span
                      key={f.name}
                      onMouseEnter={() => setHoverFac(k)}
                      onMouseLeave={() => setHoverFac(null)}
                      className={`flex cursor-default items-center gap-[7px] text-[11.5px] leading-[1.4] transition-colors ${
                        hoverFac === k ? 'text-ink' : 'text-ink/55'
                      }`}
                    >
                      <span className="h-0.5 w-3 flex-none" style={{ background: FACULTY_COLORS[k] }} />
                      {f.name}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-[11.5px] leading-[1.4] text-ink/55">
                  <span className="h-[3px] w-3.5 flex-none bg-[#B4B2AB]" />
                  {v.refLabel}
                </span>
              )}
            </div>
          </section>

          <div className="flex min-w-0 flex-col gap-4">
            <section className="flex-none rounded-[10px] border border-ink/10 bg-white p-[18px_20px]">
              <h2 className="text-[13px] leading-none font-bold text-ink">Faculty separation</h2>
              <p className="mt-1.5 text-[11.5px] leading-[1.4] text-ink/50">
                Mean per dimension. Wide spread means the faculties genuinely differ.
              </p>
              <div className="mt-4 grid gap-2 [grid-template-columns:96px_repeat(6,minmax(0,1fr))]">
                <div />
                {data.T.map((t) => (
                  <div key={t} className="eyebrow text-center text-[8.5px] tracking-[.1em] text-ink/42">
                    {t.toUpperCase()}
                  </div>
                ))}
              </div>
              {data.FACULTIES.map((f, k) => (
                <div
                  key={f.name}
                  className="grid items-center gap-2 border-b border-ink/6 py-[9px] [grid-template-columns:96px_repeat(6,minmax(0,1fr))]"
                >
                  <div className="text-[12px] leading-[1.3] text-ink">{f.name}</div>
                  {v.facMeans[k].map((n, i) => (
                    <div key={i} className="text-center font-mono text-[12px] leading-none font-semibold text-ink/75">
                      {n || '—'}
                    </div>
                  ))}
                </div>
              ))}
            </section>

            <section className="flex-none rounded-[10px] border border-ink/10 bg-white p-[18px_20px]">
              <h2 className="text-[13px] leading-none font-bold text-ink">Career motivation distribution</h2>
              <p className="mt-1.5 text-[11.5px] leading-[1.4] text-ink/50">
                The two leading dimensions, unordered — 15 possible pairings.
              </p>
              <div className="mt-3">
                {v.archRows.map((a, i) => (
                  <div key={a.name} className="group flex items-center gap-[11px] py-[7px]">
                    <div className="w-[130px] flex-none text-[11.5px] leading-[1.3] text-ink">{a.name}</div>
                    <div className="h-[7px] flex-1 overflow-hidden rounded-[4px] bg-line">
                      <div
                        className="chart-bar h-full rounded-[4px] bg-slate opacity-80 group-hover:opacity-100"
                        /* 25ms, not 50: this list runs to fifteen pairings, and a
                           per-row delay tuned for six would leave the last bar starting
                           three-quarters of a second after the first. */
                        style={{ width: `${a.w}%`, animationDelay: `${i * 25}ms` }}
                      />
                    </div>
                    <div className="w-[30px] flex-none text-right font-mono text-[11px] leading-none font-semibold text-ink/60">
                      {a.n}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
