'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Header, HeaderButton } from '@/components/Header'
import { useDemoData } from '@/lib/data/demo.ts'
import { latest } from '@/lib/data/derive.ts'
import { useDemoState, type NewPerson } from '@/lib/demo-state'

const SAMPLE = `alex.tan@kykology.edu, Alex Tan, Engineering, 2026
priya.nair@kykology.edu, Priya Nair, Health, 2026
student0017@kykology.edu, Student 0017, Engineering, 2024`

interface ParsedRow {
  email: string
  name: string
  faculty: string
  intakeYear: number
}

/** email, name, faculty, intake — one per line. Blank and malformed lines are reported, not silently dropped. */
function parseCsv(text: string) {
  const rows: ParsedRow[] = []
  let bad = 0
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const parts = line.split(',').map((p) => p.trim())
    if (parts.length < 2 || !parts[0].includes('@')) { bad++; continue }
    rows.push({
      email: parts[0],
      name: parts[1],
      faculty: parts[2] || 'Unassigned',
      intakeYear: Number(parts[3]) || 2026,
    })
  }
  return { rows, bad }
}

const GRID = '[grid-template-columns:150px_220px_130px_60px_110px_minmax(0,1fr)_78px]'

export default function PeoplePage() {
  const data = useDemoData()
  const { newPeople, addPeople } = useDemoState()

  const [q, setQ] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [paste, setPaste] = useState(SAMPLE)
  const [dedupe, setDedupe] = useState<'skip' | 'update'>('skip')
  const [toast, setToast] = useState('')

  const everyone = useMemo(
    () => [
      ...newPeople.map((p) => ({ ...p, isNew: true })),
      ...data.students.map((s) => ({ ...s, isNew: false })),
    ],
    [data, newPeople],
  )

  const parsed = useMemo(() => parseCsv(paste), [paste])
  const existingEmails = useMemo(
    () => new Set(everyone.map((p) => p.email.toLowerCase())),
    [everyone],
  )
  const dupes = parsed.rows.filter((r) => existingEmails.has(r.email.toLowerCase()))
  const fresh = parsed.rows.filter((r) => !existingEmails.has(r.email.toLowerCase()))

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return everyone
      .filter((p) => !needle || p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle))
      .slice(0, 200)
  }, [everyone, q])

  function runImport() {
    const toAdd = dedupe === 'skip' ? fresh : parsed.rows.filter((r) => !existingEmails.has(r.email.toLowerCase()))
    addPeople(toAdd as Omit<NewPerson, 'id'>[])
    setImportOpen(false)
    setToast(
      `${toAdd.length} added · ${dupes.length} already on record and ${dedupe === 'skip' ? 'skipped' : 'left unchanged'}` +
        (parsed.bad ? ` · ${parsed.bad} lines could not be read` : '') +
        ' · nobody was invited',
    )
  }

  return (
    <>
      <Header title="People" sub={`${everyone.length} on record · importing never sends an invite`}>
        <HeaderButton onClick={() => setImportOpen((o) => !o)}>{importOpen ? 'Close' : 'Import CSV'}</HeaderButton>
      </Header>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-hidden bg-[#FCFCFA] px-[26px] py-[22px]">
        {toast && (
          <div className="flex-none rounded-[8px] border border-[#B7D3C7] bg-[#F1F7F4] p-[12px_16px] text-[12px] leading-none font-bold text-ink">
            {toast}
          </div>
        )}

        {importOpen && (
          <section className="flex-none overflow-hidden rounded-[9px] border border-ink/16">
            <div className="flex items-center gap-3 border-b border-ink/10 bg-cream p-[14px_18px]">
              <h2 className="text-[13px] leading-none font-bold text-ink">Import CSV</h2>
              <span className="eyebrow text-[9px] tracking-[.12em] text-ink/45">
                EMAIL, NAME, FACULTY, INTAKE · ONE PER LINE · IMPORTING NEVER SENDS AN INVITE
              </span>
            </div>
            <div className="grid gap-4 bg-white p-[16px_18px] [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
              <div>
                <textarea
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  rows={8}
                  className="w-full resize-none rounded-[7px] border border-ink/16 p-[13px_14px] font-mono text-[11.5px] leading-[1.7] text-ink"
                />
                <div className="mt-2 font-mono text-[10.5px] text-ink/50">
                  {parsed.rows.length} readable · {fresh.length} new · {dupes.length} already on record
                  {parsed.bad ? ` · ${parsed.bad} unreadable` : ''}
                </div>
              </div>
              <div className="flex flex-col rounded-[8px] bg-cream p-[15px_17px]">
                {dupes.length > 0 ? (
                  <>
                    <div className="eyebrow text-[9px] tracking-[.16em] text-gold">
                      {dupes.length} ALREADY IN THE DIRECTORY
                    </div>
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {dupes.slice(0, 4).map((d) => (
                        <div key={d.email} className="text-[12px] leading-[1.4] text-ink">
                          <span className="font-bold">{d.name}</span>
                          <span className="ml-2 font-mono text-[10.5px] text-ink/50">{d.email}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3.5 flex gap-2">
                      {(['skip', 'update'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setDedupe(mode)}
                          className={`cursor-pointer rounded-md px-[13px] py-[9px] text-[11.5px] leading-none font-bold ${
                            dedupe === mode ? 'bg-ink text-white' : 'border border-ink/18 bg-white text-ink'
                          }`}
                        >
                          {mode === 'skip' ? 'Skip them' : 'Update them'}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] leading-[1.6] text-ink/50">
                      No second record is created either way — matching is on email.
                    </p>
                  </>
                ) : (
                  <p className="text-[12px] leading-[1.7] text-ink/55">
                    Nothing in this paste matches an existing email. All {fresh.length} would be created fresh.
                  </p>
                )}
                <button
                  onClick={runImport}
                  disabled={parsed.rows.length === 0}
                  className="mt-auto cursor-pointer rounded-md bg-ink px-[14px] py-2.5 text-[11.5px] leading-none font-bold text-white hover:opacity-85 disabled:opacity-40"
                >
                  Import {dedupe === 'skip' ? fresh.length : parsed.rows.length} people
                </button>
                <p className="mt-3 text-[11px] leading-[1.6] text-ink/50">
                  New people land in the directory with no baseline. Inviting them is a separate, deliberate step.
                </p>
              </div>
            </div>
          </section>
        )}

        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${everyone.length} people by name or email`}
          className="w-full flex-none rounded-[7px] border border-ink/16 bg-white p-[10px_12px] text-[12.5px] font-bold text-ink"
        />

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-white">
          <div className={`grid flex-none gap-3 border-b border-ink/8 bg-cream p-[10px_18px] ${GRID}`}>
            {['PERSON', 'EMAIL', 'FACULTY', 'INTAKE', 'ASSESSMENT', 'PATTERN', ''].map((h, i) => (
              <div key={i} className="eyebrow text-[8.5px] tracking-[.12em] text-ink/42">{h}</div>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {rows.map((p) => {
              const r = p.isNew ? null : latest(data, p.id)
              const seg = r ? data.SEGS.find((g) => g.id === r.seg)! : null
              const waves = p.isNew
                ? 'None'
                : [data.w1[p.id], data.w2[p.id], data.w3[p.id]].filter(Boolean).length + '×'
              return (
                <div key={p.id} className={`grid items-center gap-3 border-b border-ink/6 p-[11px_18px] text-[12px] text-ink/70 hover:bg-cream ${GRID}`}>
                  <div className="flex items-center gap-2 font-bold text-ink">
                    {p.isNew && (
                      <span className="eyebrow rounded-[3px] bg-teal/12 px-1.5 py-0.5 text-[8px] tracking-[.1em] text-teal">
                        NEW
                      </span>
                    )}
                    <span className="truncate">{p.name}</span>
                  </div>
                  <div className="truncate font-mono text-[10.5px] text-ink/50">{p.email}</div>
                  <div>{p.faculty}</div>
                  <div className="font-mono text-[11px]">{p.intakeYear}</div>
                  <div className="font-mono text-[11px] text-ink/60">{waves}</div>
                  <div className="flex items-center gap-2">
                    {seg ? (
                      <>
                        <span className="size-2 flex-none rounded-full" style={{ background: seg.color }} />
                        <span className="truncate">{seg.name}</span>
                      </>
                    ) : (
                      <span className="text-ink/35">Not yet assessed</span>
                    )}
                  </div>
                  <div className="text-right">
                    {p.isNew ? (
                      <Link href="/campaigns/new" className="text-[11px] leading-none font-bold text-teal hover:underline">
                        Invite
                      </Link>
                    ) : (
                      <Link href={`/students/profile?id=${p.id}`} className="text-[11px] leading-none font-bold text-teal hover:underline">
                        View
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="eyebrow flex-none border-t border-ink/8 p-[12px_18px] text-[10.5px] tracking-normal text-ink/45">
            SHOWING {rows.length} OF {everyone.length}
          </div>
        </section>
      </div>
    </>
  )
}
