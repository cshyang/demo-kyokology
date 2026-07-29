'use client'

import { useState } from 'react'
import {
  DEPTH_STAGES, PLAN_WEEKS,
  type Band, type Engagement, type Facet, type ResponseQuality, type WatchOut,
} from '@/lib/data/layers.ts'
import type { Dim, Scores } from '@/lib/data/generator.ts'

/** 1st, 2nd, 3rd, 4th … 21st. Plain `${n}th` prints "32th", which reads as a bug. */
function ordinal(n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

export function BandChip({ band, className = '' }: { band: Band; className?: string }) {
  return (
    <span
      className={`eyebrow rounded-[3px] px-[5px] py-[3px] text-[8px] leading-none tracking-[.1em] text-white ${className}`}
      style={{ background: band.color }}
    >
      {band.label}
    </span>
  )
}

export interface DimView {
  dim: Dim
  label: string
  short: string
  v: number
  pct: number
  facultyPct: number
  band: Band
  facets: Facet[]
}

interface TraitView {
  hasDelta: boolean
  delta: string
  deltaColor: string
  points: string
  lastX: string
  lastY: string
  meanY: string
}

/**
 * One dimension, with its six facets folded away underneath it.
 *
 * The dimension score is printed because six items stand behind it. The facets
 * are not, because one item stands behind each — they get a bar and a band and
 * nothing that implies the instrument can separate two of them by a decimal.
 * See docs/report-gap-analysis.md §1.1.
 */
export function DimensionCard({ d, t }: { d: DimView; t: TraitView }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-[9px] border border-ink/10 bg-white p-[14px_16px]">
      <div className="flex items-baseline gap-2">
        <span className="eyebrow flex-1 text-[9px] tracking-[.12em] text-ink/50">{d.short}</span>
        <span className="text-[17px] leading-none font-bold tabular-nums text-ink">{d.v}</span>
        <span className="font-mono text-[10.5px] leading-none" style={{ color: t.deltaColor }}>
          {t.delta}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <BandChip band={d.band} />
        <span className="font-mono text-[9.5px] leading-none text-ink/45">
          {ordinal(d.pct)} UNI · {ordinal(d.facultyPct)} FACULTY
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
            <div className="h-full rounded-[3px] bg-slate" style={{ width: `${d.v}%` }} />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="eyebrow mt-1 cursor-pointer text-[8.5px] tracking-[.12em] text-teal hover:text-ink"
      >
        {open ? '− HIDE FACETS' : '+ SIX FACETS'}
      </button>

      {open ? (
        <div className="mt-2.5 border-t border-ink/8 pt-2.5">
          {d.facets.map((f) => (
            <div key={f.name} className="flex items-center gap-2 py-[5px]">
              <span className="flex-1 text-[11px] leading-[1.35] text-ink/72">{f.name}</span>
              <div className="h-[5px] w-[52px] flex-none overflow-hidden rounded-[3px] bg-line">
                <div className="h-full rounded-[3px]" style={{ width: `${f.v}%`, background: f.band.color }} />
              </div>
              <BandChip band={f.band} className="w-[62px] flex-none text-center" />
            </div>
          ))}
          <p className="mt-2 text-[10px] leading-[1.55] text-ink/45">
            Banded, not scored — one item each. Two facets in the same band are not separable.
          </p>
        </div>
      ) : null}
    </div>
  )
}

const AXIS = [0, 1, 2, 3, 4, 5].map((i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2
  return { cos: Math.cos(a), sin: Math.sin(a) }
})
const poly = (vals: number[]) =>
  vals.map((v, i) => `${(50 + AXIS[i].cos * (v / 100) * 38).toFixed(1)},${(50 + AXIS[i].sin * (v / 100) * 38).toFixed(1)}`).join(' ')

/**
 * Natural pattern against the same profile under pressure.
 *
 * The dashed shape is not a second measurement — it is the natural one with each
 * dimension pulled toward the student's own centre by how far that dimension is
 * known to travel under load. Which is why it is always the flatter of the two.
 */
