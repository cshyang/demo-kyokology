'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { useDemoData } from '@/lib/data/demo.ts'
import { useDemoState, type TemplateKind } from '@/lib/demo-state'

const KINDS: { id: TemplateKind; label: string }[] = [
  { id: 'invite', label: 'Invite' },
  { id: 'reminder', label: 'Reminder' },
  { id: 'thanks', label: 'Thank-you' },
]

const TOKENS = ['{{student_name}}', '{{test_name}}', '{{deadline}}']

export default function TemplatesPage() {
  const data = useDemoData()
  const { templates, setTemplate } = useDemoState()
  const [kind, setKind] = useState<TemplateKind>('invite')
  const tpl = templates[kind]

  /**
   * The preview resolves against a real student, not a placeholder — that is the
   * whole claim the screen is making. Picking the first person with a third-wave
   * record gives someone who genuinely received this campaign.
   */
  const sample = data.byId[Object.keys(data.w3)[0]]
  const resolve = (text: string) =>
    text
      .split('{{student_name}}')
      .join(sample.name)
      .split('{{test_name}}')
      .join('the KYKOLOGY 6D Profile')
      .split('{{deadline}}')
      .join('7 November 2026')

  return (
    <>
      <Header title="Templates" sub="Edit on the left, preview on the right. Tokens resolve against a real student." />

      <div className="grid min-h-0 flex-1 items-stretch gap-4 overflow-auto bg-[#FCFCFA] px-[26px] py-[22px] [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        <div className="flex min-h-0 flex-col gap-3.5">
          <div className="flex flex-none items-center gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`cursor-pointer rounded-[20px] px-[15px] py-2.5 text-[11.5px] leading-none font-bold ${
                  kind === k.id ? 'bg-ink text-white' : 'bg-white text-ink shadow-[inset_0_0_0_1px_rgba(20,40,60,.16)]'
                }`}
              >
                {k.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              {TOKENS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTemplate(kind, { ...tpl, body: tpl.body + t })}
                  className="cursor-pointer rounded-[4px] bg-parchment px-[9px] py-[7px] font-mono text-[9.5px] leading-none font-medium text-ink"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3.5 rounded-[10px] border border-ink/10 bg-white p-[18px_20px]">
            <div className="eyebrow flex-none text-[9px] tracking-[.16em] text-ink/45">SUBJECT</div>
            <input
              type="text"
              value={tpl.subject}
              onChange={(e) => setTemplate(kind, { ...tpl, subject: e.target.value })}
              className="w-full rounded-[7px] border border-ink/16 p-[10px_12px] text-[12.5px] font-bold text-ink"
            />
            <div className="eyebrow flex-none text-[9px] tracking-[.16em] text-ink/45">BODY</div>
            <textarea
              value={tpl.body}
              onChange={(e) => setTemplate(kind, { ...tpl, body: e.target.value })}
              className="w-full flex-1 resize-none rounded-[7px] border border-ink/16 p-[13px_14px] text-[12.5px] leading-[1.7] text-ink"
            />
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-white">
          <div className="flex flex-none items-center gap-3 border-b border-ink/8 bg-cream p-[14px_18px]">
            <h2 className="text-[13px] leading-none font-bold text-ink">Preview</h2>
            <div className="font-mono text-[10.5px] leading-none font-medium text-ink/45">
              AS {sample.name} · {sample.faculty} · {sample.intakeYear} intake
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-[26px_28px]">
            <div className="font-mono text-[11px] leading-none text-ink/40">FROM Student Services · KYKOLOGY</div>
            <div className="mt-3.5 mb-[18px] border-b border-ink/8 pb-4 font-display text-[18px] leading-[1.4] font-semibold text-ink">
              {resolve(tpl.subject)}
            </div>
            <div className="text-[13.5px] leading-[1.8] whitespace-pre-wrap text-ink/80">{resolve(tpl.body)}</div>
            <div className="mt-[26px] inline-block rounded-md bg-ink px-[19px] py-[13px] text-[12px] leading-none font-bold text-white">
              Start your profile
            </div>
            <div className="mt-6 font-mono text-[10.5px] leading-[1.6] text-ink/40">
              Sent to {sample.email} · no mail is delivered in this demo
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
