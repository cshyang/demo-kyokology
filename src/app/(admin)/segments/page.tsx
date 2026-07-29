'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { CohortFilters } from '@/components/CohortFilters'
import { useDemoData, SEGMENT_META, toCsv } from '@/lib/data/demo.ts'
import { selectRecords, type CohortFilter } from '@/lib/data/derive.ts'
import type { SegmentId } from '@/lib/data/generator.ts'

/**
 * The hero screen.
 *
 * Every figure here — counts, percentages, the lead paragraph, the denominator
 * line — derives from the *filtered* record set, not the whole cohort. The three
 * header selects are not decoration: picking "Engineering · 2026 intake" has to
 * move all of it, or the control is a lie that happens to look right by default.
 */
export default function SegmentsPage() {
  const data = useDemoData()
  const router = useRouter()
  const [filter, setFilter] = useState<CohortFilter>({ fac: 'All', yr: 'All', wave: 'latest' })
  const [selected, setSelected] = useState<SegmentId>('silent')

  const recs = useMemo(() => selectRecords(data, filter), [data, filter])

  const { counts, pct, total } = useMemo(() => {
    const counts = {} as Record<SegmentId, number>
    for (const s of data.SEGS) counts[s.id] = 0
    for (const r of recs) counts[r.seg]++
    const denom = recs.length || 1
    const pct = {} as Record<SegmentId, number>
    // The unary + strips trailing zeros exactly as the prototype does: 11.90 → 11.9.
    for (const s of data.SEGS) pct[s.id] = +((counts[s.id] / denom) * 100).toFixed(2)
    return { counts, pct, total: recs.length }
  }, [data, recs])

  const rows = useMemo(() => recs.filter((r) => r.seg === selected), [recs, selected])
  const selName = data.SEGS.find((s) => s.id === selected)!.name

  const flagged = total - counts.steady - counts.unflagged
  const steadyPct = Math.round((counts.steady / (total || 1)) * 100)
  const sumLine = `${data.SEGS.map((s) => counts[s.id]).join(' + ')} = ${total}`
  /**
   * Where the students on screen came from.
   *
   * The design keys this off the wave selector alone, so it kept reading
   * "291 from B + 78 from C" under a filter showing nineteen people. It counts
   * the filtered set instead — same sentence when nothing is filtered, honest
   * when something is.
   */
  const denom = useMemo(() => {
    if (filter.wave === 'w1') return `${recs.length} from Campaign A · Oct 2025`
    if (filter.wave === 'w2') return `${recs.length} from Campaign B · Oct 2026`
    // 'latest' takes w2 first and falls back to w3, so the record's source is
    // whichever of the two that student actually has.
    const fromB = recs.filter((r) => data.w2[r.st.id]).length
    const fromC = recs.length - fromB
    // A filter can empty one side — the 2026 intake has no baseline, so it is all
    // C. "0 from B + 78 from C" is accurate but reads like a bug; drop the term.
    return [fromB && `${fromB} from B`, fromC && `${fromC} from C`].filter(Boolean).join(' + ') || 'nobody'
  }, [data, recs, filter.wave])

  const lead =
    `${flagged} of ${total} assessed students match a flagged pattern — ` +
    `${Math.round((flagged / (total || 1)) * 100)}%, each with a named next step. ` +
    `${counts.steady} (${steadyPct}%) sit in Steady Core and need nothing: ` +
    `a system that flags everyone is crying wolf.`

  function exportCsv() {
    const head = ['Student', 'Faculty', 'Intake', 'Archetype', ...data.SHORT, 'Consent']
    const body = rows.map((r) => [
      r.st.name,
      r.st.faculty,
      String(r.st.intakeYear),
      r.arch,
      ...data.T.map((t) => String(r.sc[t])),
      r.at,
    ])
    const url = URL.createObjectURL(new Blob([toCsv([head, ...body])], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${selected}-segment.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Header
        title="Segments"
        sub="DEPTH · PREDICT — recurring behavioural patterns over each student’s most recent profile."
        filters={<CohortFilters value={filter} onChange={setFilter} />}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-[14px] overflow-auto bg-[#FCFCFA] px-[26px] py-[22px]">
        <p className="max-w-[86ch] px-0.5 pt-0.5 text-[13.5px] leading-[1.7] text-pretty text-ink/72">{lead}</p>

        <section className="flex-none rounded-[10px] border border-ink/10 bg-white px-5 py-[18px]">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[13px] leading-none font-bold text-ink">Actionable patterns</h2>
            <div className="ml-auto font-mono text-[10.5px] leading-none text-ink/45">{sumLine}</div>
          </div>

          {/*
            Six cards, not seven. Unflagged is in the sum line — the arithmetic has
            to close — but it is not a pattern, so it gets no card and no action.
            It remains a selectable roster though: Overview links straight to it.
          */}
          <div className="mt-[15px] grid grid-cols-3 gap-3">
            {data.SEGS.filter((s) => s.id !== 'unflagged').map((seg) => {
              const meta = SEGMENT_META[seg.id]
              const active = seg.id === selected
              return (
                <button
                  key={seg.id}
                  onClick={() => setSelected(seg.id)}
                  aria-pressed={active}
                  className="cursor-pointer rounded-[9px] bg-white px-[17px] py-4 text-left"
                  style={{
                    boxShadow: active
                      ? `inset 0 0 0 2px ${seg.color}`
                      : 'inset 0 0 0 1px rgba(20,40,60,.12)',
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-[5px] size-[9px] flex-none rounded-full" style={{ background: seg.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] leading-[1.3] font-bold text-ink">{seg.name}</div>
                      <div className="rule-mono mt-1.5 text-ink/45">{meta.rule}</div>
                    </div>
                    <div className="flex-none text-right">
                      <div className="text-2xl leading-none font-black tabular-nums text-ink">{counts[seg.id]}</div>
                      <div className="rule-mono mt-[5px] leading-none font-medium text-ink/45">{pct[seg.id]}%</div>
                    </div>
                  </div>
                  <div className="mt-[13px] h-[5px] overflow-hidden rounded-[3px] bg-line">
                    <div className="h-full rounded-[3px]" style={{ width: `${pct[seg.id]}%`, background: seg.color }} />
                  </div>
                  <div className="mt-3 flex items-center gap-[9px]">
                    <span
                      className="font-mono text-[8.5px] leading-none font-semibold tracking-[.12em]"
                      style={{ color: seg.color }}
                    >
                      {meta.tone}
                    </span>
                    <span className="flex-1 text-right text-[11px] leading-[1.4] text-ink/58">{meta.action}</span>
                  </div>
                </button>
              )
            })}
          </div>

          <p className="mt-[14px] text-[11.5px] leading-[1.5] text-ink/50">
            {steadyPct}% sit in Steady Core and need nothing — a system that flags everyone is crying wolf.
            Denominator: {denom}.
          </p>
        </section>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-white">
          <div className="flex flex-none items-center gap-3 border-b border-ink/8 px-[18px] py-[15px]">
            <h2 className="text-[13px] leading-none font-bold text-ink">{selName}</h2>
            <div className="font-mono text-[10.5px] leading-none text-ink/45">{rows.length} STUDENTS</div>
            <button
              onClick={exportCsv}
              className="ml-auto cursor-pointer rounded-md border border-ink/18 px-[13px] py-[9px] text-[11.5px] leading-none font-bold text-ink hover:bg-parchment"
            >
              Export CSV
            </button>
          </div>

          <div className="grid flex-none gap-2.5 border-b border-ink/8 bg-cream px-[18px] py-2.5 font-mono text-[8.5px] leading-none font-semibold tracking-[.1em] text-ink/42 [grid-template-columns:110px_150px_62px_168px_repeat(6,minmax(0,1fr))_96px]">
            <div>STUDENT</div>
            <div>FACULTY</div>
            <div>INTAKE</div>
            <div>ARCHETYPE</div>
            {data.T.map((t) => (
              <div key={t} className="text-center">
                {t.toUpperCase()}
              </div>
            ))}
            <div>CONSENT</div>
          </div>

          {/*
            Keyed on the selection so the roster crossfades when the pattern
            changes. Without it the list swaps under a stationary header and the
            only clue that anything happened is the row count.
          */}
          <div key={selected} className="chart-appear min-h-0 flex-1 overflow-auto">
            {rows.map(({ st, sc, arch, at }) => (
              <div
                key={st.id}
                onClick={() => router.push(`/students/profile?id=${st.id}`)}
                className="grid cursor-pointer items-center gap-2.5 border-b border-ink/6 px-[18px] py-[11px] text-[12px] leading-[1.3] text-ink/70 hover:bg-cream [grid-template-columns:110px_150px_62px_168px_repeat(6,minmax(0,1fr))_96px]"
              >
                <div className="font-bold text-ink">{st.name}</div>
                <div>{st.faculty}</div>
                <div className="font-mono text-[11px] leading-none">{st.intakeYear}</div>
                <div>{arch}</div>
                {data.T.map((t) => (
                  <div key={t} className="text-center font-mono text-[11.5px] leading-none font-semibold text-ink">
                    {sc[t]}
                  </div>
                ))}
                <div className="font-mono text-[10px] leading-none text-ink/45">{at}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
