'use client'

import { useMemo, useState } from 'react'
import { Header } from '@/components/Header'
import { CohortFilters } from '@/components/CohortFilters'
import { useDemoData } from '@/lib/data/demo.ts'
import { meanOf, recordFor, selectRecords, type CohortFilter } from '@/lib/data/derive.ts'

// Radar geometry, verbatim from the prototype so the shape is identical.
const CX = 238, CY = 204, R = 118, VB_W = 476, VB_H = 404
const FACULTY_COLORS = ['#1E6F63', '#B98B3C', '#6E96BF', '#A6503F']
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
    const refShort = filter.wave === 'latest' ? 'uni' : `uni Oct ${filter.wave === 'w1' ? '25' : '26'}`

    const axes = data.SHORT.map((label, i) => {
      const a = ((-90 + i * 60) * Math.PI) / 180
      const co = Math.cos(a), si = Math.sin(a)
      const lr = Math.abs(si) > 0.9 ? R + 38 : R + 50
      const lx = CX + lr * co, ly = CY + lr * si
      const vals = facMeans.map((m) => m[i]).filter((x) => x > 0)
      const lo = vals.length ? Math.min(...vals) : 0
      const hi = vals.length ? Math.max(...vals) : 0
      const d = coh[i] - uni[i]
      const [vx, vy] = point(i, coh[i])
      return {
        label, vx, vy,
        lpct: (lx / VB_W) * 100,
        tpct: (ly / VB_H) * 100,
        // Which side of the circle the label sits on decides how it is nudged clear of the shape.
        place: i === 0 ? 'top' : i === 3 ? 'bottom' : co > 0 ? 'right' : 'left',
        txt: isAll ? String(coh[i]) : `${coh[i]} / ${uni[i]}`,
        sub: isAll
          ? `${lo}–${hi} by faculty`
          : d === 0 ? '' : `${d > 0 ? '+' : ''}${d} vs ${refShort}`,
        subcol: isAll ? 'rgba(20,40,60,.42)' : d > 2 ? '#1E6F63' : d < -2 ? '#A6503F' : 'rgba(20,40,60,.4)',
      }
    })

    const archCounts: Record<string, number> = {}
    for (const r of recs) archCounts[r.arch] = (archCounts[r.arch] ?? 0) + 1
    const archMax = Math.max(1, ...Object.values(archCounts))
    const archRows = Object.entries(archCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => ({ name, n, w: (n / archMax) * 100 }))

    return {
      recs, coh, uni, isAll, facMeans, axes, archRows,
      refLabel: filter.wave === 'latest' ? 'University' : `University · ${WAVE_NAME[filter.wave]}`,
      caption: isAll
        ? 'Each axis shows the cohort mean and the spread across the four faculties.'
        : `Each axis shows ${filter.fac} against the ${filter.wave === 'latest' ? 'university mean' : `university, ${WAVE_NAME[filter.wave]}`}.`,
      cohFill: isAll ? 'rgba(20,40,60,.07)' : 'rgba(30,111,99,.16)',
      cohStroke: isAll ? '#14283C' : '#1E6F63',
    }
  }, [data, filter])

  const placement: Record<string, string> = {
    top: 'translate(-50%, calc(-100% - 10px)) ',
    bottom: 'translate(-50%, 12px)',
    right: 'translate(12px, -50%)',
    left: 'translate(calc(-100% - 12px), -50%)',
  }

  return (
    <>
      <Header title="Fingerprint" sub={`${v.recs.length} students in view · six-dimension mean`}>
        <CohortFilters value={filter} onChange={setFilter} />
      </Header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto bg-[#FCFCFA] px-[26px] py-[22px]">
        <p className="max-w-[86ch] px-0.5 pt-0.5 text-[13.5px] leading-[1.7] text-pretty text-ink/72">
          Faculties are generated from different mean vectors, so the separation you see is real signal rather than
          noise — switch the filter to one faculty and the shape moves against the university reference.
        </p>

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
                  <polygon points={ring(100)} fill="none" stroke="rgba(20,40,60,.13)" />
                  <polygon points={ring(75)} fill="none" stroke="rgba(20,40,60,.09)" />
                  <polygon points={ring(50)} fill="none" stroke="rgba(20,40,60,.09)" />
                  <polygon points={ring(25)} fill="none" stroke="rgba(20,40,60,.07)" />
                  {v.isAll &&
                    v.facMeans.map((m, k) => (
                      <polygon key={k} points={poly(m)} fill="none" stroke={FACULTY_COLORS[k]} strokeWidth={1.4} opacity={0.55} />
                    ))}
                  {!v.isAll && (
                    <polygon points={poly(v.uni)} fill="rgba(196,194,187,.45)" stroke="#B4B2AB" strokeWidth={1.6} strokeDasharray="4 3" />
                  )}
                  <polygon points={poly(v.coh)} fill={v.cohFill} stroke={v.cohStroke} strokeWidth={2.4} />
                  {v.axes.map((ax) => (
                    <circle key={ax.label} cx={ax.vx} cy={ax.vy} r={3.4} fill={v.cohStroke} />
                  ))}
                </svg>

                {v.axes.map((ax) => (
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
                    <div className="mt-1.5 text-[15px] leading-none font-bold text-ink">{ax.txt}</div>
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
                    <span key={f.name} className="flex items-center gap-[7px] text-[11.5px] leading-[1.4] text-ink/55">
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
              <h2 className="text-[13px] leading-none font-bold text-ink">Archetype distribution</h2>
              <p className="mt-1.5 text-[11.5px] leading-[1.4] text-ink/50">
                The two leading dimensions, unordered — 15 possible labels.
              </p>
              <div className="mt-3">
                {v.archRows.map((a) => (
                  <div key={a.name} className="flex items-center gap-[11px] py-[7px]">
                    <div className="w-[130px] flex-none text-[11.5px] leading-[1.3] text-ink">{a.name}</div>
                    <div className="h-[7px] flex-1 overflow-hidden rounded-[4px] bg-line">
                      <div className="h-full rounded-[4px] bg-slate opacity-80" style={{ width: `${a.w}%` }} />
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
