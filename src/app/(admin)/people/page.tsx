'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header, HeaderButton } from '@/components/Header'
import { useDemoData } from '@/lib/data/demo.ts'
import { useDemoState, type NewPerson } from '@/lib/demo-state'
import { tint } from '@/lib/color'

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

const GRID = '[grid-template-columns:130px_200px_110px_52px_minmax(0,1fr)_minmax(0,1fr)_60px]'
const SELECT = 'rounded-md border border-ink/16 bg-white px-2 py-1.5 text-[12px] font-bold text-ink'

type Done = 'all' | 'done' | 'none'

export default function PeoplePage() {
  const data = useDemoData()
  const router = useRouter()
  const { newPeople, addPeople, openInvite } = useDemoState()

  const [fac, setFac] = useState('All')
  const [yr, setYr] = useState('All')
  const [done, setDone] = useState<Done>('all')
  const [pattern, setPattern] = useState('All')
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

  /**
   * Imported people sit above the roster, not inside it — they have no faculty,
   * no intake and no baseline, so they would sort into a gap otherwise. They drop
   * out entirely once you search, ask for people who already have a profile, or
   * ask for a behavioural pattern — a pattern implies a record, and they have none.
   */
  const { rows, matched, more } = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const hit = (p: { name: string; email: string }) =>
      !needle || p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle)

    const roster = data.students.filter((st) => {
      if (fac !== 'All' && st.faculty !== fac) return false
      if (yr !== 'All' && String(st.intakeYear) !== yr) return false
      // The same expression the PATTERN column renders from, deliberately — a
      // filter reading a different record than the column it filters would
      // disagree with the screen it is standing on.
      const rec = data.w2[st.id] ?? data.w3[st.id]
      if (pattern !== 'All' && rec?.seg !== pattern) return false
      const assessed = !!rec
      if (done === 'done' && !assessed) return false
      if (done === 'none' && assessed) return false
      return hit(st)
    })

    const fresh = needle || done === 'done' || pattern !== 'All' ? [] : newPeople.filter(hit)
    const matched = roster.length + fresh.length
    return {
      matched,
      more: roster.length > 60 ? `Showing the first 60 of ${roster.length}` : `All ${matched} shown`,
      rows: [
        ...fresh.map((p) => ({ isNew: true as const, person: p })),
        ...roster.slice(0, 60).map((st) => ({ isNew: false as const, person: st })),
      ],
    }
  }, [data, newPeople, fac, yr, done, pattern, q])

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
      <Header
        title="People"
        sub={`${matched} on record — the operational directory: who exists, and whether they have ever been assessed.`}
        filters={
          <>
            <select className={SELECT} value={fac} onChange={(e) => setFac(e.target.value)}>
              <option value="All">All faculties</option>
              {data.FACULTIES.map((f) => (
                <option key={f.name} value={f.name}>{f.name}</option>
              ))}
            </select>
            <select className={SELECT} value={yr} onChange={(e) => setYr(e.target.value)}>
              <option value="All">All intakes</option>
              <option value="2024">2024 intake</option>
              <option value="2025">2025 intake</option>
              <option value="2026">2026 intake</option>
            </select>
            <select className={SELECT} value={done} onChange={(e) => setDone(e.target.value as Done)}>
              <option value="all">Any status</option>
              <option value="done">Has a profile</option>
              <option value="none">No profile yet</option>
            </select>
            <HeaderButton onClick={() => setImportOpen((o) => !o)}>{importOpen ? 'Close' : 'Import CSV'}</HeaderButton>
          </>
        }
      />

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

        {/*
          The pattern filter sits here rather than in the header for two reasons.
          A fifth control wrapped the header row and pushed "Invite someone" onto
          a second line, and a select sizes itself to its widest option — "Driven,
          Under-Regulated" is wide. It also belongs next to search: both narrow
          the list you are looking at, where the three header selects scope the
          cohort. Segments already lists each pattern; this exists because only
          People holds email and the invite button, so "this pattern, not yet
          reached" is answerable here and nowhere else.
        */}
        <div className="flex flex-none items-center gap-2.5">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${everyone.length} people by name or email`}
            className="w-full max-w-[360px] rounded-[7px] border border-ink/16 bg-white p-[10px_12px] text-[12.5px] font-bold text-ink"
          />
          <select
            className={`${SELECT} py-2.5`}
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          >
            <option value="All">All patterns</option>
            {data.SEGS.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          {pattern !== 'All' && (
            <span className="font-mono text-[10.5px] leading-none text-ink/45">
              IMPORTED PEOPLE HIDDEN — A PATTERN NEEDS A PROFILE
            </span>
          )}
        </div>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-white">
          <div className={`grid flex-none gap-3 border-b border-ink/8 bg-cream p-[10px_18px] ${GRID}`}>
            {['PERSON', 'EMAIL', 'FACULTY', 'INTAKE', 'ASSESSMENT', 'PATTERN', ''].map((h, i) => (
              <div key={i} className="eyebrow text-[8.5px] tracking-[.12em] text-ink/42">{h}</div>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {rows.map(({ isNew, person }) => {
              const id = person.id
              const rec = isNew ? null : data.w2[id] ?? data.w3[id]
              const seg = rec ? data.SEGS.find((g) => g.id === rec.seg)! : null
              const n = isNew ? 0 : [data.w1[id], data.w2[id], data.w3[id]].filter(Boolean).length
              const last = isNew ? null : data.w2[id] ?? data.w3[id] ?? data.w1[id]

              // Three states, three colours: never assessed is a gap worth chasing
              // (rust), an import with no baseline is pending (gold), a real history
              // is just information (muted).
              const assessment = isNew
                ? { text: 'NO BASELINE', color: 'var(--color-gold)' }
                : n
                  ? { text: `ASSESSED ${n}\u00d7 \u00b7 LAST ${last!.at.toUpperCase()}`, color: tint('ink', 55) }
                  : { text: 'NEVER ASSESSED', color: 'var(--color-rust)' }

              return (
                <div
                  key={id}
                  onClick={() => n > 0 && router.push(`/students/profile?id=${id}`)}
                  className={`grid items-center gap-3 border-b border-ink/6 p-[11px_18px] text-[12px] text-ink/70 hover:bg-cream ${n > 0 ? 'cursor-pointer' : ''} ${GRID}`}
                >
                  <div className="flex items-center gap-2 font-bold text-ink">
                    {isNew && (
                      <span className="eyebrow rounded-[3px] bg-teal/12 px-1.5 py-0.5 text-[8px] tracking-[.1em] text-teal">
                        NEW
                      </span>
                    )}
                    <span className="truncate">{person.name}</span>
                  </div>
                  <div className="truncate font-mono text-[10.5px] text-ink/50">{person.email}</div>
                  <div>{person.faculty || '\u2014'}</div>
                  <div className="font-mono text-[11px]">{person.intakeYear || '\u2014'}</div>
                  <div className="font-mono text-[10px] leading-none" style={{ color: assessment.color }}>
                    {assessment.text}
                  </div>
                  <div className="flex items-center gap-2">
                    {seg ? (
                      <>
                        <span className="size-2 flex-none rounded-full" style={{ background: seg.color }} />
                        <span className="truncate">{seg.name}</span>
                      </>
                    ) : (
                      <span className="text-ink/35">{'\u2014'}</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); openInvite(person.email) }}
                    className="cursor-pointer text-right text-[11px] leading-none font-bold text-teal hover:underline"
                  >
                    Invite
                  </button>
                </div>
              )
            })}
          </div>
          <div className="flex-none border-t border-ink/8 p-[12px_18px] text-[11.5px] leading-none text-ink/45">
            {more}
          </div>
        </section>
      </div>
    </>
  )
}
