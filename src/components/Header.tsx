export function Header({
  title,
  sub,
  children,
}: {
  title: string
  sub: string
  children?: React.ReactNode
}) {
  return (
    <header className="flex h-[70px] flex-none items-center gap-[18px] border-b border-ink/10 bg-white px-[26px]">
      <div className="min-w-[170px] flex-1 overflow-hidden">
        <h1 className="truncate font-display text-[20px] leading-[1.15] font-semibold tracking-[-.01em] text-ink">
          {title}
        </h1>
        <p className="mt-1 truncate text-[11.5px] leading-[1.3] text-ink/52">{sub}</p>
      </div>
      {children ? (
        <div className="ml-auto flex max-w-[70%] flex-none flex-wrap items-center justify-end gap-2">{children}</div>
      ) : null}
    </header>
  )
}

export function HeaderButton({
  children,
  onClick,
  tone = 'outline',
}: {
  children: React.ReactNode
  onClick?: () => void
  tone?: 'outline' | 'solid'
}) {
  return (
    <button
      onClick={onClick}
      className={
        tone === 'solid'
          ? 'cursor-pointer rounded-md bg-brass px-[15px] py-[11px] text-[12px] leading-none font-bold text-ink hover:opacity-90'
          : 'cursor-pointer rounded-md bg-white px-[15px] py-[11px] text-[12px] leading-none font-bold text-ink shadow-[inset_0_0_0_1px_rgba(20,40,60,.18)] hover:bg-cream'
      }
    >
      {children}
    </button>
  )
}
