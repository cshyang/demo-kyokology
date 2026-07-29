'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useDemoData } from '@/lib/data/demo.ts'
import { dimMeans, latest } from '@/lib/data/derive.ts'
import type { Dim, SegmentId, WaveResult } from '@/lib/data/generator.ts'

/** The two dimensions each rule actually constrains — the axes worth plotting. */
const RULE_AXES: Record<SegmentId, { x: Dim; y: Dim; label: string }> = {
  silent: { x: 'so', y: 'se', label: 'SO < 35 · SE > 65' },
  driven: { x: 'sa', y: 'e', label: 'SA > 80 · E < 40' },
  explorer: { x: 'c', y: 'se', label: 'C > 80 · SE < 35' },
  fragile: { x: 'se', y: 'c', label: 'SE < 35 · C < 40' },
  adrift: { x: 'sp', y: 'sa', label: 'SP < 30 · SA < 45' },
  steady: { x: 'sa', y: 'se', label: 'ALL SIX 35–70' },
  unflagged: { x: 'sa', y: 'se', label: 'NO RULE' },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="eyebrow text-[9px] tracking-[.16em] text-ink/45">{title}</h2>
      {children}
    </section>
  )
}

export function StudentProfile({ id }: { id: string }) {
  const data = useDemoData()
  const [plotSeg, setPlotSeg] = useState<SegmentId>('silent')

  const st = data.byId[id]
  const [waveIdx, setWaveIdx] = useState<number | null>(null)

  const v = useMemo(() => {
    if (!st) return null
    const waves: { n: string; date: string; rec: WaveResult }[] = []
    if (data.w1[st.id]) waves.push({ n: 'FIRST ASSESSMENT', date: data.w1[st.id].at, rec: data.w1[st.id] })
    if (data.w2[st.id]) waves.push({ n: 'RE-ASSESSMENT', date: data.w2[st.id].at, rec: data.w2[st.id] })
    if (data.w3[st.id]) waves.push({ n: 'FIRST ASSESSMENT', date: data.w3[st.id].at, rec: data.w3[st.id] })

    const idx = waveIdx ?? waves.length - 1
    const cur = waves[idx]
    const prev = idx > 0 ? waves[idx - 1] : null
    const uniMeans = dimMeans(data, (s) => latest(data, s.id))
    const assessedN = Object.keys(data.w2).length + Object.keys(data.w3).length

    const traits = data.T.map((t, i) => {
      const value = cur?.rec.sc[t] ?? 0
      const series = waves.map((w) => w.rec.sc[t])
      const d = prev ? value - prev.rec.sc[t] : null
      // Sparkline across every wave this student has, in a 0..100 -> 40px box.
      const pts = series.map((sv, k) => {
        const x = series.length === 1 ? 50 : (k / (series.length - 1)) * 100
        return `${x.toFixed(1)},${(38 - (sv / 100) * 36).toFixed(1)}`
      })
      return {
        key: t,
        label: data.SHORT[i],
        v: value,
        delta: d === null ? '' : `${d > 0 ? '+' : ''}${d}`,
        deltaColor: d === null ? 'rgba(20,40,60,.4)' : d > 0 ? '#5E8F80' : d < 0 ? '#A6503F' : 'rgba(20,40,60,.4)',
        hasDelta: series.length > 1,
        points: pts.join(' '),
        lastX: pts.length ? pts[pts.length - 1].split(',')[0] : '50',
        lastY: pts.length ? pts[pts.length - 1].split(',')[1] : '20',
        meanY: (38 - (uniMeans[i] / 100) * 36).toFixed(1),
      }
    })

    const seg = cur ? data.SEGS.find((g) => g.id === cur.rec.seg)! : null
    const axes = RULE_AXES[plotSeg]
    const rule = data.SEGS.find((g) => g.id === plotSeg)!
    const cloud = data.students
      .map((s) => ({ s, r: latest(data, s.id) }))
      .filter((o): o is { s: typeof st; r: WaveResult } => !!o.r)
      .map((o) => ({
        id: o.s.id,
        x: o.r.sc[axes.x],
        y: o.r.sc[axes.y],
        inside: rule.test(o.r.sc, o.s),
        me: o.s.id === st.id,
      }))

    return { waves, idx, cur, prev, traits, seg, assessedN, axes, cloud, uniMeans }
  }, [data, st, waveIdx, plotSeg])

  if (!st || !v || !v.cur) {
    return <div className="p-8 text-[13px] text-ink/60">No assessed student with id {id}.</div>
  }

  const archNote = data.ARCHNOTE[v.cur.rec.arch] ?? ''
  const insideCount = v.cloud.filter((p) => p.inside).length

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[#FCFCFA]">
      <div className="mx-auto max-w-[860px] px-[26px] pt-[34px] pb-[44px]">
        <div className="mt-4 flex items-baseline gap-3">
          <h1 className="font-display text-[27px] leading-[1.15] font-semibold tracking-[-.01em] text-ink">
            {v.cur.rec.arch}
          </h1>
          <span className="eyebrow text-[10px] tracking-[.1em] text-ink/45">
            {v.cur.n} · {v.cur.date}
          </span>
        </div>
        <p className="mt-3 max-w-[68ch] text-[13.5px] leading-[1.7] text-pretty text-ink/72">
          {st.name} · {st.faculty} · {st.intakeYear} intake. {archNote}
        </p>
        <p className="mt-2.5 font-mono text-[10.5px] leading-[1.6] text-ink/45">
          SHARED WITH YOUR INSTITUTION · {v.cur.rec.at} · results visible to staff with a support role
        </p>

        <Section title="THE STORY SO FAR">
          <p className="mt-2.5 max-w-[68ch] text-[13px] leading-[1.7] text-ink/70">
            {v.waves.length > 1
              ? `Assessed ${v.waves.length} times. Archetype ${data.w1[st.id]?.arch === data.w2[st.id]?.arch ? 'held steady' : 'moved'} between assessments — labels only change when the second dimension leads the third by 8 points or more.`
              : 'Assessed once. A re-assessment is needed before any movement can be claimed.'}
          </p>
          <div className="mt-3.5 flex flex-wrap gap-3">
            {v.waves.map((w, i) => {
              const seg = data.SEGS.find((g) => g.id === w.rec.seg)!
              const active = i === v.idx
              return (
                <button
                  key={i}
                  onClick={() => setWaveIdx(i)}
                  className="cursor-pointer rounded-[9px] border bg-white p-[14px_16px] text-left"
                  style={{ borderColor: active ? 'rgba(20,40,60,.45)' : 'rgba(20,40,60,.14)' }}
                >
                  <div className="eyebrow text-[8.5px] tracking-[.12em] text-ink/45">
                    {w.n} · {w.date}
                  </div>
                  <div className="mt-2 text-[13px] leading-none font-bold text-ink">{w.rec.arch}</div>
                  <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-ink/60">
                    <span className="size-2 flex-none rounded-full" style={{ background: seg.color }} />
                    {seg.name}
                  </div>
                </button>
              )
            })}
          </div>
        </Section>

        <Section title="THE SIX DIMENSIONS">
          <div className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {v.traits.map((t) => (
              <div key={t.key} className="rounded-[9px] border border-ink/10 bg-white p-[14px_16px]">
                <div className="flex items-baseline gap-2">
                  <span className="eyebrow flex-1 text-[9px] tracking-[.12em] text-ink/50">{t.label}</span>
                  <span className="text-[17px] leading-none font-bold tabular-nums text-ink">{t.v}</span>
                  <span className="font-mono text-[10.5px] leading-none" style={{ color: t.deltaColor }}>
                    {t.delta}
                  </span>
                </div>
                {t.hasDelta ? (
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-2.5 h-9 w-full">
                    <line x1="0" x2="100" y1={t.meanY} y2={t.meanY} stroke="rgba(20,40,60,.18)" strokeWidth={1} strokeDasharray="3 3" />
                    <polyline points={t.points} fill="none" stroke="#14283C" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.8} />
                    <circle cx={t.lastX} cy={t.lastY} r={3.2} fill="#fff" stroke="#14283C" strokeWidth={2} />
                  </svg>
                ) : (
                  <div className="mt-2.5 h-9">
                    <div className="mt-3 h-[6px] overflow-hidden rounded-[3px] bg-line">
                      <div className="h-full rounded-[3px] bg-slate" style={{ width: `${t.v}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] leading-[1.6] text-ink/50">
            Change is against the previous assessment; the dashed line is the university mean of {v.assessedN} assessed
            students.
          </p>
        </Section>

        <Section title="CALIBRATION">
          <p className="mt-2.5 max-w-[68ch] text-[13px] leading-[1.7] text-ink/70">
            A segment is a rule, not a verdict. Plotting everyone against the two dimensions a rule constrains shows
            how close to the boundary any individual sits.
          </p>
          <div className="mt-3.5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            <div className="rounded-[9px] border border-ink/10 bg-white p-[16px_18px]">
              <div className="flex items-center gap-2">
                <span className="eyebrow text-[8.5px] tracking-[.14em] text-ink/45">AGAINST ONE RULE</span>
                <select
                  className="ml-auto rounded-md border border-ink/16 bg-white px-2 py-1.5 text-[11.5px] font-bold text-ink"
                  value={plotSeg}
                  onChange={(e) => setPlotSeg(e.target.value as SegmentId)}
                >
                  {data.SEGS.filter((g) => g.id !== 'unflagged').map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <svg viewBox="0 0 100 100" className="mt-3.5 aspect-square w-full rounded-[6px] bg-cream">
                {v.cloud.map((p) => (
                  <circle
                    key={p.id}
                    cx={p.x}
                    cy={100 - p.y}
                    r={p.me ? 2.6 : 1.1}
                    fill={p.me ? '#14283C' : p.inside ? data.SEGS.find((g) => g.id === plotSeg)!.color : 'rgba(20,40,60,.16)'}
                    stroke={p.me ? '#fff' : 'none'}
                    strokeWidth={p.me ? 1 : 0}
                  />
                ))}
              </svg>
              <div className="mt-2 flex justify-between font-mono text-[9px] text-ink/45">
                <span>X · {v.axes.x.toUpperCase()} 0</span>
                <span>100</span>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <p className="text-[12.5px] leading-[1.7] text-ink/70">
                {insideCount} of {v.assessedN} assessed students sit inside this rule.{' '}
                {v.cloud.find((p) => p.me)?.inside
                  ? `${st.name} is one of them.`
                  : `${st.name} is not — and the plot shows by how much.`}
              </p>
              <div className="flex flex-col gap-2 text-[11.5px] text-ink/60">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: data.SEGS.find((g) => g.id === plotSeg)!.color }} />
                  Inside the rule
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-ink/16" />
                  Everyone else assessed
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-ink" />
                  {st.name}
                </span>
              </div>
              <div className="eyebrow text-[9px] tracking-[.1em] text-ink/40">
                Y · {v.axes.y.toUpperCase()} · RULE {v.axes.label}
              </div>
            </div>
          </div>
        </Section>

        <Section title="WHAT HAPPENS NEXT">
          <p className="mt-2.5 max-w-[68ch] text-[13px] leading-[1.7] text-ink/70">
            {v.seg && v.seg.id !== 'steady' && v.seg.id !== 'unflagged'
              ? `${st.name} currently matches ${v.seg.name}. The attached action is the intervention the university runs — the platform flags, staff decide.`
              : 'No action is attached. Most students need nothing, and saying so is what makes the flagged cards credible.'}
          </p>
        </Section>

        <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          <div className="rounded-[9px] border border-ink/10 bg-white p-[16px_18px]">
            <div className="eyebrow text-[8.5px] tracking-[.14em] text-ink/45">COMMUNICATION HISTORY</div>
            <div className="mt-2.5">
              {[
                { date: v.waves[0]?.date ?? '—', what: 'Invitation sent' },
                { date: v.waves[0]?.date ?? '—', what: 'Invitation opened' },
                { date: v.cur.date, what: 'Assessment completed' },
              ].map((c, i) => (
                <div key={i} className="flex items-baseline gap-3 border-b border-ink/6 py-2.5 last:border-0">
                  <span className="w-[86px] flex-none font-mono text-[10px] text-ink/45">{c.date}</span>
                  <span className="text-[12px] text-ink/70">{c.what}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[9px] border border-ink/10 bg-white p-[16px_18px]">
            <div className="eyebrow text-[8.5px] tracking-[.14em] text-ink/45">CONSENT RECORD</div>
            <div className="mt-2.5">
              {v.waves.map((w, i) => (
                <div key={i} className="flex items-baseline gap-3 border-b border-ink/6 py-2.5 last:border-0">
                  <span className="w-[86px] flex-none font-mono text-[10px] text-ink/45">{w.date}</span>
                  <span className="text-[12px] text-ink/70">Results shared with the institution</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[9px] border border-ink/10 bg-white p-[16px_18px]">
          <div className="eyebrow text-[8.5px] tracking-[.14em] text-ink/45">CAMPAIGN HISTORY</div>
          <div className="mt-2.5">
            {data.campaigns
              .filter((c) => st[c.key])
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/campaigns/${c.id}`}
                  className="flex items-baseline gap-3 border-b border-ink/6 py-2.5 last:border-0 hover:bg-cream"
                >
                  <span className="flex-1 text-[12px] font-bold text-ink">{c.name}</span>
                  <span className="font-mono text-[10px] text-ink/45">{c.sentLabel}</span>
                  <span className="eyebrow w-[80px] text-right text-[9px] tracking-[.1em] text-ink/55">
                    {st[c.key]!.toUpperCase()}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
