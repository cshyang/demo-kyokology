'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

/**
 * Chrome, ported from the design project rather than from the spec's IA.
 *
 * The two differ, and the design wins: Overview stands alone, the three
 * analysis screens nest under an "Insights" heading, and there is no Students
 * entry — that screen is reached by drilling into a person. The nesting is
 * carried by weight and indent, not by a bullet: parents are bold 13px at 20px
 * of padding, children regular 12.5px at 34px. Flattening them to one weight is
 * what made the group read as a list of eight peers.
 */

const ICON = 'size-3.5 flex-none'
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const OverviewIcon = () => (
  <svg viewBox="0 0 16 16" className={ICON} {...stroke}>
    <rect x="1.5" y="1.5" width="5.6" height="7.6" rx="1" />
    <rect x="8.9" y="1.5" width="5.6" height="4.2" rx="1" />
    <rect x="8.9" y="7.5" width="5.6" height="7" rx="1" />
    <rect x="1.5" y="10.9" width="5.6" height="3.6" rx="1" />
  </svg>
)
const FingerprintIcon = () => (
  <svg viewBox="0 0 16 16" className={ICON} {...stroke}>
    <polygon points="8,1.5 14,5 14,11 8,14.5 2,11 2,5" />
    <circle cx="8" cy="8" r="2.6" />
  </svg>
)
const SegmentsIcon = () => (
  <svg viewBox="0 0 16 16" className={ICON} {...stroke}>
    <rect x="1.5" y="1.5" width="5.6" height="5.6" rx="1" />
    <rect x="8.9" y="1.5" width="5.6" height="5.6" rx="1" />
    <rect x="1.5" y="8.9" width="5.6" height="5.6" rx="1" />
    <rect x="8.9" y="8.9" width="5.6" height="5.6" rx="1" />
  </svg>
)
const LongitudinalIcon = () => (
  <svg viewBox="0 0 16 16" className={ICON} {...stroke}>
    <polyline points="1.5,12.5 5.5,8 9,10.5 14.5,3.5" />
    <circle cx="14.5" cy="3.5" r="1.3" fill="currentColor" stroke="none" />
  </svg>
)
const ReadinessIcon = () => (
  <svg viewBox="0 0 16 16" className={ICON} {...stroke}>
    <path d="M1.5 13.8h13" />
    <rect x="2.6" y="9.2" width="2.9" height="4.6" rx=".6" />
    <rect x="6.55" y="6" width="2.9" height="7.8" rx=".6" />
    <rect x="10.5" y="2.8" width="2.9" height="11" rx=".6" />
  </svg>
)
const CampaignsIcon = () => (
  <svg viewBox="0 0 16 16" className={ICON} {...stroke}>
    <path d="M1.5 3.5h13v9h-13z" />
    <polyline points="1.5,4 8,8.5 14.5,4" />
  </svg>
)
const PeopleIcon = () => (
  <svg viewBox="0 0 16 16" className={ICON} {...stroke}>
    <circle cx="5.6" cy="5.4" r="2.4" />
    <path d="M1.5 13.5c0-2.3 1.8-3.8 4.1-3.8s4.1 1.5 4.1 3.8" />
    <circle cx="11.4" cy="5.9" r="1.9" />
    <path d="M11 9.9c2 0 3.5 1.4 3.5 3.3" />
  </svg>
)
const TemplatesIcon = () => (
  <svg viewBox="0 0 16 16" className={ICON} {...stroke}>
    <rect x="2.5" y="1.5" width="11" height="13" rx="1.2" />
    <path d="M5.2 5h5.6M5.2 8h5.6M5.2 11h3.4" />
  </svg>
)

interface NavItem {
  href: string
  label: string
  Icon: () => React.ReactElement
  /**
   * Route prefixes that also light this item up. A student profile lives under
   * /students/ but belongs to People — that is the only way into it.
   */
  also?: string[]
}

