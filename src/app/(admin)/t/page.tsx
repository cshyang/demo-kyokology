'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header, HeaderButton } from '@/components/Header'
import { useDemoData } from '@/lib/data/demo.ts'
import { useDemoState } from '@/lib/demo-state'
import { PER_PAGE, QUESTIONS, SCALE } from '@/lib/data/questions.ts'
import type { Dim } from '@/lib/data/generator.ts'

/**
 * "Student link" — the admin looking at one person's link, with what that person
 * actually sees rendered beside it.
 *
 * It sits inside the admin chrome on purpose. The pitch is not "here is a nice
 * mobile form"; it is "here is the exact state this row is in, and here is what
 * they are looking at right now" — which only lands if both are on screen at once.
 */
const STATE_NOTE: Record<string, string> = {
  sent: 'The invite is out and this link has never been opened. It looks exactly like this when they finally tap it.',
  opened: 'They opened the email and landed here, then left before consenting. Nothing is recorded until they agree.',
  started:
    'They got part way and stopped. There is no resume by design — the link reopens at the same question every time, so a reload never costs them their place.',
  completed:
    'Finished. This is the profile they saw, built from their own answers — the same numbers your Fingerprint screen aggregates.',
  bounced:
    'This invite never arrived, so the link was never live. Failed sends stay visible rather than being quietly dropped.',
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col justify-center rounded-[10px] bg-ink p-5">
      <div className="mx-auto w-full max-w-[392px]">
        <div className="relative overflow-hidden rounded-[42px] bg-black p-[10px] shadow-[0_24px_60px_rgba(0,0,0,.45)]">
          <div className="relative flex h-[700px] flex-col overflow-hidden rounded-[33px] bg-white">
            <div className="pointer-events-none absolute top-2 left-1/2 z-10 h-[26px] w-[104px] -translate-x-1/2 rounded-full bg-black" />
            {children}
          </div>
        </div>
        <p className="mt-3.5 text-center text-[11.5px] leading-[1.6] text-white/45">
          What the student receives · one link per person, mobile first
        </p>
      </div>
    </div>
  )
}

