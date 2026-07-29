'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Header, HeaderButton } from '@/components/Header'
import { useDemoData } from '@/lib/data/demo.ts'
import { campaignFunnel } from '@/lib/data/derive.ts'
import type { SendStatus } from '@/lib/data/generator.ts'

const STATUS_COLOR: Record<SendStatus, { color: string; tint: string }> = {
  completed: { color: '#5E8F80', tint: 'rgba(94,143,128,.14)' },
  started: { color: '#B98B3C', tint: 'rgba(185,139,60,.14)' },
  opened: { color: '#14283C', tint: 'rgba(20,40,60,.07)' },
  sent: { color: '#8A8F94', tint: 'rgba(20,40,60,.05)' },
  bounced: { color: '#A6503F', tint: 'rgba(166,80,63,.12)' },
}

type Filter = 'all' | 'noprogress' | SendStatus

export function CampaignDetail({ id }: { id: string }) {
  const data = useDemoData()

  const [filter, setFilter] = useState<Filter>('all')
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const [nudged, setNudged] = useState(false)
  const [toast, setToast] = useState('')

  const campaign = data.campaigns.find((c) => c.id === id)
  if (!campaign) return <div className="p-8 text-[13px] text-ink/60">No campaign with id {id}.</div>

  const v = useMemo(() => {
    const f = campaignFunnel(campaign)
    const t = f.sent || 1
    const pct = (n: number) => Math.round((n / t) * 100)
    return {
      f,
      steps: [
        { label: 'SENT', n: f.sent, pct: 100, color: '#14283C', bg: '#fff' },
        { label: 'OPENED', n: f.opened, pct: pct(f.opened), color: '#14283C', bg: '#fff' },
        { label: 'STARTED', n: f.started, pct: pct(f.started), color: '#B98B3C', bg: '#fff' },
        { label: 'COMPLETED', n: f.completed, pct: pct(f.completed), color: '#5E8F80', bg: '#F5F8F6' },
        { label: 'BOUNCED', n: f.bounced, pct: pct(f.bounced), color: '#A6503F', bg: '#FBF6F4' },
      ],
      // "No progress" = delivered but never started. This is the set the reminder rule targets.
      noProgress: campaign.list.filter((st) => st[campaign.key] === 'sent' || st[campaign.key] === 'opened').length,
    }
  }, [campaign])

  // Not capped. Student ids are grouped by faculty, so any prefix slice shows
  // one faculty and reads as fake data. 560 rows is nothing for a browser, and
  // the honest full list beats a misleading "showing 60 of 280".
  const rows = useMemo(
    () =>
      campaign.list
        .filter((st) => {
          const s = st[campaign.key]
          if (!s) return false
          if (filter === 'all') return true
          if (filter === 'noprogress') return s === 'sent' || s === 'opened'
          return s === filter
        })
        .map((st) => ({ st, status: st[campaign.key]! })),
    [campaign, filter],
  )

  const CHIPS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Everyone' },
    { id: 'noprogress', label: `No progress · ${v.noProgress}` },
    { id: 'completed', label: `Completed · ${v.f.completed}` },
    { id: 'started', label: `Mid-test · ${v.f.started - v.f.completed}` },
    { id: 'bounced', label: `Bounced · ${v.f.bounced}` },
  ]

  const GRID = '[grid-template-columns:120px_150px_70px_1fr_120px]'

  return (
    <>
      <Header title={campaign.name} sub={`${campaign.audience} · SENT ${campaign.sentLabel} · ${campaign.status}`}>
        <Link href="/campaigns" className="rounded-md border border-ink/18 px-[13px] py-[9px] text-[11.5px] leading-none font-bold text-ink hover:bg-parchment">
          ← Back
        </Link>
        {v.noProgress > 0 && (
          <HeaderButton tone="solid" onClick={() => { setFilter('noprogress'); setNudgeOpen(true) }}>
            Nudge {v.noProgress} students
          </HeaderButton>
        )}
      </Header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto bg-[#FCFCFA] px-[26px] py-[22px]">
        {toast && (
          <div className="flex-none rounded-[8px] border border-[#B7D3C7] bg-[#F1F7F4] p-[12px_16px] text-[12px] leading-none font-bold text-ink">
            {toast}
          </div>
        )}

        <div className="grid flex-none grid-cols-5 gap-3">
          {v.steps.map((s) => (
            <div key={s.label} className="rounded-[9px] border border-ink/10 p-[15px_16px]" style={{ background: s.bg }}>
              <div className="eyebrow text-[8.5px] tracking-[.12em] text-ink/45">{s.label}</div>
              <div className="mt-2.5 text-[26px] leading-none font-black tabular-nums" style={{ color: s.color }}>
                {s.n}
              </div>
              <div className="mt-2 h-[4px] overflow-hidden rounded-[2px] bg-line">
                <div className="h-full rounded-[2px]" style={{ width: `${s.pct}%`, background: s.color }} />
              </div>
              <div className="mt-1.5 font-mono text-[10px] leading-none text-ink/45">{s.pct}% of sent</div>
            </div>
          ))}
        </div>

        {nudgeOpen && (
          <section className="flex-none overflow-hidden rounded-[9px] border border-[#E2CDC6]">
            <div className="flex items-center gap-3 border-b border-[#E2CDC6] bg-[#F8F1EE] p-[14px_18px]">
              <h2 className="text-[13px] leading-none font-bold text-ink">Reminder · pre-filled from the template</h2>
              <span className="eyebrow text-[10.5px] tracking-normal text-ink/50">
                TO {v.noProgress} STUDENTS WITH NO PROGRESS
              </span>
              <button
                onClick={() => setNudgeOpen(false)}
                className="ml-auto cursor-pointer rounded-md border border-ink/18 bg-white px-3 py-[7px] text-[11.5px] leading-none font-bold text-ink"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setNudged(true)
                  setNudgeOpen(false)
                  setToast(`Reminder queued for ${v.noProgress} students · nothing was actually sent`)
                }}
                className="cursor-pointer rounded-md bg-ink px-[13px] py-2 text-[11.5px] leading-none font-bold text-white hover:opacity-85"
              >
                Send reminder
              </button>
            </div>
            <div className="bg-white p-[16px_18px]">
              <div className="eyebrow text-[9px] tracking-[.14em] text-ink/45">SUBJECT</div>
              <p className="mt-1.5 text-[12.5px] leading-[1.5] font-bold text-ink">
                Still open: 6D Profile closes 14 Nov 2026
              </p>
              <div className="eyebrow mt-3.5 text-[9px] tracking-[.14em] text-ink/45">BODY</div>
              <p className="mt-1.5 max-w-[70ch] text-[12.5px] leading-[1.7] whitespace-pre-line text-ink/70">
                {`Hi {{student_name}},\n\nYou haven't started the 6D Profile yet. It takes about 15 minutes and it closes on {{deadline}}.\n\nIf you started and got interrupted, your link picks up where you left off.\n\n— Student Services`}
              </p>
              <Link href="/templates" className="mt-3.5 inline-block text-[11.5px] leading-none font-bold text-teal hover:underline">
                Edit this template →
              </Link>
            </div>
          </section>
        )}

        <div className="flex flex-none flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              className={`cursor-pointer rounded-md px-3 py-2 text-[11.5px] leading-none font-bold ${
                filter === chip.id ? 'bg-ink text-white' : 'border border-ink/16 bg-white text-ink hover:bg-parchment'
              }`}
            >
              {chip.label}
            </button>
          ))}
          {nudged && (
            <span className="eyebrow self-center text-[9.5px] tracking-[.1em] text-sage">REMINDER SENT</span>
          )}
        </div>

        <section className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-white">
          <div className={`grid flex-none gap-3 border-b border-ink/8 bg-cream p-[10px_18px] ${GRID}`}>
            {['STUDENT', 'FACULTY', 'INTAKE', 'PROGRESS', 'STATUS'].map((h) => (
              <div key={h} className="eyebrow text-[8.5px] tracking-[.1em] text-ink/42">{h}</div>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {rows.map(({ st, status }) => {
              const pct = status === 'completed' ? 100 : status === 'started' ? 45 : status === 'opened' ? 8 : 0
              const tone = STATUS_COLOR[status]
              return (
                <div key={st.id} className={`grid items-center gap-3 border-b border-ink/6 p-[11px_18px] hover:bg-cream ${GRID}`}>
                  <div className="text-[12px] leading-[1.3] font-bold text-ink">{st.name}</div>
                  <div className="text-[12px] leading-[1.3] text-ink/70">{st.faculty}</div>
                  <div className="font-mono text-[11px] leading-none text-ink/70">{st.intakeYear}</div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-line">
                      <div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: tone.color }} />
                    </div>
                    <span className="w-8 flex-none text-right font-mono text-[10px] leading-none text-ink/45">{pct}%</span>
                  </div>
                  <div
                    className="eyebrow rounded-[4px] p-[5px_8px] text-center text-[9px] tracking-[.1em] font-semibold"
                    style={{ color: tone.color, background: tone.tint }}
                  >
                    {status.toUpperCase()}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex-none border-t border-ink/8 p-[11px_18px] text-[11.5px] leading-none text-ink/45">
            {rows.length} students
          </div>
        </section>
      </div>
    </>
  )
}