export function PressurePanel({
  dims, pressure, swing, T, SHORT,
}: {
  dims: DimView[]
  pressure: Scores
  swing: { dim: Dim; from: number; to: number; d: number }[]
  T: readonly Dim[]
  SHORT: string[]
}) {
  const widest = swing[0]
  const steadiest = swing[swing.length - 1]
  return (
    <div className="mt-3.5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
      <div className="rounded-[9px] border border-ink/10 bg-white p-[16px_18px]">
        <div className="eyebrow text-[8.5px] tracking-[.14em] text-ink/45">NATURAL VS UNDER PRESSURE</div>
        <svg viewBox="0 0 100 100" className="mt-2 aspect-square w-full">
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <polygon key={r} points={poly(T.map(() => r * 100))} fill="none" stroke="rgba(20,40,60,.10)" strokeWidth={0.5} />
          ))}
          {AXIS.map((a, i) => (
            <line key={i} x1={50} y1={50} x2={50 + a.cos * 38} y2={50 + a.sin * 38} stroke="rgba(20,40,60,.10)" strokeWidth={0.5} />
          ))}
          <polygon points={poly(dims.map((d) => d.v))} fill="rgba(201,162,75,.20)" stroke="#C9A24B" strokeWidth={1.6} />
          <polygon points={poly(T.map((t) => pressure[t]))} fill="none" stroke="#2F4A63" strokeWidth={1.4} strokeDasharray="3 2.5" />
          {AXIS.map((a, i) => (
            <text
              key={i}
              x={50 + a.cos * 46}
              y={50 + a.sin * 46}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-ink/45 font-mono"
              style={{ fontSize: 4 }}
            >
              {SHORT[i]}
            </text>
          ))}
        </svg>
        <div className="mt-2 flex flex-wrap gap-3.5 text-[10.5px] text-ink/60">
          <span className="flex items-center gap-1.5">
            <span className="h-[3px] w-4 rounded-full bg-brass" /> Natural pattern
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-[2px] border-dashed border-slate" /> Under pressure
          </span>
        </div>
      </div>

      <div className="rounded-[9px] border border-ink/10 bg-white p-[16px_18px]">
        <div className="eyebrow text-[8.5px] tracking-[.14em] text-ink/45">HOW FAR EACH ONE TRAVELS</div>
        <div className="mt-3 flex flex-col gap-2">
          {swing.map((s) => {
            const i = T.indexOf(s.dim)
            const w = Math.min(Math.abs(s.d) / 14, 1) * 44
            return (
              <div key={s.dim} className="flex items-center gap-2.5">
                <span className="eyebrow w-[74px] flex-none text-[9px] tracking-[.1em] text-ink/55">{SHORT[i]}</span>
                <div className="relative h-2 flex-1 rounded-[4px] bg-parchment">
                  <div
                    className="absolute inset-y-0 rounded-[4px]"
                    style={{
                      width: `${w}%`,
                      left: s.d >= 0 ? '50%' : `${50 - w}%`,
                      background: s.d >= 0 ? '#5E8F80' : '#A6503F',
                    }}
                  />
                  <div className="absolute inset-y-[-2px] left-1/2 w-px bg-ink/20" />
                </div>
                <span className="w-8 flex-none text-right font-mono text-[10.5px] leading-none font-bold text-ink/70">
                  {s.d > 0 ? '+' : ''}{s.d}
                </span>
              </div>
            )
          })}
        </div>
        <p className="mt-3.5 border-t border-ink/8 pt-3 text-[11.5px] leading-[1.6] text-ink/60">
          {SHORT[T.indexOf(widest.dim)]} moves furthest — {widest.d > 0 ? 'up' : 'down'} {Math.abs(widest.d)} points
          — while {SHORT[T.indexOf(steadiest.dim)]} holds within {Math.abs(steadiest.d)}. The pressure shape is
          flatter than the natural one because the tall signals compress and the quiet ones reach up. That
          flattening is the thing to plan around, not any single number in it.
        </p>
      </div>
    </div>
  )
}

const WATCH_TONE: Record<WatchOut['kind'], { label: string; color: string }> = {
  spread: { label: 'SPREAD', color: '#B98B3C' },
  pressure: { label: 'UNDER PRESSURE', color: '#2F4A63' },
  movement: { label: 'MEASURED MOVEMENT', color: '#5E8F80' },
}

