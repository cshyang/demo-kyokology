'use client'

import { useState } from 'react'
import { useDemoData } from '@/lib/data/demo.ts'
import { useDemoState } from '@/lib/demo-state.tsx'

/**
 * "Invite someone" — present in the header of every admin screen in the design,
 * not just Overview.
 *
 * The whole point of the screen is the match line: type an address and it tells
 * you whether that person already exists. It is the answer to "send to anyone in
 * the database, or to people who aren't in it" without making the admin decide
 * which case they are in first.
 */

const TESTS = ['6D Profile', 'Resilience Snapshot', 'Values Compass']

export function QuickInvite() {
  const data = useDemoData()
  const { addPeople, invite, openInvite, closeInvite, setInviteEmail } = useDemoState()
  const [test, setTest] = useState(TESTS[0])
  const [toast, setToast] = useState('')

  const { open, email } = invite
  const addr = email.trim()
  const valid = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(addr)
  const known = data.students.find((st) => st.email === addr)

  const match = !addr
    ? null
    : known
      ? {
          text: `On record — ${known.name} · ${known.faculty} · ${known.intakeYear} intake. No second record is created.`,
          color: 'var(--color-teal)',
        }
      : valid
        ? { text: 'Not in the database — they will be created as a new person.', color: 'var(--color-gold)' }
        : { text: 'That is not a complete email address yet.', color: 'var(--color-rust)' }

  function send() {
    if (!valid) return
    if (!known) addPeople([{ name: addr, email: addr, faculty: 'Unassigned', intakeYear: 2026 }])
    setToast(`${known ? known.name : addr} invited to the ${test} · nothing was actually sent`)
    closeInvite()
  }

  return (
    <>
      <button
        onClick={() => openInvite()}
        className="cursor-pointer rounded-md bg-white px-[15px] py-[11px] text-[12px] leading-none font-bold text-ink inset-ring inset-ring-ink/18 hover:bg-cream"
      >
        Invite someone
      </button>

      {open && (
        <div
          className="backdrop-in fixed inset-0 z-80 flex items-center justify-center bg-ink/34"
          onClick={closeInvite}
          role="presentation"
        >
          <div
            className="panel-in w-[520px] overflow-hidden rounded-xl bg-white shadow-[0_24px_60px] shadow-ink/32"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-ink/8 px-6 py-5">
              <h2 className="font-display text-[19px] leading-[1.3] font-semibold text-ink">Invite someone</h2>
              <p className="mt-[7px] text-[12px] leading-[1.6] text-ink/60">
                One person, one test. It is filed under a one-off campaign so the funnel and reminders still work.
              </p>
            </div>

            <div className="flex flex-col gap-[14px] px-6 py-5">
              <div className="eyebrow tracking-[.16em] text-ink/45">Email address</div>
              <input
                type="text"
                autoFocus
                placeholder="name@kykology.edu"
                value={email}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full rounded-[7px] border border-ink/16 px-3 py-2.5 text-[12.5px] font-bold text-ink"
              />
              <div className="text-[11.5px] leading-[1.5]" style={{ color: match?.color }}>
                {match?.text ?? ' '}
              </div>

              <div className="eyebrow mt-1 tracking-[.16em] text-ink/45">Test</div>
              <div className="flex gap-2">
                {TESTS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTest(t)}
                    className={`cursor-pointer rounded-md px-[13px] py-2.5 text-[11.5px] leading-none font-bold ${
                      t === test
                        ? 'bg-ink text-white'
                        : 'bg-white text-ink inset-ring inset-ring-ink/16'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-ink/8 bg-cream px-6 py-4">
              <button
                onClick={closeInvite}
                className="cursor-pointer rounded-md bg-white px-[15px] py-[11px] text-[12px] leading-none font-bold text-ink inset-ring inset-ring-ink/18"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={!valid}
                className={`ml-auto rounded-md px-[17px] py-[11px] text-[12px] leading-none font-bold text-white ${
                  valid ? 'cursor-pointer bg-ink' : 'cursor-default bg-ink/30'
                }`}
              >
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          onClick={() => setToast('')}
          className="toast-in fixed bottom-[26px] left-1/2 z-90 flex -translate-x-1/2 cursor-pointer items-center gap-3 rounded-lg bg-ink px-[18px] py-[13px] text-white shadow-[0_6px_20px] shadow-ink/24"
        >
          <span className="size-[7px] rounded-full bg-brass" />
          <span className="text-[12.5px] leading-none">{toast}</span>
        </div>
      )}
    </>
  )
}
