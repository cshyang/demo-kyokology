'use client'

import type { CohortFilter, Wave } from '@/lib/data/derive.ts'

const SELECT =
  'rounded-md border border-ink/16 bg-white px-2 py-1.5 text-[12px] font-bold text-ink'

export function CohortFilters({
  value,
  onChange,
  showWave = true,
}: {
  value: CohortFilter
  onChange: (next: CohortFilter) => void
  showWave?: boolean
}) {
  return (
    <div className="flex gap-2">
      <select className={SELECT} value={value.fac} onChange={(e) => onChange({ ...value, fac: e.target.value })}>
        <option value="All">All faculties</option>
        <option value="Engineering">Engineering</option>
        <option value="Arts">Arts</option>
        <option value="Business">Business</option>
        <option value="Health">Health</option>
      </select>
      <select className={SELECT} value={value.yr} onChange={(e) => onChange({ ...value, yr: e.target.value })}>
        <option value="All">All intakes</option>
        <option value="2024">2024 intake</option>
        <option value="2025">2025 intake</option>
        <option value="2026">2026 intake</option>
      </select>
      {showWave ? (
        <select
          className={SELECT}
          value={value.wave}
          onChange={(e) => onChange({ ...value, wave: e.target.value as Wave })}
        >
          <option value="latest">Latest profile</option>
          <option value="w1">First assessment · Oct 2025</option>
          <option value="w2">Re-assessment · Oct 2026</option>
        </select>
      ) : null}
    </div>
  )
}