/**
 * The report prints a "Blind spot" under every dimension whether or not there is
 * one. These only appear when a rule fires, and the empty state says so rather
 * than reaching for copy.
 */
export function WatchOuts({ items, name }: { items: WatchOut[]; name: string }) {
  if (!items.length) {
    return (
      <p className="mt-2.5 max-w-[68ch] text-[13px] leading-[1.7] text-ink/70">
        No rule fired on {name}&rsquo;s profile — the dimensions sit close enough together, move little enough
        under pressure, and have shifted little enough between assessments that there is nothing here worth
        flagging. An empty panel is a result.
      </p>
    )
  }
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {items.map((w) => (
        <div
          key={w.title}
          className="rounded-[9px] border border-ink/10 bg-white p-[14px_16px]"
          style={{ borderLeft: `3px solid ${WATCH_TONE[w.kind].color}` }}
        >
          <div className="eyebrow text-[8px] tracking-[.14em]" style={{ color: WATCH_TONE[w.kind].color }}>
            {WATCH_TONE[w.kind].label}
          </div>
          <div className="mt-1.5 text-[13px] leading-[1.4] font-bold text-ink">{w.title}</div>
          <p className="mt-1.5 max-w-[68ch] text-[12px] leading-[1.65] text-ink/68">{w.body}</p>
        </div>
      ))}
      <p className="text-[11px] leading-[1.6] text-ink/45">
        Each of these is keyed to something measured — a percentile spread, a pressure swing, a change between
        two sittings. They describe tendencies in a situation, not fixed traits, and none of them is a diagnosis.
      </p>
    </div>
  )
}

function Dot({ done }: { done: boolean }) {
  return (
    <span
      className="size-[9px] flex-none rounded-full"
      style={{ background: done ? '#5E8F80' : 'transparent', boxShadow: done ? 'none' : 'inset 0 0 0 1.5px rgba(20,40,60,.20)' }}
    />
  )
}

/**
 * What happened after the assessment closed.
 *
 * Staff see that a stage was completed and when. They do not see what was
 * written in it — the DEPTH prompts are the student's own reflection space, and
 * the consent line at the top of this screen covers results, not private
 * writing. See docs/report-gap-analysis.md §5.
 */
