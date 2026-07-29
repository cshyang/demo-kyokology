'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDemoData } from '@/lib/data/demo.ts'
import { PER_PAGE, QUESTIONS, SCALE } from '@/lib/data/questions.ts'
import type { Dim } from '@/lib/data/generator.ts'

/**
 * Student-facing assessment. Deliberately outside the admin layout — this is
 * what lands in a student's inbox, and the first thing a prospect asks to see.
 *
 * Wrapped in a phone bezel rather than the prototype's full iOS chrome: the
 * point is "this is a phone", not a faithful reproduction of iOS.
 */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink p-6">
      <div className="w-full max-w-[392px]">
        <div className="relative overflow-hidden rounded-[42px] bg-black p-[10px] shadow-[0_24px_60px_rgba(0,0,0,.45)]">
          <div className="relative flex h-[760px] flex-col overflow-hidden rounded-[33px] bg-white">
            <div className="pointer-events-none absolute top-2 left-1/2 z-10 h-[26px] w-[104px] -translate-x-1/2 rounded-full bg-black" />
            {children}
          </div>
        </div>
        <p className="mt-4 text-center text-[11.5px] leading-[1.6] text-white/45">
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

  const [stage, setStage] = useState<'welcome' | 'questions' | 'done'>('welcome')
  const [consent, setConsent] = useState(false)
  const [page, setPage] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})

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

export default function StudentLinkPage() {
  return (
    <PhoneFrame>
      <Suspense fallback={<div className="p-8 text-[13px] text-ink/50">Loading…</div>}>
        <Assessment />
      </Suspense>
    </PhoneFrame>
  )
}
