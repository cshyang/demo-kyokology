'use client'

import { useState } from 'react'
import { Header, HeaderButton } from '@/components/Header'
import { useDemoState, type TemplateKind } from '@/lib/demo-state'

const KINDS: { id: TemplateKind; label: string; when: string }[] = [
  { id: 'invite', label: 'Invitation', when: 'Sent when a campaign goes out' },
  { id: 'reminder', label: 'Reminder', when: 'Sent by the nudge rule, or manually from a campaign' },
  { id: 'thanks', label: 'Thank you', when: 'Sent once a student completes the assessment' },
]

const VARS = [
  { token: '{{student_name}}', sample: 'Priya Nair' },
  { token: '{{test_name}}', sample: '6D Profile' },
  { token: '{{deadline}}', sample: '14 Nov 2026' },
]

/** Substitutes the sample values so the preview reads as a real email, not a template. */
function render(text: string) {
  return VARS.reduce((acc, v) => acc.split(v.token).join(v.sample), text)
}

export default function TemplatesPage() {
  const { templates, setTemplate, resetTemplates } = useDemoState()
  const [kind, setKind] = useState<TemplateKind>('invite')
  const tpl = templates[kind]
  const meta = KINDS.find((k) => k.id === kind)!

  return (
    <>
      <Header title="Templates" sub="Three messages · edits apply everywhere they are used">
        <HeaderButton onClick={resetTemplates}>Reset to default</HeaderButton>
      </Header>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto bg-[#FCFCFA] px-[26px] py-[22px]">
        <div className="flex flex-none flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              className={`cursor-pointer rounded-md px-3.5 py-2.5 text-[11.5px] leading-none font-bold ${
                kind === k.id ? 'bg-ink text-white' : 'border border-ink/16 bg-white text-ink hover:bg-parchment'
              }`}
            >
              {k.label}
            </button>
          ))}
          <span className="self-center text-[11.5px] text-ink/50">{meta.when}</span>
        </div>

        <div className="grid flex-1 gap-4 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
          <section className="flex flex-col rounded-[10px] border border-ink/10 bg-white p-[18px_20px]">
            <h2 className="text-[13px] leading-none font-bold text-ink">Edit</h2>

            <label className="eyebrow mt-4 block text-[9px] tracking-[.14em] text-ink/45">SUBJECT</label>
            <input
              type="text"
              value={tpl.subject}
              onChange={(e) => setTemplate(kind, { ...tpl, subject: e.target.value })}
              className="mt-1.5 w-full rounded-[7px] border border-ink/16 p-[10px_12px] text-[12.5px] font-bold text-ink"
            />

            <label className="eyebrow mt-4 block text-[9px] tracking-[.14em] text-ink/45">BODY</label>
            <textarea
              value={tpl.body}
              onChange={(e) => setTemplate(kind, { ...tpl, body: e.target.value })}
              rows={14}
              className="mt-1.5 w-full flex-1 resize-none rounded-[7px] border border-ink/16 p-[13px_14px] text-[12.5px] leading-[1.7] text-ink"
            />

            <div className="mt-3.5 border-t border-ink/8 pt-3">
              <div className="eyebrow text-[9px] tracking-[.14em] text-ink/45">VARIABLES</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {VARS.map((v) => (
                  <button
                    key={v.token}
                    onClick={() => setTemplate(kind, { ...tpl, body: tpl.body + v.token })}
                    className="cursor-pointer rounded-[5px] bg-cream px-2 py-1.5 font-mono text-[10.5px] text-ink/70 hover:bg-parchment"
                  >
                    {v.token}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="flex flex-col rounded-[10px] border border-ink/10 bg-white p-[18px_20px]">
            <div className="flex items-baseline gap-3">
              <h2 className="text-[13px] leading-none font-bold text-ink">Preview</h2>
              <span className="eyebrow ml-auto text-[9px] tracking-[.12em] text-ink/45">VARIABLES FILLED IN</span>
            </div>

            <div className="mt-4 flex-1 rounded-[8px] bg-cream p-[18px_20px]">
              <div className="eyebrow text-[8.5px] tracking-[.14em] text-ink/45">FROM</div>
              <div className="mt-1.5 text-[12px] text-ink/70">
                Student Services · <span className="font-mono text-[11px]">no-reply@kykology.edu</span>
              </div>

              <div className="eyebrow mt-3.5 text-[8.5px] tracking-[.14em] text-ink/45">SUBJECT</div>
              <div className="mt-1.5 text-[13.5px] leading-[1.4] font-bold text-ink">{render(tpl.subject)}</div>

              <div className="mt-4 border-t border-ink/10 pt-4 text-[12.5px] leading-[1.8] whitespace-pre-line text-ink/75">
                {render(tpl.body)}
              </div>

              <div className="mt-5 rounded-[6px] bg-white p-[12px_14px]">
                <div className="text-[11.5px] leading-[1.6] text-ink/55">
                  Every message carries the student’s own link. Nothing in this demo is actually delivered.
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