function Assessment() {
  const data = useDemoData()
  const params = useSearchParams()
  const sid = params.get('id') ?? 'S0141'
  const student = data.byId[sid] ?? data.students[0]

  /**
   * "Opened in the state their row is in" is a claim the screen has to honour:
   * a student the campaign lists as STARTED opens mid-questionnaire, one listed
   * as COMPLETED opens on their result.
   *
   * The prefilled answers are inverted from that student's stored profile
   * (score 0..100 -> mean 1..5), so a completed link shows the same numbers the
   * Fingerprint screen aggregates rather than a plausible-looking invention.
   */
  const status = params.get('status') ?? 'sent'
  const seeded = useMemo(() => {
    if (status === 'bounced') return { stage: 'bounced' as const, page: 0, answers: {} }
    if (status !== 'started' && status !== 'completed') return { stage: 'welcome' as const, page: 0, answers: {} }
    const rec = data.w3[student.id] ?? data.w2[student.id] ?? data.w1[student.id]
    if (!rec) return { stage: 'welcome' as const, page: 0, answers: {} }
    const upTo = status === 'completed' ? QUESTIONS.length : PER_PAGE * 4
    const answers: Record<number, number> = {}
    // Per dimension, spread integer 1..5 answers so their mean lands back on the
    // stored score. Rounding each item independently instead would quantise every
    // dimension to 0/25/50/75/100 and openly contradict the stored profile.
    //
    // Lands within ~2 points, not exactly: six Likert items can only express
    // multiples of 100/24, so 44 is unreachable and 46 is the nearest. That gap
    // is the instrument's real resolution, not a rounding bug.
    for (const dim of data.T) {
      const idx = QUESTIONS.map((q, i) => (q.dim === dim ? i : -1)).filter((i) => i >= 0 && i < upTo)
      if (!idx.length) continue
      const target = (rec.sc[dim] / 100) * 4 + 1
      const need = Math.round(target * idx.length)
      const base = Math.floor(need / idx.length)
      const extra = need - base * idx.length
      idx.forEach((i, k) => {
        answers[i] = Math.min(5, Math.max(1, base + (k < extra ? 1 : 0)))
      })
    }
    return { stage: status === 'completed' ? ('done' as const) : ('questions' as const), page: status === 'completed' ? 0 : 4, answers }
  }, [status, student.id, data])

  const [stage, setStage] = useState<'welcome' | 'questions' | 'done' | 'bounced'>(seeded.stage)
  const [consent, setConsent] = useState(seeded.stage !== 'welcome')
  const [page, setPage] = useState(seeded.page)
  const [answers, setAnswers] = useState<Record<number, number>>(seeded.answers)

  const pages = Math.ceil(QUESTIONS.length / PER_PAGE)
  const slice = QUESTIONS.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const answered = Object.keys(answers).length
  const pageComplete = slice.every((_, i) => answers[page * PER_PAGE + i] !== undefined)

  const scores = useMemo(() => {
    const sum = {} as Record<Dim, { n: number; total: number }>
    for (const d of data.T) sum[d] = { n: 0, total: 0 }
    QUESTIONS.forEach((q, i) => {
      const a = answers[i]
      if (a === undefined) return
      sum[q.dim].n++
      sum[q.dim].total += a
    })
    // 1..5 per item -> 0..100 per dimension.
    return data.T.map((d) => ({
      dim: d,
      v: sum[d].n ? Math.round(((sum[d].total / sum[d].n - 1) / 4) * 100) : 0,
    }))
  }, [answers, data.T])

  if (stage === 'bounced') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-[26px] py-2 text-center">
        <div className="font-mono text-[10px] leading-none font-semibold tracking-[.14em] text-rust">NOT DELIVERED</div>
        <h1 className="mt-3.5 font-display text-[22px] leading-[1.3] font-semibold text-ink">
          This link never arrived
        </h1>
        <p className="mt-3 text-[13.5px] leading-[1.7] text-ink/65">
          The invite bounced, so nothing was ever opened. Fix the address on their record and resend from the
          campaign.
        </p>
      </div>
    )
  }

  if (stage === 'welcome') {
    return (
      <div className="flex flex-1 flex-col overflow-auto px-7 pt-16 pb-8">
        <div className="font-display text-[19px] leading-none font-semibold tracking-tight text-ink">KYKOLOGY</div>
        <h1 className="mt-8 font-display text-[27px] leading-[1.3] font-semibold text-ink">
          Your 6D Profile
        </h1>
        <p className="mt-4 text-[14px] leading-[1.75] text-ink/70">
          Hi {student.name} — this takes about 15 minutes. There are 36
          statements and no right answers.
        </p>

        <div className="mt-7 rounded-[12px] bg-cream p-[18px_20px]">
          <div className="eyebrow text-[9px] tracking-[.14em] text-ink/45">WHAT HAPPENS TO THIS</div>
          <ul className="mt-3 flex list-none flex-col gap-2.5 text-[12.5px] leading-[1.6] text-ink/70">
            <li>Your results are shared with {student.faculty} student services.</li>
            <li>Staff use patterns to offer support and opportunities.</li>
            <li>You can see your own profile as soon as you finish.</li>
            <li>You can withdraw consent at any time.</li>
          </ul>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 text-[13px] leading-[1.6] text-ink">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span>I understand and agree to share my results with my institution.</span>
        </label>

        <button
          onClick={() => setStage('questions')}
          disabled={!consent}
          className="mt-auto w-full cursor-pointer rounded-[10px] bg-ink py-[15px] text-[13.5px] font-bold text-white disabled:opacity-30"
        >
          Start
        </button>
      </div>
    )
  }

  if (stage === 'done') {
    return (
      <div className="flex flex-1 flex-col overflow-auto px-7 pt-16 pb-8">
        <div className="eyebrow text-[9px] tracking-[.16em] text-teal">COMPLETE</div>
        <h1 className="mt-4 font-display text-[26px] leading-[1.3] font-semibold text-ink">
          Thanks, {student.name}
        </h1>
        <p className="mt-3.5 text-[13.5px] leading-[1.75] text-ink/70">
          Your profile is ready. Nothing here is a verdict — it describes how you tend to operate, and it changes.
        </p>

        <div className="mt-7 flex flex-col gap-3.5">
          {scores.map((s, i) => (
            <div key={s.dim}>
              <div className="flex items-baseline gap-2">
                <span className="eyebrow flex-1 text-[9px] tracking-[.12em] text-ink/50">{data.SHORT[i]}</span>
                <span className="font-mono text-[12px] font-bold text-ink">{s.v}</span>
              </div>
              <div className="mt-1.5 h-[7px] overflow-hidden rounded-[4px] bg-line">
                <div className="h-full rounded-[4px] bg-slate" style={{ width: `${s.v}%` }} />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-7 text-[11.5px] leading-[1.7] text-ink/45">
          Scored live from your {answered} answers. In the real product this writes back to the campaign and the
          student appears as completed.
        </p>

        <button
          onClick={() => { setStage('welcome'); setAnswers({}); setPage(0); setConsent(false) }}
          className="mt-auto w-full cursor-pointer rounded-[10px] border border-ink/18 py-[15px] text-[13.5px] font-bold text-ink"
        >
          Restart the demo
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-none px-7 pt-14 pb-4">
        <div className="flex items-baseline gap-2">
          <span className="eyebrow text-[9px] tracking-[.14em] text-ink/45">
            PAGE {page + 1} OF {pages}
          </span>
          <span className="ml-auto font-mono text-[11px] text-ink/45">
            {answered}/{QUESTIONS.length}
          </span>
        </div>
        <div className="mt-2.5 h-[5px] overflow-hidden rounded-[3px] bg-line">
          <div
            className="h-full rounded-[3px] bg-teal transition-[width] duration-200"
            style={{ width: `${(answered / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-7">
        {slice.map((q, i) => {
          const idx = page * PER_PAGE + i
          return (
            <fieldset key={idx} className="border-b border-ink/8 py-5 last:border-0">
              <legend className="text-[14px] leading-[1.55] text-ink">{q.text}</legend>
              <div className="mt-3.5 flex gap-1.5">
                {SCALE.map((s) => (
                  <button
                    key={s.v}
                    onClick={() => setAnswers((a) => ({ ...a, [idx]: s.v }))}
                    aria-label={s.label}
                    aria-pressed={answers[idx] === s.v}
                    className={`h-10 flex-1 cursor-pointer rounded-[8px] text-[12px] font-bold ${
                      answers[idx] === s.v ? 'bg-ink text-white' : 'bg-cream text-ink/55 hover:bg-parchment'
                    }`}
                  >
                    {s.v}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-ink/40">
                <span>Not like me</span>
                <span>Very like me</span>
              </div>
            </fieldset>
          )
        })}
      </div>

      <div className="flex flex-none gap-2 px-7 pt-4 pb-8">
        {page > 0 && (
          <button
            onClick={() => setPage((p) => p - 1)}
            className="cursor-pointer rounded-[10px] border border-ink/18 px-5 py-[15px] text-[13.5px] font-bold text-ink"
          >
            ←
          </button>
        )}
        <button
          onClick={() => (page + 1 < pages ? setPage((p) => p + 1) : setStage('done'))}
          disabled={!pageComplete}
          className="flex-1 cursor-pointer rounded-[10px] bg-ink py-[15px] text-[13.5px] font-bold text-white disabled:opacity-30"
        >
          {page + 1 < pages ? 'Continue' : 'Finish'}
        </button>
      </div>
    </div>
  )
}

function StudentLink() {
  const params = useSearchParams()
  const router = useRouter()
  const data = useDemoData()
  const { newCampaigns } = useDemoState()

  const sid = params.get('id') ?? 'S0141'
  const student = data.byId[sid] ?? data.students[0]
  const status = params.get('status') ?? 'sent'
  const from = params.get('from') ?? 'C'
  const campaign =
    [...data.campaigns, ...newCampaigns].find((c) => c.id === from)?.name ?? data.campaigns[2].name

  // Stable per student, and obviously not a real token — nobody should think this resolves.
  const url = `kykology.edu/t/${student.id.slice(1)}-${((student.id.charCodeAt(3) * 7) % 9000) + 1000}`

  return (
    <>
      <Header
        title={`${student.name}\u2019s link`}
        sub="What this student sees — opened in the state their row is in."
      >
        <HeaderButton onClick={() => router.push(`/campaigns/${from}`)}>← Back</HeaderButton>
      </Header>

      <div className="grid min-h-0 flex-1 items-stretch gap-[18px] overflow-auto bg-[#FCFCFA] px-[26px] py-[22px] [grid-template-columns:1fr_430px]">
        <div className="flex min-h-0 flex-col gap-4 rounded-[10px] border border-ink/10 bg-white p-[22px_24px]">
          <div className="flex flex-none items-start gap-3.5">
            <div className="flex-1">
              <div className="font-display text-[20px] leading-[1.3] font-semibold text-ink">{student.name}</div>
              <div className="mt-[7px] font-mono text-[11.5px] leading-[1.4] text-ink/50">
                {student.faculty} · {student.intakeYear} intake · {student.email}
              </div>
            </div>
            <div className="eyebrow flex-none rounded-[4px] bg-parchment px-[9px] py-[7px] text-[9.5px] font-bold tracking-[.1em] text-ink">
              {status.toUpperCase()}
            </div>
          </div>

          <div className="flex-none">
            <div className="eyebrow text-[9px] tracking-[.16em] text-ink/45">THEIR LINK · {campaign}</div>
            <div className="mt-[11px] font-mono text-[14px] leading-[1.4] font-medium text-ink">{url}</div>
          </div>

          <div className="flex-none rounded-[9px] bg-cream p-[16px_18px] text-[12.5px] leading-[1.7] text-ink/70">
            {STATE_NOTE[status] ?? STATE_NOTE.sent}
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-[9px] bg-cream p-[18px_20px]">
            <div className="eyebrow text-[9px] tracking-[.16em] text-ink/45">WHAT THE STUDENT AGREES TO</div>
            <p className="mt-[13px] text-[12.5px] leading-[1.8] text-ink/70">
              Results are shared with Kykology University so support and opportunities can be pointed at the right
              people. The student sees their own profile the moment they finish. Declining is recorded as declined —
              they are not chased.
            </p>
            <div className="mt-[15px] font-mono text-[11px] leading-[1.6] text-ink/45">
              36 STATEMENTS · PAGES OF THREE · NO RIGHT ANSWERS
            </div>
          </div>
        </div>

        <PhoneFrame>
          <Assessment />
        </PhoneFrame>
      </div>
    </>
  )
}

export default function StudentLinkPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[13px] text-ink/50">Loading…</div>}>
      <StudentLink />
    </Suspense>
  )
}
