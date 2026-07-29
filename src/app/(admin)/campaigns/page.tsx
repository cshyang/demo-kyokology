'use client'

import { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header, HeaderButton } from '@/components/Header'
import { useDemoData } from '@/lib/data/demo.ts'
import { campaignFunnel } from '@/lib/data/derive.ts'
import { useDemoState } from '@/lib/demo-state'

function CreatedBanner() {
  const created = useSearchParams().get('created')
  const { newCampaigns } = useDemoState()
  const c = newCampaigns.find((x) => x.id === created)
  if (!c) return null
  return (
    <div className="flex-none rounded-[8px] border border-[#B7D3C7] bg-[#F1F7F4] p-[12px_16px] text-[12px] leading-none font-bold text-ink">
      {c.name} created for {c.size} recipients · nothing was actually sent
    </div>
  )
}

export default function CampaignsPage() {
  const data = useDemoData()
  const router = useRouter()
  const { newCampaigns } = useDemoState()

  const rows = useMemo(
    () =>
      data.campaigns.map((c) => {
        const f = campaignFunnel(c)
        const pct = (n: number) => (f.sent ? (n / f.sent) * 100 : 0)
        return {
          c,
          f,
          pctCompleted: pct(f.completed),
          pctStartedOnly: pct(f.started - f.completed),
          pctOpenedOnly: pct(f.opened - f.started),
          line: `${f.completed} completed · ${f.started - f.completed} mid-test · ${f.opened - f.started} opened only · ${f.bounced} bounced`,
        }
      }),
    [data],
  )

  const live = rows.find((r) => r.c.status !== 'COMPLETE')
  const noProgress = live ? live.f.sent - live.f.started : 0

  const alerts = [
    live && {
      title: `${noProgress} students have made no progress`,
      body: `${live.c.name} has been open since ${live.c.sentLabel}. The reminder rule fires at 5 days — ${noProgress} people qualify right now.`,
      tint: 'rgba(166,80,63,.08)',
      line: '#E2CDC6',
      href: `/campaigns/${live.c.id}`,
    },
    {
      title: `${rows.reduce((a, r) => a + r.f.bounced, 0)} addresses bounced`,
      body: 'Undeliverable invites are tracked as a status rather than dropped, so completion rates are not quietly inflated.',
      tint: 'rgba(185,139,60,.08)',
      line: '#E4D6B6',
      href: live ? `/campaigns/${live.c.id}` : '/campaigns',
    },
  ].filter(Boolean) as { title: string; body: string; tint: string; line: string; href: string }[]

  const GRID = '[grid-template-columns:270px_176px_98px_1fr_104px]'

  return (
    <>
      <Header title="Campaigns" sub={newCampaigns.length ? `${data.campaigns.length + newCampaigns.length} sends. ${newCampaigns.length} just created, one still in flight.` : 'Three sends. One is still in flight.'}>
        <HeaderButton tone="solid" onClick={() => router.push('/campaigns/new')}>New campaign</HeaderButton>
      </Header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto bg-[#FCFCFA] px-[26px] py-[22px]">
        <Suspense fallback={null}>
          <CreatedBanner />
        </Suspense>

        <div className="flex flex-none gap-3.5">
          {alerts.map((a) => (
            <Link
              key={a.title}
              href={a.href}
              className="flex-1 rounded-[9px] p-[15px_17px]"
              style={{ background: a.tint, border: `1px solid ${a.line}` }}
            >
              <div className="text-[12.5px] leading-[1.3] font-bold text-ink">{a.title}</div>
              <p className="mt-1.5 text-[11.5px] leading-[1.5] text-ink/60">{a.body}</p>
            </Link>
          ))}
        </div>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-white">
          <div className={`grid flex-none gap-3.5 border-b border-ink/8 bg-cream p-[10px_18px] ${GRID}`}>
            {['CAMPAIGN', 'AUDIENCE', 'SENT', 'FUNNEL', 'STATUS'].map((h) => (
              <div key={h} className="eyebrow text-[8.5px] tracking-[.12em] text-ink/42">{h}</div>
            ))}
          </div>
          {newCampaigns.map((c) => (
            <div key={c.id} className={`grid flex-none items-center gap-3.5 border-b border-ink/6 p-[16px_18px] ${GRID}`}>
              <div>
                <div className="text-[12.5px] leading-[1.3] font-bold text-ink">{c.name}</div>
                <div className="eyebrow mt-1 text-[10px] tracking-normal text-ink/45">JUST CREATED · NOT DELIVERED</div>
              </div>
              <div className="text-[12px] leading-[1.3] text-ink/65">{c.audience}</div>
              <div className="font-mono text-[11px] leading-none text-ink/60">{c.sentLabel}</div>
              <div>
                <div className="flex h-[9px] overflow-hidden rounded-[5px] bg-line" />
                <div className="mt-2 font-mono text-[10px] leading-none text-ink/50">
                  0 of {c.size} completed · funnel starts empty
                </div>
              </div>
              <div
                className="eyebrow rounded-[4px] p-[6px_9px] text-center text-[9.5px] tracking-[.1em] font-semibold"
                style={{ color: '#B98B3C', background: 'rgba(185,139,60,.16)' }}
              >
                IN FLIGHT
              </div>
            </div>
          ))}
          {rows.map(({ c, f, pctCompleted, pctStartedOnly, pctOpenedOnly, line }) => (
            <Link
              key={c.id}
              href={`/campaigns/${c.id}`}
              className={`grid flex-none items-center gap-3.5 border-b border-ink/6 p-[16px_18px] hover:bg-cream ${GRID}`}
            >
              <div>
                <div className="text-[12.5px] leading-[1.3] font-bold text-ink">{c.name}</div>
                <div className="eyebrow mt-1 text-[10px] tracking-normal text-ink/45">6D PROFILE · 36 QUESTIONS</div>
              </div>
              <div className="text-[12px] leading-[1.3] text-ink/65">{c.audience}</div>
              <div className="font-mono text-[11px] leading-none text-ink/60">{c.sentLabel}</div>
              <div>
                <div className="flex h-[9px] overflow-hidden rounded-[5px] bg-line">
                  <div className="bg-sage" style={{ width: `${pctCompleted}%` }} />
                  <div className="bg-[#A9CBBF]" style={{ width: `${pctStartedOnly}%` }} />
                  <div className="bg-[#C4C2BB]" style={{ width: `${pctOpenedOnly}%` }} />
                </div>
                <div className="mt-2 font-mono text-[10px] leading-none text-ink/50">{line}</div>
              </div>
              <div
                className="eyebrow rounded-[4px] p-[6px_9px] text-center text-[9.5px] tracking-[.1em] font-semibold"
                style={
                  c.status === 'COMPLETE'
                    ? { color: '#5E8F80', background: 'rgba(94,143,128,.14)' }
                    : { color: '#B98B3C', background: 'rgba(185,139,60,.16)' }
                }
              >
                {c.status}
              </div>
              <span className="sr-only">{f.sent} sent</span>
            </Link>
          ))}
        </section>
      </div>
    </>
  )
}
