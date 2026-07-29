'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header, HeaderButton } from '@/components/Header'
import { useDemoData } from '@/lib/data/demo.ts'
import {
  campaignFunnel, checkpoints, dimMeans, movers, segmentTally, waffleCells, wafflePath,
} from '@/lib/data/derive.ts'

const ACTIVITY = [
  { when: '28 OCT 2026', lead: '96 invites unanswered after 5 days', rest: ' · reminder rule fired · Oct 2026 mid-flight', href: '/campaigns/C' },
  { when: '21 OCT 2026', lead: 'Oct 2026 mid-flight campaign sent', rest: ' · 280 invites · 2026 intake', href: '/campaigns/C' },
  { when: '19 OCT 2026', lead: 'Oct 2026 retest closed', rest: ' · 291 of 560 completed', href: '/campaigns/B' },
  { when: '6 OCT 2026', lead: 'Oct 2026 re-assessment scored', rest: ' · archetype churn 0.3% against the 8% ceiling', href: '/longitudinal' },
]

function Panel({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-[10px] border border-ink/10 bg-white p-[18px_20px] ${className}`}>{children}</section>
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13px] leading-none font-bold text-ink">{children}</h2>
}

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[11px] leading-none font-bold text-teal hover:underline">
      {children}
    </Link>
  )
}

export default function OverviewPage() {
  const data = useDemoData()
  const router = useRouter()
  /** Which waffle category the pointer is over, so the rest can fall back. */
  const [hoverCat, setHoverCat] = useState<number | null>(null)

  const v = useMemo(() => {
    const tally = segmentTally(data)
    const assessed = Object.values(tally).reduce((a, b) => a + b, 0)
    const flagged = assessed - tally.steady - tally.unflagged
    const onRecord = data.students.length

    const funnels = data.campaigns.map((c) => ({ c, f: campaignFunnel(c) }))
    const sent = funnels.reduce((a, x) => a + x.f.sent, 0)
    const completed = funnels.reduce((a, x) => a + x.f.completed, 0)
    const live = funnels.filter((x) => x.c.status !== 'COMPLETE')
    const worst = live.slice().sort((a, b) => a.f.completed / a.f.sent - b.f.completed / b.f.sent)[0]

    // 2026 intake at entry vs earlier intakes at *their* first assessment — like for like.
    const c26 = data.students.filter((st) => st.intakeYear === 2026 && data.w3[st.id])
    const pri = data.students.filter((st) => st.intakeYear !== 2026 && data.w1[st.id])
    const mean = (list: typeof c26, pick: (id: string) => { sc: Record<'se', number> }) =>
      list.length ? list.reduce((a, st) => a + pick(st.id).sc.se, 0) / list.length : 0
    const gap = mean(pri, (id) => data.w1[id]) - mean(c26, (id) => data.w3[id])

    const latestM = dimMeans(data, (st) => data.w2[st.id] ?? data.w3[st.id])
    const w1M = dimMeans(data, (st) => data.w1[st.id])
    const dims = data.T.map((t, i) => {
      const val = Math.round(latestM[i])
      const d = latestM[i] - w1M[i]
      return {
        label: data.SHORT[i], v: val, pct: val, w1pct: Math.round(w1M[i]),
        dtxt: (d >= 0 ? '+' : '') + d.toFixed(1), dc: d >= 0 ? '#5E8F80' : '#A6503F',
      }
    })

    const hist = checkpoints(data)
    const ses = hist.map((h) => h.se)
    const mn = Math.min(...ses) - 0.8, mx = Math.max(...ses) + 0.8
    const spx = (i: number) => 8 + i * (174 / 4)
    const spy = (val: number) => 6 + ((mx - val) / (mx - mn)) * 32
    const spark = ses.map((val, i) => `${spx(i).toFixed(1)},${spy(val).toFixed(1)}`).join(' ')

    const flaggedSegs = data.SEGS
      .filter((g) => g.id !== 'steady' && g.id !== 'unflagged')
      .map((g) => ({ id: g.id, name: g.name, color: g.color, n: tally[g.id] }))
      .sort((a, b) => b.n - a.n)
    const wCats = [
      ...flaggedSegs,
      { id: 'steady' as const, name: 'Steady Core', color: '#5E8F80', n: tally.steady },
      { id: 'unflagged' as const, name: 'Unflagged', color: '#C4C2BB', n: tally.unflagged },
      { id: null, name: 'Not yet assessed', color: '#EBE9E2', n: onRecord - assessed },
    ]
    const cells = waffleCells(wCats.map((c) => c.n), onRecord)
    let ci = 0
    const paths = cells.map((n, k) => {
      const d = wafflePath(ci, n)
      ci += n
      return { d, color: wCats[k].color }
    })

    return {
      tally, assessed, flagged, onRecord, sent, completed, worst, gap, dims, hist, ses, spark,
      spx, spy, wCats, cells, paths,
      waffleH: Math.ceil(ci / 10) * 15 - 3,
      topMovers: movers(data).slice(0, 3),
    }
  }, [data])

  const kpis = [
    { label: 'ON RECORD', v: v.onRecord, sub: '4 faculties · 3 intakes', href: '/people', top: 'rgba(20,40,60,.10)', color: '#14283C' },
    { label: 'ASSESSED', v: v.assessed, sub: `${Math.round((v.assessed / v.onRecord) * 100)}% of the directory`, href: '/people', top: 'rgba(20,40,60,.10)', color: '#14283C' },
    { label: 'NEED ACTION', v: v.flagged, sub: 'across 5 flagged patterns', href: '/segments', top: '#A6503F', color: '#A6503F' },
  ]

  return (
    <>
      <Header title="Overview" sub="Kykology University · 6D Profile deployment · as of 2 November 2026">
        {/* Invite someone now lives in Header — it is on every screen, not just this one. */}
        <HeaderButton tone="solid" onClick={() => router.push('/campaigns/new')}>New campaign</HeaderButton>
      </Header>

      <div className="min-h-0 flex-1 overflow-auto bg-[#FCFCFA]">
        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
          <div className="grid grid-cols-3 gap-3">
            {kpis.map((k) => (
              <Link
                key={k.label}
                href={k.href}
                className="rounded-[10px] border border-ink/10 bg-white p-[17px_19px] hover:border-ink/24"
                style={{ borderTop: `3px solid ${k.top}` }}
              >
                <div className="flex items-baseline gap-2">
                  <span className="eyebrow text-[9px] tracking-[.14em] text-ink/45">{k.label}</span>
                  <span className="ml-auto text-[12px] leading-none text-ink/30">→</span>
                </div>
                <div className="mt-3 text-[30px] leading-none font-black tracking-[-.02em] tabular-nums" style={{ color: k.color }}>
                  {k.v}
                </div>
                <div className="mt-2 text-[11px] leading-[1.4] text-ink/50">{k.sub}</div>
              </Link>
            ))}
          </div>

          <Panel className="flex flex-wrap items-stretch gap-7">
            <div className="min-w-[380px] flex-1">
              <div className="flex items-baseline gap-2.5">
                <CardTitle>October checkpoints</CardTitle>
                <span className="eyebrow text-[10px] tracking-normal text-ink/45">2022–2026</span>
                <span className="ml-auto"><MoreLink href="/longitudinal">Trends →</MoreLink></span>
              </div>
              <div className="mt-3.5 grid grid-cols-5 gap-3">
                {v.hist.map((h) => (
                  <div key={h.yr} className="min-w-0 pt-2.5" style={{ borderTop: `3px solid ${h.current ? '#C9A24B' : 'rgba(20,40,60,.08)'}` }}>
                    <div className="eyebrow text-[9px] tracking-[.12em] text-ink/45">{h.yr}</div>
                    <div className="mt-2 text-[22px] leading-none font-black tabular-nums" style={{ color: h.current ? '#14283C' : 'rgba(20,40,60,.55)' }}>
                      {h.assessed}
                    </div>
                    <div className="mt-[5px] text-[10.5px] leading-[1.5] text-ink/50">of {h.invited} invited</div>
                    <div className="eyebrow mt-1.5 text-[9.5px] tracking-normal text-rust">
                      {Math.round((h.flagged / h.assessed) * 100)}% FLAGGED
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex w-[190px] flex-none flex-col justify-center">
              <div className="eyebrow text-[9px] tracking-[.14em] text-ink/45">SECURITY MEAN</div>
              <svg viewBox="0 0 190 44" className="mt-3 h-11 w-full overflow-visible">
                <polyline className="chart-line" pathLength={1} points={v.spark} fill="none" stroke="#2F4A63" strokeWidth={2} />
                {/* Matches chart-line's duration: the head lands as the line reaches it. */}
                <circle className="chart-pop" style={{ animationDelay: '400ms' }} cx={v.spx(4)} cy={v.spy(v.ses[4])} r={3.2} fill="#A6503F" />
              </svg>
              <p className="mt-2.5 text-[11px] leading-[1.5] text-ink/55">
                {v.ses[0].toFixed(1)} in 2022 → {v.ses[4].toFixed(1)} now — drifting down as intakes broaden.
              </p>
            </div>
          </Panel>

          <div className="grid items-stretch gap-4 [grid-template-columns:repeat(auto-fit,minmax(380px,1fr))]">
            <section className="flex flex-col rounded-[10px] bg-ink p-[24px_26px] text-white">
              <div className="eyebrow text-[9px] tracking-[.16em] text-white/50">WHAT THE INSTRUMENT FOUND</div>
              <p className="mt-3.5 max-w-[52ch] font-display text-[21px] leading-[1.55] text-pretty text-white">
                The 2026 intake is scoring {Math.abs(v.gap).toFixed(1)} points {v.gap >= 0 ? 'lower' : 'higher'} on
                Security than earlier intakes did at their first assessment — {v.tally.fragile} students meet the
                Transition Fragile pattern.
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-3.5 pt-5">
                <Link href="/segments" className="rounded-md bg-brass px-3.5 py-2.5 text-[11.5px] leading-none font-bold text-ink hover:opacity-90">
                  See the {v.tally.fragile} students
                </Link>
                <span className="eyebrow text-[9.5px] tracking-[.06em] text-white/40">
                  2026 INTAKE AT ENTRY · VS EARLIER INTAKES, FIRST ASSESSMENT
                </span>
              </div>
            </section>

            <Panel>
              <div className="flex items-baseline">
                <CardTitle>University fingerprint</CardTitle>
                <span className="ml-auto"><MoreLink href="/longitudinal">Explore →</MoreLink></span>
              </div>
              <p className="mt-1.5 text-[11px] leading-[1.4] text-ink/50">
                Mean of all assessed students · gold tick marks each dimension at first assessment
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {v.dims.map((d, i) => (
                  <div key={d.label} className="group flex items-center gap-2.5">
                    <div className="eyebrow w-[74px] flex-none truncate text-[9px] tracking-[.1em] text-ink/55 transition-colors group-hover:text-ink">{d.label}</div>
                    <div className="relative h-2 min-w-[120px] flex-1 rounded-[4px] bg-parchment">
                      {/* Staggered so the six read as a cascade rather than one block.
                          Six at 50ms is 250ms of stagger — the whole group is settled
                          inside the time a single bar takes to travel. */}
                      <div
                        className="chart-bar absolute inset-y-0 left-0 rounded-[4px] bg-slate group-hover:bg-ink"
                        style={{ width: `${d.pct}%`, animationDelay: `${i * 50}ms` }}
                      />
                      {/* Keyed off --dur-move: each tick lands as its own bar arrives. */}
                      <div className="chart-pop absolute -top-0.5 -bottom-0.5 w-0.5 bg-brass" style={{ left: `${d.w1pct}%`, animationDelay: `${320 + i * 50}ms` }} />
                    </div>
                    <div className="w-6 flex-none text-right font-mono text-[11px] leading-none font-bold text-ink">{d.v}</div>
                    <div className="w-9 flex-none text-right font-mono text-[10px] leading-none font-semibold" style={{ color: d.dc }}>
                      {d.dtxt}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(360px,1fr))]">
            <Panel>
              <CardTitle>Recent activity</CardTitle>
              <div className="mt-2 flex flex-col">
                {ACTIVITY.map((a) => (
                  <Link key={a.when + a.lead} href={a.href} className="flex items-baseline gap-3.5 border-b border-ink/6 px-0.5 py-[11px] hover:bg-cream">
                    <span className="eyebrow w-[86px] flex-none text-[9px] leading-[1.4] tracking-[.08em] text-ink/42">{a.when}</span>
                    <span className="text-[12.5px] leading-[1.5] text-ink/75">
                      <strong className="font-bold text-ink">{a.lead}</strong>
                      {a.rest}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-3"><MoreLink href="/campaigns">View campaigns →</MoreLink></div>
            </Panel>

            <div className="flex flex-col gap-4">
              <Panel>
                <CardTitle>Movement since first assessment</CardTitle>
                <div className="mt-3 flex flex-col gap-2.5">
                  {v.topMovers.map((m) => (
                    <div key={m.name} className="flex items-center gap-2.5">
                      <div className="flex-1 text-[12.5px] leading-[1.3] text-ink">{m.name}</div>
                      <div className="font-mono text-[12px] leading-none font-bold" style={{ color: m.color }}>{m.txt}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3.5 border-t border-ink/8 pt-3">
                  <MoreLink href="/longitudinal">Full longitudinal view →</MoreLink>
                </div>
              </Panel>

              <Panel>
                <CardTitle>The population</CardTitle>
                <p className="mt-1.5 text-[11px] leading-[1.4] text-ink/50">
                  Each square is 1% of the {v.onRecord} on record
                </p>
                <svg viewBox={`0 0 147 ${v.waffleH}`} className="mt-3.5 block h-auto w-full max-w-[230px]">
                  {v.paths.map((p, i) => (
                    /*
                     * The entrance lives on the wrapper and the hover dim on the
                     * path. Both on one element and the animation wins: fill-mode
                     * `both` pins opacity at 1 for good, and hovering does nothing.
                     */
                    <g key={i} className="chart-pop" style={{ animationDelay: `${i * 55}ms` }}>
                      <path
                        className="chart-fade"
                        d={p.d}
                        fill={p.color}
                        opacity={hoverCat === null || hoverCat === i ? 1 : 0.18}
                      />
                    </g>
                  ))}
                </svg>
                <div className="mt-3.5 flex flex-col gap-2">
                  {v.wCats.map((g, i) => (
                    <div
                      key={g.name}
                      onMouseEnter={() => setHoverCat(i)}
                      onMouseLeave={() => setHoverCat(null)}
                      className={`flex cursor-default items-center gap-2.5 rounded-[5px] px-1 py-0.5 transition-colors ${hoverCat === i ? 'bg-parchment' : ''}`}
                    >
                      <span className="size-[9px] flex-none rounded-[2px]" style={{ background: g.color }} />
                      <span className={`flex-1 text-[12px] leading-[1.3] ${i < 5 ? 'text-ink' : 'text-ink/55'}`}>{g.name}</span>
                      <span className={`font-mono text-[11.5px] leading-none font-bold ${i < 5 ? 'text-ink' : 'text-ink/55'}`}>
                        {g.n} · {v.cells[i]}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3.5 border-t border-ink/8 pt-3">
                  <MoreLink href="/segments">All 5 patterns →</MoreLink>
                </div>
              </Panel>

              <Panel>
                <div className="flex items-baseline">
                  <CardTitle>Deployment</CardTitle>
                  <span className="ml-auto font-mono text-[12px] leading-none font-bold text-ink">
                    {Math.round((v.completed / v.sent) * 100)}%
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-[1.6] text-ink/65">
                  {v.completed} of {v.sent} invites completed across {data.campaigns.length} campaigns.
                  {v.worst && ` ${v.worst.c.name} sits lowest at ${Math.round((v.worst.f.completed / v.worst.f.sent) * 100)}% — ${v.worst.f.opened + v.worst.f.started} students are mid-funnel.`}
                </p>
                <div className="mt-3">
                  <MoreLink href={v.worst ? `/campaigns/${v.worst.c.id}` : '/campaigns'}>See who is stuck →</MoreLink>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
