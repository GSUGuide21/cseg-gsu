import { ArrowRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import type { FC, FocusEvent } from 'react'

import type { NavItem as NavItemConfig } from '@/globals/config/nav'
import { eyebrow } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

export type NavItemProps = {
  item: NavItemConfig
  active: boolean
  /** Only used when the item has a menu */
  menuOpen?: boolean
  onMenuOpen?: () => void
  onMenuClose?: (options?: { delay?: boolean }) => void
  onMenuToggle?: () => void
}

const linkClass = [
  'relative flex items-center text-[0.9rem] font-semibold text-ink-soft no-underline transition-colors',
  'hover:text-ink focus-visible:text-ink aria-[current=page]:text-brand',
  'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:scale-x-0 after:rounded-t-xs after:bg-brand after:transition-transform after:duration-200',
  'aria-[current=page]:after:scale-x-100',
].join(' ')

/** Desktop link; the current page gets a bar along the header's bottom edge. Items with a menu open a full-width subnav. */
export const NavItem: FC<NavItemProps> = ({
  item,
  active,
  menuOpen = false,
  onMenuOpen,
  onMenuClose,
  onMenuToggle,
}) => {
  const { href, label, menu } = item

  if (!menu) {
    return (
      <li className="flex">
        <Link href={href} aria-current={active ? 'page' : undefined} className={linkClass}>
          {label}
        </Link>
      </li>
    )
  }

  const panelId = `subnav-${label.toLowerCase()}`
  // Close once focus leaves the item and its panel entirely
  const onBlur = (e: FocusEvent<HTMLLIElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) onMenuClose?.()
  }

  return (
    <li
      className="flex items-stretch"
      onMouseEnter={onMenuOpen}
      onMouseLeave={() => onMenuClose?.({ delay: true })}
      onBlur={onBlur}
    >
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={linkClass}
        onClick={() => onMenuClose?.()}
      >
        {label}
      </Link>
      <button
        type="button"
        aria-expanded={menuOpen}
        aria-controls={panelId}
        aria-label={`${label} menu`}
        onClick={onMenuToggle}
        className="group ml-0.5 flex cursor-pointer items-center px-1 text-ink-soft transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-brand aria-expanded:text-brand"
      >
        <ChevronDown
          size={15}
          className="transition-transform duration-200 group-aria-expanded:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </button>

      {/* Breaks out of the header's centered container to span the full viewport width */}
      <div
        id={panelId}
        className={cn(
          'absolute top-full left-[calc(50%-50vw)] w-screen border-y border-line bg-surface',
          'shadow-[0_14px_30px_rgba(15,23,41,0.08)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.5)]',
          'transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none',
          menuOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
        )}
        inert={!menuOpen}
      >
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(14rem,0.8fr)_minmax(0,2fr)] gap-x-[clamp(1.5rem,3vw,3rem)] px-[clamp(1rem,3vw,2.5rem)] py-7">
          <div className="flex flex-col gap-3 border-r border-line pr-[clamp(1.5rem,3vw,3rem)]">
            <p className={eyebrow}>{label}</p>
            <p className="text-[0.9rem] leading-relaxed text-muted">{menu.description}</p>
            <Link
              href={href}
              onClick={() => onMenuClose?.()}
              className="mt-auto inline-flex w-fit items-center gap-1.5 text-[0.85rem] font-semibold text-brand no-underline hover:underline"
            >
              Go to {label}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] content-start gap-1">
            {menu.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => onMenuClose?.()}
                  className="group flex flex-col gap-0.5 rounded-lg px-3 py-2 text-ink no-underline transition-colors hover:bg-brand-wash focus-visible:bg-brand-wash focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span className="text-[0.9rem] font-bold group-hover:text-brand">{link.label}</span>
                  {link.description ? (
                    <span className="text-[0.8rem] leading-snug text-muted">{link.description}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  )
}