export function ReflectionPanel({ e, name }: { e: Engagement; name: string }) {
  return (
    <div className="mt-3.5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
      <div className="rounded-[9px] border border-ink/10 bg-white p-[16px_18px]">
        <div className="flex items-baseline gap-2">
          <span className="eyebrow text-[8.5px] tracking-[.14em] text-ink/45">DEPTH REFLECTION</span>
          <span className="ml-auto font-mono text-[11px] leading-none font-bold text-ink">{e.depthDone} / 5</span>
        </div>
        <div className="mt-3 flex flex-col">
          {DEPTH_STAGES.map((s, i) => {
            const done = i < e.depthDone
            return (
              <div key={s.key} className="flex items-baseline gap-2.5 border-b border-ink/6 py-2 last:border-0">
                <Dot done={done} />
                <span className={`w-[74px] flex-none text-[11.5px] leading-[1.3] font-bold ${done ? 'text-ink' : 'text-ink/35'}`}>
                  {s.name}
                </span>
                <span className={`flex-1 text-[11px] leading-[1.4] ${done ? 'text-ink/60' : 'text-ink/32'}`}>{s.q}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-3 border-t border-ink/8 pt-3 text-[11px] leading-[1.6] text-ink/50">
          Completion state only. What {name} wrote in these prompts is private to {name} and is not readable
          from this screen by any role.
        </p>
      </div>

      <div className="rounded-[9px] border border-ink/10 bg-white p-[16px_18px]">
        <div className="flex items-baseline gap-2">
          <span className="eyebrow text-[8.5px] tracking-[.14em] text-ink/45">30-DAY PLAN · EVIDENCE</span>
          <span className="ml-auto font-mono text-[11px] leading-none font-bold text-ink">{e.evidenced} / 4</span>
        </div>
        {e.planStarted ? (
          <>
            <div className="mt-3 flex flex-col">
              {PLAN_WEEKS.map((w, i) => {
                const done = i < e.evidenced
                return (
                  <div key={w.week} className="flex items-baseline gap-2.5 border-b border-ink/6 py-2 last:border-0">
                    <Dot done={done} />
                    <span className="eyebrow w-[60px] flex-none text-[8.5px] tracking-[.1em] text-ink/45">
                      WK {w.week} · {w.verb}
                    </span>
                    <span className={`flex-1 text-[11.5px] leading-[1.4] ${done ? 'text-ink/72' : 'text-ink/32'}`}>
                      {w.milestone}
                    </span>
                    <span className={`eyebrow flex-none text-[8px] tracking-[.1em] ${done ? 'text-sage' : 'text-ink/28'}`}>
                      {done ? 'EVIDENCED' : 'OPEN'}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 border-t border-ink/8 pt-3 text-[11px] leading-[1.6] text-ink/50">
              A milestone counts when evidence is attached, not when it is ticked — the difference between
              intending a change and having done it.
            </p>
          </>
        ) : (
          <p className="mt-3 text-[12px] leading-[1.65] text-ink/60">
            {e.reportOpened
              ? `${name} opened the report but has not started the plan. The plan unlocks after three DEPTH stages — currently ${e.depthDone}.`
              : `${name} has not opened the report yet, so nothing downstream of it has started.`}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Whether this profile is worth acting on — the question nothing on the printed
 * report answers. A straight-lined sitting draws the same confident bars as a
 * considered one.
 */
export function QualityPanel({ q }: { q: ResponseQuality }) {
  const bad = q.verdict === 'REVIEW'
  return (
    <div className="rounded-[9px] border border-ink/10 bg-white p-[16px_18px]">
      <div className="flex items-baseline gap-2">
        <span className="eyebrow text-[8.5px] tracking-[.14em] text-ink/45">RESPONSE QUALITY</span>
        <span
          className="eyebrow ml-auto rounded-[3px] px-[5px] py-[3px] text-[8px] leading-none tracking-[.1em] text-white"
          style={{ background: bad ? '#A6503F' : '#5E8F80' }}
        >
          {q.verdict}
        </span>
      </div>
      <div className="mt-3 flex flex-col">
        {[
          ['Time taken', `${q.minutes} min`],
          ['Longest identical run', `${q.longestRun} of 36`],
          ['Items skipped', String(q.skipped)],
        ].map(([k, val]) => (
          <div key={k} className="flex items-baseline gap-3 border-b border-ink/6 py-2 last:border-0">
            <span className="flex-1 text-[12px] text-ink/70">{k}</span>
            <span className="font-mono text-[11px] leading-none font-bold text-ink">{val}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-[1.6] text-ink/55">{q.note}</p>
    </div>
  )
}

/** The printed report as an artefact of the record, rather than a thing that happens elsewhere. */
export function ReportPanel({
  e, name, date, waves,
}: {
  e: Engagement
  name: string
  date: string
  waves: { n: string; date: string }[]
}) {
  return (
    <div className="rounded-[9px] border border-ink/10 bg-white p-[16px_18px]">
      <div className="eyebrow text-[8.5px] tracking-[.14em] text-ink/45">DISCOVERY REPORT</div>
      <div className="mt-2.5">
        {waves.map((w, i) => (
          <div key={i} className="flex items-baseline gap-3 border-b border-ink/6 py-2.5">
            <span className="w-[86px] flex-none font-mono text-[10px] text-ink/45">{w.date}</span>
            <span className="flex-1 text-[12px] text-ink/70">Report generated · v{i + 1}</span>
          </div>
        ))}
        <div className="flex items-baseline gap-3 py-2.5">
          <span className="w-[86px] flex-none font-mono text-[10px] text-ink/45">{e.reportOpened ? date : '—'}</span>
          <span className={`flex-1 text-[12px] ${e.reportOpened ? 'text-ink/70' : 'text-ink/40'}`}>
            {e.reportOpened ? `Opened by ${name}` : 'Not opened yet'}
          </span>
        </div>
      </div>
      <p className="mt-1 border-t border-ink/8 pt-3 text-[11px] leading-[1.6] text-ink/50">
        Shared with {name} and with staff holding a support role. Every generated version is kept, so a
        conversation can be traced back to the report it was held against.
      </p>
    </div>
  )
}