const OVERVIEW: NavItem = { href: '/overview', label: 'Overview', Icon: OverviewIcon }
const INSIGHTS: NavItem[] = [
  { href: '/fingerprint', label: 'Fingerprint', Icon: FingerprintIcon },
  { href: '/segments', label: 'Segments', Icon: SegmentsIcon },
  { href: '/readiness', label: 'Readiness', Icon: ReadinessIcon },
  { href: '/longitudinal', label: 'Longitudinal', Icon: LongitudinalIcon },
]
const OPERATE: NavItem[] = [
  { href: '/campaigns', label: 'Campaigns', Icon: CampaignsIcon },
  { href: '/people', label: 'People', Icon: PeopleIcon, also: ['/students'] },
  { href: '/templates', label: 'Templates', Icon: TemplatesIcon },
]

function isActive(item: NavItem, pathname: string) {
  return [item.href, ...(item.also ?? [])].some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function NavLink({
  item,
  pathname,
  collapsed,
  nested = false,
}: {
  item: NavItem
  pathname: string
  collapsed: boolean
  nested?: boolean
}) {
  const active = isActive(item, pathname)
  const pad = collapsed ? 'py-[9px] justify-center' : nested ? 'py-[9px] pr-5 pl-[34px]' : 'py-2.5 px-5'
  const type = nested ? 'gap-2.5 text-[12.5px] font-normal' : 'gap-[11px] text-[13px] font-bold'
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center leading-none ${pad} ${type} ${
        active
          ? 'bg-white/10 text-white shadow-[inset_2px_0_0_var(--color-brass)]'
          : 'text-white/62 hover:text-white'
      }`}
    >
      <item.Icon />
      {collapsed ? null : <span>{item.label}</span>}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className="relative flex flex-none flex-col gap-[22px] overflow-visible bg-ink pt-[22px] pb-[18px] transition-[width] duration-200"
      style={{ width: collapsed ? 56 : 216 }}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-[13px] z-40 flex size-[26px] cursor-pointer items-center justify-center rounded-full bg-white text-[14px] leading-none font-bold text-ink shadow-[0_1px_4px_rgba(20,40,60,.28),inset_0_0_0_1px_rgba(20,40,60,.14)] select-none hover:bg-cream"
        style={{ top: 'calc(var(--spacing-header) - 13px)' }}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* ponytail: plain <img>, not next/image — static export would need unoptimized anyway. */}
      {collapsed ? (
        <div className="flex justify-center pb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kykology-wordmark.png" alt="K" className="block size-[30px] object-cover object-left" />
        </div>
      ) : (
        <div className="px-5 pb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kykology-wordmark.png" alt="KYKOLOGY" className="block w-[134px]" />
        </div>
      )}

      <div className="flex flex-col gap-[3px]">
        {collapsed ? null : <div className="nav-group px-5 pb-[7px] text-white/38">Analyse</div>}
        <NavLink item={OVERVIEW} pathname={pathname} collapsed={collapsed} />
        {collapsed ? null : (
          <div className="px-5 py-2 text-[13px] leading-none font-bold text-white/72">Insights</div>
        )}
        {INSIGHTS.map((it) => (
          <NavLink key={it.href} item={it} pathname={pathname} collapsed={collapsed} nested />
        ))}
      </div>

      <div className="flex flex-col gap-[3px]">
        {collapsed ? null : <div className="nav-group px-5 pb-[7px] text-white/38">Operate</div>}
        {OPERATE.map((it) => (
          <NavLink key={it.href} item={it} pathname={pathname} collapsed={collapsed} />
        ))}
      </div>

      {collapsed ? null : (
        <div className="mt-auto flex flex-col gap-[5px] border-t border-white/10 px-5 pt-4">
          <div className="seed-line text-white/34">6D PROFILE · 100 QUESTIONS</div>
          <div className="seed-line text-white/34">840 STUDENTS · SEED 4B59A71D</div>
        </div>
      )}
    </aside>
  )
}
