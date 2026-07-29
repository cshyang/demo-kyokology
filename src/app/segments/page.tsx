'use client'

import { useMemo, useState } from 'react'
import { Header } from '@/components/Header'
import { useDemoData, SEGMENT_META, latestResult, assessedStudents, toCsv } from '@/lib/data/demo.ts'
import type { SegmentId } from '@/lib/data/generator.ts'

const LEAD =
  'Segments are trait rules, not labels. Each one is evaluated against a student’s most recent completed assessment, in the order shown — so every assessed student lands in exactly one bucket and the counts close.'

export default function SegmentsPage() {
  const data = useDemoData()
  const [selected, setSelected] = useState<SegmentId>('silent')

  const { counts, assessed } = useMemo(() => {
    const list = assessedStudents(data)
    const counts = {} as Record<SegmentId, number>
    for (const s of data.SEGS) counts[s.id] = 0
    for (const st of list) counts[latestResult(data, st.id)!.seg]++
    return { counts, assessed: list.length }
  }, [data])

  const rows = useMemo(
    () =>
      assessedStudents(data)
        .filter((st) => latestResult(data, st.id)!.seg === selected)
        .map((st) => {
          const r = latestResult(data, st.id)!
          return { st, r }
        }),
    [data, selected],
  )

  const selMeta = data.SEGS.find((s) => s.id === selected)!

  function exportCsv() {
    const head = ['Student', 'Faculty', 'Intake', 'Archetype', ...data.SHORT, 'Consent']
    const body = rows.map(({ st, r }) => [
      st.name, st.faculty, String(st.intakeYear), r.arch,
      ...data.T.map((t) => String(r.sc[t])), r.at,
    ])
    const blob = new Blob([toCsv([head, ...body])], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kykology-${selected}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <Header title="Segments" sub={`${assessed} assessed students · seven mutually exclusive buckets`} />
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto bg-[#FCFCFA] px-[26px] py-[22px]">
      <p className="max-w-[86ch] px-0.5 pt-0.5 text-[13.5px] leading-[1.7] text-pretty text-ink/72">{LEAD}</p>

      <section className="flex-none rounded-[10px] border border-ink/10 bg-white p-[18px_20px]">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          {data.SEGS.map((seg) => {
            const meta = SEGMENT_META[seg.id]
            const n = counts[seg.id]
            const pct = Math.round((n / assessed) * 100)
            const active = seg.id === selected
            return (
              <button
                key={seg.id}
                onClick={() => setSelected(seg.id)}
                aria-pressed={active}
                className="cursor-pointer rounded-[9px] bg-white p-[16px_17px] text-left transition-shadow"
                style={{
                  boxShadow: active
                    ? `inset 0 0 0 2px ${seg.color}, 0 1px 3px rgba(20,40,60,.10)`
                    : 'inset 0 0 0 1px rgba(20,40,60,.14)',
                }}
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-[5px] size-[9px] flex-none rounded-full" style={{ background: seg.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] leading-[1.3] font-bold text-ink">{seg.name}</div>
                    <div className="eyebrow mt-1.5 text-[9.5px] tracking-normal text-ink/45">{meta.rule}</div>
                  </div>
                  <div className="flex-none text-right">
                    <div className="font-sans text-2xl leading-none font-black tabular-nums text-ink">{n}</div>
                    <div className="eyebrow mt-[5px] text-[9.5px] tracking-normal text-ink/45">{pct}%</div>
                  </div>
                </div>
                <div className="mt-[13px] h-[5px] overflow-hidden rounded-[3px] bg-line">
                  <div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: seg.color }} />
                </div>
                <div className="mt-3 flex items-center gap-[9px]">
                  <span className="eyebrow text-[8.5px] tracking-[.12em]" style={{ color: seg.color }}>
                    {meta.tone}
                  </span>
                  <span className="flex-1 text-right text-[11px] leading-[1.4] text-ink/58">{meta.action}</span>
                </div>
              </button>
            )
          })}
        </div>
        <p className="mt-3.5 text-[11.5px] leading-[1.5] text-ink/50">
          {Math.round((counts.steady / assessed) * 100)}% sit in Steady Core and need nothing — a system that flags
          everyone is crying wolf. Denominator: {assessed} assessed students.
        </p>
      </section>

      <section className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-white">
        <header className="flex flex-none items-center gap-3 border-b border-ink/8 p-[15px_18px]">
          <h2 className="text-[13px] leading-none font-bold text-ink">{selMeta.name}</h2>
          <span className="eyebrow text-[10.5px] tracking-normal text-ink/45">{rows.length} STUDENTS</span>
          <button
            onClick={exportCsv}
            className="ml-auto cursor-pointer rounded-md border border-ink/18 px-[13px] py-[9px] text-[11.5px] leading-none font-bold text-ink hover:bg-parchment"
          >
            Export CSV
          </button>
        </header>

        <div className="grid flex-none gap-2.5 border-b border-ink/8 bg-cream p-[10px_18px] [grid-template-columns:110px_150px_62px_168px_repeat(6,minmax(0,1fr))_96px]">
          {['STUDENT', 'FACULTY', 'INTAKE', 'ARCHETYPE'].map((h) => (
            <div key={h} className="eyebrow text-[8.5px] tracking-[.1em] text-ink/42">{h}</div>
          ))}
          {/* Dimension keys, not truncated labels — slicing SHORT gives two identical "SE" columns. */}
          {data.T.map((t) => (
            <div key={t} className="eyebrow text-center text-[8.5px] tracking-[.1em] text-ink/42">
              {t.toUpperCase()}
            </div>
          ))}
          <div className="eyebrow text-[8.5px] tracking-[.1em] text-ink/42">CONSENT</div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {rows.map(({ st, r }) => (
            <div
              key={st.id}
              className="grid cursor-pointer items-center gap-2.5 border-b border-ink/6 p-[11px_18px] text-[12px] leading-[1.3] text-ink/70 hover:bg-cream [grid-template-columns:110px_150px_62px_168px_repeat(6,minmax(0,1fr))_96px]"
            >
              <div className="font-bold text-ink">{st.name}</div>
              <div>{st.faculty}</div>
              <div className="font-mono text-[11px] leading-none">{st.intakeYear}</div>
              <div>{r.arch}</div>
              {data.T.map((t) => (
                <div key={t} className="text-center font-mono text-[11.5px] leading-none font-semibold text-ink">
                  {r.sc[t]}
                </div>
              ))}
              <div className="font-mono text-[10px] leading-none text-ink/45">{r.at}</div>
            </div>
          ))}
        </div>
      </section>
      </div>
    </>
  )
}
