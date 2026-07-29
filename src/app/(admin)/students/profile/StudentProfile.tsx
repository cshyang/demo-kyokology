'use client'

import { useMemo, useState } from 'react'
import { useDemoData } from '@/lib/data/demo.ts'
import { latest } from '@/lib/data/derive.ts'
import { extraWaves, profileLayers, waveSeries } from '@/lib/data/layers.ts'
import type { Dim, SegmentId, WaveResult } from '@/lib/data/generator.ts'
import {
  BlueprintLegend, FacetPanel, Heading, Prose, QualityPanel, ReflectionPanel, ReportPanel, TraitCard,
} from './ProfileLayers.tsx'
import { tint, token } from '@/lib/color'

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

const STATUS_TONE: Record<string, string> = {
  completed: token('sage'),
  started: token('gold'),
  opened: token('ink'),
  sent: token('stone'),
  bounced: token('rust'),
}

export function StudentProfile({ id }: { id: string }) {
  const data = useDemoData()
  const st = data.byId[id]

  const [waveIdx, setWaveIdx] = useState<number | null>(null)
  const [sdim, setSdim] = useState(0)
  const [plotSeg, setPlotSeg] = useState<SegmentId>('silent')

  const v = useMemo(() => {
    if (!st) return null
    const series = waveSeries(data, st, extraWaves(data))
    if (!series.length) return null

    const idx = Math.min(series.length - 1, waveIdx ?? series.length - 1)
    const L = profileLayers(data, st, series, idx, sdim, data.campaigns)

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

    return { series, idx, axes, rule, cloud, ...L }
  }, [data, st, waveIdx, sdim, plotSeg])

  if (!st || !v) {
    return <div className="p-8 text-[13px] text-ink/60">No assessed student with id {id}.</div>
  }

  const insideCount = v.cloud.filter((p) => p.inside).length

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-[#FCFCFA]">
      <div className="mx-auto flex w-full max-w-[920px] flex-col px-[26px] pt-[34px] pb-[44px]">
        <div className="flex flex-wrap items-baseline gap-3.5">
          <h1 className="font-display text-[30px] leading-[1.15] font-semibold tracking-[-.01em] text-ink">
            {v.cur.arch}
          </h1>
          <span className="font-mono text-[10.5px] leading-none font-medium tracking-[.1em] text-ink/45">
            ASSESSMENT {v.cur.n} OF {v.cur.total} · {v.cur.date.toUpperCase()}
          </span>
        </div>
        <p className="mt-4 text-[15px] leading-[1.75] text-pretty text-ink/78">{v.lead}</p>
        <p className="mt-3 font-mono text-[10.5px] leading-[1.6] text-ink/42">
          {v.consentLine} · {v.consentNote}
        </p>

        <Heading>The story so far</Heading>
        <Prose>
          {v.archMove ||
            'One assessment on record. A re-assessment is needed before any movement can be claimed.'}
        </Prose>
        <div className="mt-4 flex gap-2.5 overflow-x-auto pb-0.5">
          {v.series.map((w, i) => {
            const seg = data.SEGS.find((g) => g.id === w.segId)!
            const sel = i === v.idx
            return (
              <button
                key={i}
                onClick={() => setWaveIdx(i)}
                aria-pressed={sel}
                className="min-w-[186px] flex-1 cursor-pointer rounded-[9px] p-[13px_15px] text-left"
                style={{
                  background: sel ? '#fff' : 'transparent',
                  boxShadow: sel
                    ? `inset 0 0 0 1px ${tint('ink', 16)}, 0 2px 6px ${tint('ink', 6)}`
                    : `inset 0 0 0 1px ${tint('ink', 7)}`,
                }}
              >
                <div className="flex items-center gap-[9px]">
                  <span
                    className="size-2.5 flex-none rounded-full"
                    style={{
                      background: sel ? token('ink') : '#fff',
                      boxShadow: sel ? 'none' : `inset 0 0 0 2px ${tint('ink', 25)}`,
                    }}
                  />
                  <span
                    className="font-mono text-[9.5px] leading-none font-bold tracking-[.13em]"
                    style={{ color: sel ? token('ink') : tint('ink', 55) }}
                  >
                    {w.n === 1 ? 'FIRST' : `ASSESSMENT ${w.n}`}
                  </span>
                  <span className="ml-auto font-mono text-[9.5px] leading-none text-ink/42">
                    {w.date.toUpperCase()}
                  </span>
                </div>
                <div className="mt-2.5 font-display text-[13.5px] leading-[1.3] font-semibold text-ink">{w.arch}</div>
                <div className="mt-[9px] flex items-center gap-2">
                  <span className="size-[7px] flex-none rounded-full" style={{ background: seg.color }} />
                  <span className="text-[11.5px] leading-[1.3] text-ink/60">{seg.name}</span>
                </div>
              </button>
            )
          })}
        </div>

        <Heading>Behavioural blueprint</Heading>
        <Prose>{v.rangeLine}</Prose>
        <Prose>{v.moversLine} Click a dimension to open its six facets.</Prose>
        <div className="mt-[18px] grid grid-cols-3 gap-3">
          {v.traits.map((t, i) => (
            <TraitCard key={t.dim} t={t} selected={i === sdim} onPick={() => setSdim(i)} />
          ))}
        </div>
        <BlueprintLegend />

        <FacetPanel fdim={v.fdim} dim={data.T[sdim]} assessedN={v.assessedN} />

        <Heading>Calibration</Heading>
        <Prose>{v.calibLine}</Prose>
        <div className="mt-4 flex flex-wrap gap-6">
          <div className="min-w-[280px] flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8.5px] leading-none font-bold tracking-[.14em] text-ink/45">
                AGAINST ONE RULE
              </span>
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
            <svg viewBox="0 0 100 100" className="mt-3 aspect-square w-full rounded-[6px] bg-cream">
              {v.cloud.map((p) => (
                <circle
                  key={p.id}
                  className="chart-point"
                  cx={p.x}
                  cy={100 - p.y}
                  r={p.me ? 2.6 : 1.1}
                  style={{
                    fill: p.me ? '#fff' : p.inside ? v.rule.color : tint('ink', 16),
                    stroke: p.me ? token('ink') : 'none',
                  }}
                  strokeWidth={p.me ? 2 : 0}
                />
              ))}
            </svg>
            <div className="flex justify-between pt-1.5 font-mono text-[9px] leading-none text-ink/40">
              <span>{data.LABELS[data.T.indexOf(v.axes.x)]} 0</span>
              <span>100</span>
            </div>
          </div>
          <div className="min-w-[240px] flex-1">
            <p className="text-[12.5px] leading-[1.7] text-pretty text-ink/62">
              One dot per assessed student; {insideCount} of {v.assessedN} sit inside this rule. The ringed dot is{' '}
              {st.name}.
            </p>
            <div className="mt-3.5 flex flex-col gap-[9px]">
              {[
                { c: v.rule.color, ring: false, label: 'Inside the rule' },
                { c: '#D3D1CA', ring: false, label: 'Everyone else assessed' },
                { c: 'transparent', ring: true, label: st.name },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-2 text-[11.5px] leading-[1.4] text-ink/55">
                  <span
                    className="flex-none rounded-full"
                    style={
                      l.ring
                        ? { width: 11, height: 11, border: `2px solid ${token('ink')}` }
                        : { width: 8, height: 8, background: l.c }
                    }
                  />
                  {l.label}
                </span>
              ))}
            </div>
            <p className="mt-3.5 font-mono text-[9px] leading-[1.6] tracking-[.06em] text-ink/38">
              {v.axes.label}
            </p>
          </div>
        </div>

        <Heading>After the assessment</Heading>
        <Prose>
          Completing the instrument is the start of the work, not the end of it. This is how far {st.name} has
          carried it since — and the half of the story the printed report cannot tell, because it ends at the
          moment it is printed.
        </Prose>
        <ReflectionPanel e={v.engagement} name={st.name} />
        <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          <QualityPanel q={v.quality} />
          <ReportPanel
            e={v.engagement}
            name={st.name}
            date={v.cur.date}
            waves={v.series.map((w) => ({ date: w.date }))}
          />
        </div>

        <Heading>What happens next</Heading>
        <Prose>{v.nextLine}</Prose>
        <div className="mt-4 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          <div>
            <div className="font-mono text-[8.5px] leading-none font-bold tracking-[.14em] text-ink/45">
              COMMUNICATION HISTORY
            </div>
            <div className="mt-2.5">
              {v.comms.map((c) => (
                <div key={c.name} className="flex items-baseline gap-3 border-b border-ink/6 py-2.5 last:border-0">
                  <span className="w-[76px] flex-none font-mono text-[10px] text-ink/45">{c.sent}</span>
                  <span className="flex-1 text-[12px] leading-[1.5] text-ink/70">{c.name}</span>
                  <span
                    className="flex-none font-mono text-[8.5px] leading-none font-bold tracking-[.1em]"
                    style={{ color: STATUS_TONE[c.status] ?? token('stone') }}
                  >
                    {c.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="font-mono text-[8.5px] leading-none font-bold tracking-[.14em] text-ink/45">
              CONSENT RECORD
            </div>
            <div className="mt-2.5">
              {v.consentRows.map((c, i) => (
                <div key={i} className="flex items-baseline gap-3 border-b border-ink/6 py-2.5 last:border-0">
                  <span className="w-[76px] flex-none font-mono text-[10px] text-ink/45">{c.date}</span>
                  <span className="flex-1 text-[12px] leading-[1.5] text-ink/70">{c.scope}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
