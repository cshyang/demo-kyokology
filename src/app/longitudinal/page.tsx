'use client'

import { useMemo } from 'react'
import { Header } from '@/components/Header'
import { useDemoData } from '@/lib/data/demo.ts'
import { facultyDeltas, migration, migrationHeadline, topMovers, type CentredBar } from '@/lib/data/derive.ts'

const lead = (n: number) =>
  `The same ${n} students, assessed twice a year apart. Everything here is a difference, not a snapshot — which is the only way to tell whether an intervention did anything or the cohort simply changed.`

/** A bar drawn from the centre line: right for a rise, left for a fall. */
function Bar({ bar, height = 16 }: { bar: CentredBar; height?: number }) {
  return (
    <div className="relative" style={{ height }}>
      <div className="absolute inset-y-0 left-1/2 w-px bg-ink/12" />
      <div
        className="absolute top-[3px] h-2.5 rounded-[2px]"
        style={{ left: `${bar.l}%`, width: `${bar.w}%`, background: bar.color }}
      />
    </div>
  )
}

const GRID = '[grid-template-columns:96px_repeat(6,minmax(0,1fr))]'

export default function LongitudinalPage() {
  const data = useDemoData()
  const v = useMemo(
    () => ({
      deltas: facultyDeltas(data),
      movers: topMovers(data),
      mig: migration(data),
      headline: migrationHeadline(data),
    }),
    [data],
  )

  return (
    <>
      <Header
        title="Longitudinal"
        sub={`${data.pairIds.length} students assessed twice · Oct 2025 baseline vs Oct 2026 re-assessment`}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto bg-[#FCFCFA] px-[26px] py-[22px]">
        <p className="max-w-[86ch] px-0.5 pt-0.5 text-[13.5px] leading-[1.7] text-pretty text-ink/72">{lead(data.pairIds.length)}</p>

        <div className="grid flex-none gap-4 [grid-template-columns:repeat(auto-fit,minmax(360px,1fr))]">
          <section className="rounded-[10px] border border-ink/10 bg-white p-[18px_20px]">
            <h2 className="text-[13px] leading-none font-bold text-ink">Dimension movement by faculty</h2>
            <p className="mt-1.5 text-[11.5px] leading-[1.4] text-ink/50">
              Mean change per student, first assessment (Oct 2025) to re-assessment (Oct 2026). Bars run from the
              centre.
            </p>

            <div className={`mt-4 grid gap-2.5 ${GRID}`}>
              <div />
              {data.T.map((t) => (
                <div key={t} className="eyebrow text-center text-[8.5px] tracking-[.1em] text-ink/42">
                  {t.toUpperCase()}
                </div>
              ))}
            </div>

            {v.deltas.map((row) => (
              <div key={row.name} className={`grid items-center gap-2.5 border-b border-ink/6 py-[11px] ${GRID}`}>
                <div className="text-[12px] leading-[1.3] text-ink">{row.name}</div>
                {row.bars.map((bar, i) => (
                  <div key={i}>
                    <Bar bar={bar} />
                    <div
                      className="mt-1 text-center font-mono text-[10px] leading-none font-semibold"
                      style={{ color: bar.color }}
                    >
                      {bar.txt}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>

          <div className="flex flex-col gap-4">
            <section className="rounded-[10px] bg-ink p-[20px_22px] text-white">
              <div className="eyebrow text-[9px] tracking-[.16em] text-white/50">THE HEADLINE</div>
              <div className="mt-3.5 flex items-baseline gap-2.5">
                <div className="text-[38px] leading-none font-black tracking-[-.03em] tabular-nums">
                  {v.headline.out}
                </div>
                <p className="text-[12.5px] leading-[1.5] text-white/75">
                  of {v.headline.n} {v.headline.seg} moved out of the pattern by the Oct 2026 re-assessment.
                </p>
              </div>
              <p className="mt-3 text-[12px] leading-[1.7] text-white/60">{v.headline.tail}</p>
            </section>

            <section className="flex-1 rounded-[10px] border border-ink/10 bg-white p-[18px_20px]">
              <h2 className="text-[13px] leading-none font-bold text-ink">Biggest movements</h2>
              <div className="mt-4 flex flex-col gap-3">
                {v.movers.map((m) => (
                  <div key={m.name}>
                    <div className="flex items-baseline gap-2">
                      <div className="min-w-0 flex-1 text-[12px] leading-[1.3] text-ink">{m.name}</div>
                      <div className="font-mono text-[11.5px] leading-none font-semibold" style={{ color: m.color }}>
                        {m.txt}
                      </div>
                    </div>
                    <div className="mt-1.5">
                      <Bar bar={m} height={9} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <section className="flex-none rounded-[10px] border border-ink/10 bg-white p-[18px_20px]">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[13px] leading-none font-bold text-ink">Pattern migration</h2>
            <span className="eyebrow ml-auto text-[10.5px] tracking-normal text-ink/45">
              ARCHETYPE CHURN {data.churnPct}% · CEILING 8%
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {v.mig.map((mg) => (
              <div key={mg.id} className="rounded-[9px] bg-cream p-[15px_16px]">
                <div className="flex items-center gap-[9px]">
                  <span className="size-[9px] flex-none rounded-full" style={{ background: mg.color }} />
                  <span className="text-[12.5px] leading-[1.3] font-bold text-ink">{mg.name}</span>
                </div>
                <div className="eyebrow mt-2.5 text-[9.5px] tracking-normal text-ink/45">{mg.line}</div>
                {mg.empty ? (
                  <div className="mt-2.5 h-[7px] rounded-[4px] bg-line/60" />
                ) : (
                  <div className="mt-2.5 flex h-[7px] overflow-hidden rounded-[4px] bg-line">
                    <div style={{ background: mg.color, width: `${mg.stayW}%` }} />
                    <div className="bg-ink/18" style={{ width: `${mg.outW}%` }} />
                  </div>
                )}
                <p className={`mt-2.5 text-[11px] leading-[1.5] ${mg.empty ? 'text-ink/40 italic' : 'text-ink/55'}`}>{mg.note}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
