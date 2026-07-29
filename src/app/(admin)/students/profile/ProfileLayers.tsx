'use client'

import {
  DEPTH_STAGES, LAYER_NOTE, MAG_LEGEND, PLAN_WEEKS,
  type Engagement, type Facet, type ResponseQuality, type TraitView,
} from '@/lib/data/layers.ts'
import type { Dim } from '@/lib/data/generator.ts'

/**
 * A section heading, in the serif at 17px over a hairline rule.
 *
 * The rules are what make the screen readable end to end — without them the
 * profile is one unbroken column and the eye has nothing to catch on. They are
 * part of the heading rather than a separate element so a section can never be
 * rendered without its own divider.
 */
export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-[34px] mb-1 border-t border-ink/10 pt-[22px] font-display text-[17px] leading-[1.3] font-semibold text-ink">
      {children}
    </h2>
  )
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[13.5px] leading-[1.7] text-pretty text-ink/70">{children}</p>
}

/**
 * One dimension: score on the report's 1–7 scale, its HIGH/MEDIUM/LOW chip, and
 * a bar carrying two ticks — the cohort mean in grey and where the dimension
 * lands under pressure in gold or blue. Click to open its six facets below.
 */
export function TraitCard({ t, selected, onPick }: { t: TraitView; selected: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      aria-pressed={selected}
      className="min-w-0 cursor-pointer rounded-[9px] p-[14px_15px] text-left"
      style={{
        background: selected ? '#fff' : '#FAFAF7',
        boxShadow: selected
          ? 'inset 0 0 0 1.5px rgba(20,40,60,.30), 0 2px 6px rgba(20,40,60,.06)'
          : 'inset 0 0 0 1px rgba(20,40,60,.06)',
      }}
    >
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-[11px] leading-[1.3] text-ink/60">{t.label}</span>
        <span className="font-mono text-[8.5px] leading-none font-bold tracking-[.11em]" style={{ color: t.magC }}>
          {t.mag}
        </span>
      </div>

      <div className="mt-2.5 flex items-baseline gap-[5px]">
        <span className="text-[22px] leading-none font-bold tabular-nums text-ink">{t.v7}</span>
        <span className="font-mono text-[10px] leading-none text-ink/38">/ 7</span>
        <span className="ml-auto font-mono text-[10.5px] leading-none font-bold" style={{ color: t.deltaC }}>
          {t.delta}
        </span>
      </div>

      <div className="relative mt-3 h-2 rounded-[4px] bg-line">
        <div className="absolute inset-y-0 left-0 rounded-[4px] bg-ink opacity-76" style={{ width: `${t.v}%` }} />
        <div className="absolute -top-[3px] -bottom-[3px] w-0.5 bg-ink/30" style={{ left: `${t.uni}%` }} />
        <div className="absolute -top-1 -bottom-1 w-0.5" style={{ background: t.dynC, left: `${t.dynPct}%` }} />
      </div>

      <div
        className="mt-[11px] font-mono text-[8.5px] leading-none font-semibold tracking-[.08em] whitespace-nowrap"
        style={{ color: t.dynC }}
      >
        {t.dynLabel}
      </div>
    </button>
  )
}

export function BlueprintLegend() {
  return (
    <div className="mt-[13px] flex flex-wrap gap-[18px]">
      {[
        { swatch: <span className="h-1.5 w-3.5 rounded-[3px] bg-ink opacity-76" />, label: 'NATURAL PATTERN (HEALTHY)' },
        { swatch: <span className="h-3 w-0.5 bg-gold" />, label: 'DYNAMIC RANGE UNDER PRESSURE' },
        { swatch: <span className="h-3 w-0.5 bg-ink/30" />, label: 'COHORT MEAN' },
      ].map((l) => (
        <span key={l.label} className="flex items-center gap-[7px]">
          {l.swatch}
          <span className="font-mono text-[9px] leading-none tracking-[.06em] text-ink/50">{l.label}</span>
        </span>
      ))}
    </div>
  )
}

