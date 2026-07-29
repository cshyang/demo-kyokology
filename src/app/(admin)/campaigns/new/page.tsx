'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { useDemoData } from '@/lib/data/demo.ts'
import { useDemoState, type TemplateKind } from '@/lib/demo-state'
import { tint, token } from '@/lib/color'

const STEPS = ['Test', 'Audience', 'Emails', 'Review'] as const

const TESTS = [
  { id: '6d', name: '6D Profile', dims: 6, q: 100, note: 'The full Campus instrument. 100 questions across six dimensions, archetype label, segment rules.' },
  { id: 'entry', name: '6D Entry Check', dims: 6, q: 18, note: 'Short onboarding form — three items per dimension. Not the full Campus report.' },
  { id: 'team', name: 'Team Readiness', dims: 3, q: 14, note: 'Collaboration subset for project cohorts — three dimensions only. Not a standalone report.' },
]

export default function NewCampaignPage() {
  const data = useDemoData()
  const router = useRouter()
  const { templates, addCampaign } = useDemoState()

  const [step, setStep] = useState(0)
  const [test, setTest] = useState('6d')
  const [cohorts, setCohorts] = useState<Record<string, boolean>>({ 'Engineering·2026': true })
  const [paste, setPaste] = useState('')
  const [dedupe, setDedupe] = useState<'skip' | 'update'>('skip')
  const [tplKind, setTplKind] = useState<TemplateKind>('invite')
  const [nudgeOn, setNudgeOn] = useState(true)
  const [nudgeDays, setNudgeDays] = useState(5)

  const cohortList = useMemo(() => {
    const m = new Map<string, number>()
    for (const st of data.students) {
      const key = `${st.faculty}·${st.intakeYear}`
      m.set(key, (m.get(key) ?? 0) + 1)
    }
    return [...m.entries()].map(([key, n]) => ({ key, n, faculty: key.split('·')[0], year: key.split('·')[1] }))
  }, [data])

  const existingEmails = useMemo(() => new Set(data.students.map((s) => s.email.toLowerCase())), [data])
  const pasted = paste
    .split(/[\n,;]/)
    .map((s) => s.trim())
    .filter((s) => s.includes('@'))
  const pastedDupes = pasted.filter((e) => existingEmails.has(e.toLowerCase()))
  const pastedNew = pasted.filter((e) => !existingEmails.has(e.toLowerCase()))

  const cohortCount = cohortList.filter((c) => cohorts[c.key]).reduce((a, c) => a + c.n, 0)
  const total = cohortCount + (dedupe === 'skip' ? pastedNew.length : pasted.length)
  const chosenTest = TESTS.find((t) => t.id === test)!

  function send() {
    const id = addCampaign({
      name: `${chosenTest.name} · ${new Date(2026, 10, 2).getFullYear()} ad-hoc`,
      audience: cohortList.filter((c) => cohorts[c.key]).map((c) => `${c.faculty} ${c.year}`).join(', ') || 'Pasted addresses',
      size: total,
      sentLabel: '2 Nov 2026',
    })
    router.push(`/campaigns?created=${id}`)
  }

  const canNext = step === 1 ? total > 0 : true

  return (
    <>
      <Header title="New campaign" sub="Nothing sends until the last step.">
        <Link href="/campaigns" className="rounded-md border border-ink/18 px-[13px] py-[9px] text-[11.5px] leading-none font-bold text-ink hover:bg-parchment">
          ← Back
        </Link>
      </Header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto bg-[#FCFCFA] px-[26px] py-[22px]">
        <ol className="flex flex-none gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className="w-full cursor-pointer text-left disabled:cursor-default"
              >
                <div
                  className="h-[3px] rounded-[2px]"
                  style={{ background: i <= step ? token('ink') : tint('ink', 12) }}
                />
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="eyebrow text-[9px] tracking-[.12em]" style={{ color: i <= step ? token('ink') : tint('ink', 40) }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[12.5px] font-bold" style={{ color: i <= step ? token('ink') : tint('ink', 40) }}>
                    {s}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ol>

        <section className="flex-1 rounded-[10px] border border-ink/10 bg-white p-[22px_24px]">
          {step === 0 && (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              {TESTS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTest(t.id)}
                  className="cursor-pointer rounded-[9px] p-[16px_18px] text-left"
                  style={{ boxShadow: test === t.id ? `inset 0 0 0 2px ${token('ink')}` : `inset 0 0 0 1px ${tint('ink', 14)}` }}
                >
                  <div className="text-[13.5px] leading-none font-bold text-ink">{t.name}</div>
                  <div className="eyebrow mt-2 text-[9px] tracking-[.12em] text-ink/45">
                    {t.dims} DIMENSIONS · {t.q} QUESTIONS
                  </div>
                  <p className="mt-2.5 text-[11.5px] leading-[1.6] text-ink/60">{t.note}</p>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
              <div>
                <h3 className="text-[13px] leading-none font-bold text-ink">From cohorts</h3>
                <div className="mt-3.5 flex flex-col gap-1.5">
                  {cohortList.map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2.5 rounded-[6px] px-2 py-2 hover:bg-cream">
                      <input
                        type="checkbox"
                        checked={!!cohorts[c.key]}
                        onChange={(e) => setCohorts((p) => ({ ...p, [c.key]: e.target.checked }))}
                      />
                      <span className="flex-1 text-[12.5px] text-ink">{c.faculty} · {c.year}</span>
                      <span className="font-mono text-[11px] text-ink/50">{c.n}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-[13px] leading-none font-bold text-ink">Add people not in the database</h3>
                <p className="mt-2 text-[11.5px] leading-[1.6] text-ink/55">
                  Paste addresses, one per line or comma separated.
                </p>
                <textarea
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  rows={6}
                  placeholder="someone@kykology.edu"
                  className="mt-2.5 w-full resize-none rounded-[7px] border border-ink/16 p-[13px_14px] font-mono text-[11.5px] leading-[1.7] text-ink"
                />
                {pasted.length > 0 && (
                  <div className="mt-3 rounded-[8px] bg-cream p-[14px_16px]">
                    <div className="eyebrow text-[9px] tracking-[.14em] text-gold">
                      {pastedDupes.length} ALREADY IN THE DATABASE · {pastedNew.length} NEW
                    </div>
                    {pastedDupes.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        {(['skip', 'update'] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => setDedupe(m)}
                            className={`cursor-pointer rounded-md px-3 py-2 text-[11.5px] leading-none font-bold ${
                              dedupe === m ? 'bg-ink text-white' : 'border border-ink/18 bg-white text-ink'
                            }`}
                          >
                            {m === 'skip' ? 'Skip them' : 'Send anyway'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
              <div>
                <h3 className="text-[13px] leading-none font-bold text-ink">Messages</h3>
                <div className="mt-3 flex gap-2">
                  {(['invite', 'reminder', 'thanks'] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setTplKind(k)}
                      className={`cursor-pointer rounded-md px-3 py-2 text-[11.5px] leading-none font-bold capitalize ${
                        tplKind === k ? 'bg-ink text-white' : 'border border-ink/16 bg-white text-ink'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="mt-3.5 rounded-[8px] bg-cream p-[16px_18px]">
                  <div className="eyebrow text-[8.5px] tracking-[.14em] text-ink/45">SUBJECT</div>
                  <div className="mt-1.5 text-[12.5px] leading-[1.4] font-bold text-ink">{templates[tplKind].subject}</div>
                  <div className="mt-3.5 border-t border-ink/10 pt-3.5 text-[12px] leading-[1.75] whitespace-pre-line text-ink/70">
                    {templates[tplKind].body}
                  </div>
                </div>
                <Link href="/templates" className="mt-3 inline-block text-[11.5px] leading-none font-bold text-teal hover:underline">
                  Edit templates →
                </Link>
              </div>
              <div>
                <h3 className="text-[13px] leading-none font-bold text-ink">Follow-up rule</h3>
                <p className="mt-2 text-[11.5px] leading-[1.6] text-ink/55">
                  This is the whole of feature 4 — one rule on the campaign, not a separate system.
                </p>
                <label className="mt-3.5 flex cursor-pointer items-center gap-3 rounded-[8px] bg-cream p-[14px_16px]">
                  <input type="checkbox" checked={nudgeOn} onChange={(e) => setNudgeOn(e.target.checked)} />
                  <span className="flex-1 text-[12.5px] text-ink">Send the reminder automatically</span>
                </label>
                {nudgeOn && (
                  <div className="mt-2.5 flex items-center gap-2.5 px-4 text-[12.5px] text-ink/70">
                    after
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={nudgeDays}
                      onChange={(e) => setNudgeDays(Number(e.target.value))}
                      className="w-16 rounded-[6px] border border-ink/16 p-[7px_9px] text-center font-mono text-[12px] font-bold text-ink"
                    />
                    days with no progress
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-[62ch]">
              <h3 className="text-[13px] leading-none font-bold text-ink">Review</h3>
              <dl className="mt-4 flex flex-col">
                {[
                  ['Test', `${chosenTest.name} · ${chosenTest.q} questions`],
                  ['Cohorts', cohortList.filter((c) => cohorts[c.key]).map((c) => `${c.faculty} ${c.year}`).join(', ') || 'None'],
                  ['Pasted addresses', pasted.length ? `${pasted.length} (${pastedDupes.length} already on record, ${dedupe === 'skip' ? 'skipped' : 'sent anyway'})` : 'None'],
                  ['Total recipients', String(total)],
                  ['Invitation', templates.invite.subject],
                  ['Follow-up', nudgeOn ? `Reminder after ${nudgeDays} days with no progress` : 'Off'],
                ].map(([k, val]) => (
                  <div key={k} className="flex items-baseline gap-4 border-b border-ink/6 py-3">
                    <dt className="eyebrow w-[140px] flex-none text-[9px] tracking-[.12em] text-ink/45">{k.toUpperCase()}</dt>
                    <dd className="flex-1 text-[12.5px] leading-[1.6] text-ink">{val}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[11.5px] leading-[1.6] text-ink/50">
                Nothing is actually delivered — this demo has no mail server. The campaign will appear in the list with
                its funnel at zero.
              </p>
            </div>
          )}
        </section>

        <div className="flex flex-none items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="cursor-pointer rounded-md border border-ink/18 bg-white px-[15px] py-[11px] text-[12px] leading-none font-bold text-ink hover:bg-parchment"
            >
              ← Back
            </button>
          )}
          <span className="text-[12px] text-ink/55">
            {total} recipient{total === 1 ? '' : 's'} selected
          </span>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="ml-auto cursor-pointer rounded-md bg-ink px-[18px] py-[11px] text-[12px] leading-none font-bold text-white hover:opacity-85 disabled:opacity-40"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={send}
              className="ml-auto cursor-pointer rounded-md bg-brass px-[18px] py-[11px] text-[12px] leading-none font-bold text-ink hover:opacity-90"
            >
              Send to {total} students
            </button>
          )}
        </div>
      </div>
    </>
  )
}
