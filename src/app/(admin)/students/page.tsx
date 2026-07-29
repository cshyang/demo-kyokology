'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { CohortFilters } from '@/components/CohortFilters'
import { useDemoData } from '@/lib/data/demo.ts'
import { recordFor, type CohortFilter } from '@/lib/data/derive.ts'

type Done = 'all' | 'done' | 'none'

const GRID = '[grid-template-columns:120px_210px_150px_62px_178px_minmax(0,1fr)]'

export default function StudentsPage() {
  const data = useDemoData()
  const [filter, setFilter] = useState<CohortFilter>({ fac: 'All', yr: 'All', wave: 'latest' })
  const [done, setDone] = useState<Done>('all')

  const rows = useMemo(
    () =>
      data.students
        .filter((st) => {
          if (filter.fac !== 'All' && st.faculty !== filter.fac) return false
          if (filter.yr !== 'All' && String(st.intakeYear) !== filter.yr) return false
          const r = recordFor(data, st.id, filter.wave)
          if (done === 'done') return !!r
          if (done === 'none') return !r
          return true
        })
        .map((st) => ({ st, r: recordFor(data, st.id, filter.wave) })),
    [data, filter, done],
  )

  return (
    <>
      <Header
        title="Students"
        sub={`${rows.length} of ${data.students.length} people match. Click a row for the profile.`}
        filters={
          <>
            <CohortFilters value={filter} onChange={setFilter} showWave={false} />
            <select
              className="rounded-md border border-ink/16 bg-white px-2 py-1.5 text-[12px] font-bold text-ink"
              value={done}
              onChange={(e) => setDone(e.target.value as Done)}
            >
              <option value="all">Any status</option>
              <option value="done">Has a profile</option>
              <option value="none">No profile yet</option>
            </select>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FCFCFA] px-[26px] py-[22px]">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-white">
          <div className={`grid flex-none gap-3.5 border-b border-ink/8 bg-cream p-[10px_18px] ${GRID}`}>
            {['STUDENT', 'EMAIL', 'FACULTY', 'INTAKE', 'ARCHETYPE', 'PATTERN'].map((h) => (
              <div key={h} className="eyebrow text-[8.5px] tracking-[.12em] text-ink/42">{h}</div>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {rows.map(({ st, r }) => {
              const seg = r ? data.SEGS.find((g) => g.id === r.seg)! : null
              return (
                <Link
                  key={st.id}
                  href={`/students/profile?id=${st.id}`}
                  className={`grid items-center gap-3.5 border-b border-ink/6 p-[12px_18px] text-[12px] leading-[1.3] text-ink/70 hover:bg-cream ${GRID}`}
                >
                  <div className="font-bold text-ink">{st.name}</div>
                  <div className="truncate font-mono text-[10.5px] leading-none text-ink/50">{st.email}</div>
                  <div>{st.faculty}</div>
                  <div className="font-mono text-[11px] leading-none">{st.intakeYear}</div>
                  <div>{r?.arch ?? <span className="text-ink/35">—</span>}</div>
                  <div className="flex items-center gap-[9px]">
                    {seg ? (
                      <>
                        <span className="size-2 flex-none rounded-full" style={{ background: seg.color }} />
                        {seg.name}
                      </>
                    ) : (
                      <span className="text-ink/35">Not yet assessed</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="eyebrow flex-none border-t border-ink/8 p-[12px_18px] text-[10.5px] tracking-normal text-ink/45">
            {rows.length} STUDENTS
          </div>
        </section>
      </div>
    </>
  )
}