/**
 * Where the facet names and the item bank do not yet describe the same thing.
 *
 * The names are the report's taxonomy; the scores under them come from this
 * platform's 36 items, and on these four dimensions the two were written against
 * different constructs. The design does not mention it, but a band is a claim
 * about a named person, and a reader is entitled to know which of these claims
 * the instrument can currently support.
 * See docs/report-gap-analysis.md §1.3.
 */
const UNMAPPED: Partial<Record<Dim, string>> = {
  e: 'The report reads Egocentricity as agency — persistence, authority, taking charge. This platform’s six items read it as grievance: keeping score, letting a slight go, sitting with criticism.',
  c: 'No item in the bank asks about persuasion, so Inspiring & Influencing is carried by items about ambiguity and pattern-finding.',
  sa: 'No item asks about ethics or formal reasoning; those two facets ride on the rest of the dimension.',
  sp: 'The bank is deliberately secular. Faith & Higher Power and Meaning, Existence & Afterlife have no item behind them.',
}

/** The selected dimension opened out: six facets strongest first, then the blind spot. */
export function FacetPanel({
  fdim, dim, assessedN,
}: {
  fdim: {
    label: string; desc: string; v7: string; mag: string; magC: string
    spread: string; facets: Facet[]; blindSpot: string
  }
  dim: Dim
  assessedN: number
}) {
  return (
    <>
      <div className="mt-[34px] flex flex-wrap items-baseline gap-3 border-t border-ink/10 pt-[22px]">
        <h2 className="font-display text-[17px] leading-[1.3] font-semibold text-ink">{fdim.label}</h2>
        <span className="font-mono text-[8.5px] leading-none font-bold tracking-[.11em]" style={{ color: fdim.magC }}>
          {fdim.mag}
        </span>
        <span className="text-[15px] leading-none font-bold tabular-nums text-ink">{fdim.v7}</span>
        <span className="font-mono text-[9.5px] leading-none text-ink/38">/ 7</span>
        <span className="ml-auto font-mono text-[9.5px] leading-none tracking-[.06em] text-ink/38">{fdim.spread}</span>
      </div>

      <p className="mt-1.5 text-[13.5px] leading-[1.7] text-ink/70">{fdim.desc} Six facets, strongest first.</p>

      <div className="mt-4 flex flex-col rounded-[9px] bg-cream py-[5px]">
        {fdim.facets.map((f) => (
          <div key={f.name} className="flex items-center gap-3.5 p-[10px_16px]">
            <span className="min-w-0 flex-1 text-[13px] leading-[1.4] text-ink">{f.name}</span>
            <span className="h-1.5 w-32 flex-none overflow-hidden rounded-[3px] bg-bone">
              <span className="block h-full rounded-[3px]" style={{ width: `${f.s}%`, background: f.bandC }} />
            </span>
            <span
              className="w-[88px] flex-none text-right font-mono text-[8.5px] leading-none font-bold tracking-[.09em]"
              style={{ color: f.bandC }}
            >
              {f.band}
            </span>
            <span className="w-8 flex-none text-right text-[13px] leading-none font-bold tabular-nums text-ink">
              {f.v7}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3.5 rounded-[9px] bg-brass/11 p-[15px_17px]">
        <div className="font-mono text-[8.5px] leading-none font-bold tracking-[.13em] text-[#8A6A1F]">BLIND SPOT</div>
        <p className="mt-2.5 text-[13px] leading-[1.65] text-pretty text-ink/82">{fdim.blindSpot}</p>
      </div>

      {UNMAPPED[dim] ? (
        <p className="mt-3 border-l-2 border-ink/14 pl-3.5 text-[11.5px] leading-[1.65] text-pretty text-ink/55">
          <strong className="font-bold text-ink/75">Names ahead of items.</strong> {UNMAPPED[dim]} These bands are
          provisional until the item bank is written to match the facet names.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-4">
        {MAG_LEGEND.map((m) => (
          <span key={m.t} className="flex items-center gap-1.5">
            <span className="size-[7px] rounded-[2px]" style={{ background: m.c }} />
            <span className="font-mono text-[8.5px] leading-none font-bold tracking-[.09em] text-ink/62">{m.t}</span>
            <span className="font-mono text-[8.5px] leading-none text-ink/38">{m.r}</span>
          </span>
        ))}
      </div>

      <p className="mt-[11px] text-[11px] leading-[1.65] text-pretty text-ink/48">{LAYER_NOTE}</p>
      <p className="mt-3 text-[11px] leading-[1.6] text-ink/45">
        Change is shown against the previous assessment, on the same 1–7 scale. The grey tick is the university
        mean of {assessedN} assessed students.
      </p>
    </>
  )
}

function Dot({ done }: { done: boolean }) {
  return (
    <span
      className="size-[9px] flex-none rounded-full"
      style={{
        background: done ? '#5E8F80' : 'transparent',
        boxShadow: done ? 'none' : 'inset 0 0 0 1.5px rgba(20,40,60,.20)',
      }}
    />
  )
}

/**
 * What happened after the assessment closed — the part of the story the printed
 * report cannot tell, because it ends at the moment it is printed.
 *
 * Staff see that a DEPTH stage was completed and when. They do not see what was
 * written in it: those prompts are the student's own reflection space, and the
 * consent recorded on this screen covers results, not private writing.
 */
export function ReflectionPanel({ e, name }: { e: Engagement; name: string }) {
  return (
    <div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
      <div className="rounded-[9px] bg-cream p-[16px_18px]">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[8.5px] leading-none font-bold tracking-[.13em] text-ink/45">
            DEPTH REFLECTION
          </span>
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
          Completion state only. What {name} wrote in these prompts is private to {name} and is not readable from
          this screen by any role.
        </p>
      </div>

      <div className="rounded-[9px] bg-cream p-[16px_18px]">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[8.5px] leading-none font-bold tracking-[.13em] text-ink/45">
            30-DAY PLAN · EVIDENCE
          </span>
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
                    <span className="w-[62px] flex-none font-mono text-[8.5px] leading-none font-semibold tracking-[.1em] text-ink/45">
                      WK {w.week} · {w.verb}
                    </span>
                    <span className={`flex-1 text-[11.5px] leading-[1.4] ${done ? 'text-ink/72' : 'text-ink/32'}`}>
                      {w.milestone}
                    </span>
                    <span
                      className={`flex-none font-mono text-[8px] leading-none font-bold tracking-[.1em] ${done ? 'text-sage' : 'text-ink/28'}`}
                    >
                      {done ? 'EVIDENCED' : 'OPEN'}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 border-t border-ink/8 pt-3 text-[11px] leading-[1.6] text-ink/50">
              A milestone counts when evidence is attached, not when it is ticked — the difference between
              intending a change and having made it.
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

/** Whether this profile is worth acting on. Nothing on the printed report answers that. */
export function QualityPanel({ q }: { q: ResponseQuality }) {
  const bad = q.verdict === 'REVIEW'
  return (
    <div className="rounded-[9px] bg-cream p-[16px_18px]">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[8.5px] leading-none font-bold tracking-[.13em] text-ink/45">
          RESPONSE QUALITY
        </span>
        <span
          className="ml-auto rounded-[3px] px-[5px] py-[3px] font-mono text-[8px] leading-none font-bold tracking-[.1em] text-white"
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
        ].map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-3 border-b border-ink/6 py-2 last:border-0">
            <span className="flex-1 text-[12px] text-ink/70">{k}</span>
            <span className="font-mono text-[11px] leading-none font-bold text-ink">{v}</span>
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
  waves: { date: string }[]
}) {
  return (
    <div className="rounded-[9px] bg-cream p-[16px_18px]">
      <div className="font-mono text-[8.5px] leading-none font-bold tracking-[.13em] text-ink/45">
        DISCOVERY REPORT
      </div>
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
        Every generated version is kept, so a conversation can be traced back to the report it was held against.
      </p>
    </div>
  )
}
