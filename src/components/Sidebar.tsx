'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ANALYSE = [
  { href: '/overview', label: 'Overview' },
  { href: '/segments', label: 'Segments' },
  { href: '/longitudinal', label: 'Longitudinal' },
  { href: '/people', label: 'Students' },
]
const OPERATE = [
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/templates', label: 'Templates' },
]

function Group({ title, items, pathname }: { title: string; items: typeof ANALYSE; pathname: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="eyebrow px-5 pb-2 text-white/34">{title}</div>
      {items.map((it) => {
        const active = pathname.startsWith(it.href)
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`mx-2 rounded-md px-3 py-2 font-sans text-[12.5px] font-bold transition-colors ${
              active ? 'bg-white/12 text-white' : 'text-white/62 hover:bg-white/6 hover:text-white/90'
            }`}
          >
            {it.label}
          </Link>
        )
      })}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="flex w-[216px] flex-none flex-col gap-[22px] bg-ink pt-[22px] pb-[18px]">
      <div className="px-5">
        <div className="font-display text-[17px] leading-none font-semibold tracking-tight text-white">
          KYKOLOGY
        </div>
        <div className="eyebrow mt-1.5 text-white/34">840 STUDENTS · SEED 4B59A71D</div>
      </div>
      <Group title="Analyse" items={ANALYSE} pathname={pathname} />
      <Group title="Operate" items={OPERATE} pathname={pathname} />
    </aside>
  )
}
