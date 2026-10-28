import Link from 'next/link'
import type { FC } from 'react'

import { NAV_LINKS, type NavItem } from '@/globals/config/nav'
import { SocialIcons } from '@/globals/SocialIcons'
import { button } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

/** Subnav links worth repeating on mobile: pages that aren't already top-level items. */
const subLinksFor = (menu: NavItem['menu']) =>
  (menu?.links ?? []).filter((l) => !NAV_LINKS.some((top) => top.href === l.href))

export type MobileNavProps = {
  open: boolean
  links: readonly NavItem[]
  isActive: (href: string) => boolean
  onNavigate: () => void
}

export const MobileNav: FC<MobileNavProps> = ({ open, links, isActive, onNavigate }) => (
  <div
    id="mobile-menu"
    className={cn(
      'fixed inset-x-0 top-header z-40 flex max-h-[calc(100dvh-var(--header-height))] flex-col gap-5 overflow-y-auto',
      'border-b border-line bg-surface px-[clamp(1rem,3vw,2.5rem)] pt-3 pb-6',
      'shadow-[0_12px_28px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_28px_rgba(0,0,0,0.55)]',
      'transition-[opacity,transform,visibility] duration-200 ease-out lg:hidden',
      open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0'
    )}
    role="dialog"
    aria-label="Mobile navigation"
    inert={!open}
  >
    <ul className="divide-y divide-line">
      {links.map(({ href, label, menu }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            onClick={onNavigate}
            className="block px-1 py-[0.95rem] text-[1.05rem] font-bold text-ink no-underline transition-colors hover:text-brand aria-[current=page]:text-brand"
          >
            {label}
          </Link>
          {subLinksFor(menu).length > 0 ? (
            <ul className="-mt-1 flex flex-wrap gap-x-5 gap-y-1 pb-[0.85rem] pl-1">
              {subLinksFor(menu).map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    className="text-[0.9rem] text-muted no-underline transition-colors hover:text-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
    <div className="flex flex-col gap-4">
      <Link
        href="/join"
        onClick={onNavigate}
        className={button({ className: 'w-full px-4 py-[calc(0.9rem-2px)]' })}
      >
        Join CSEG &rarr;
      </Link>
      <SocialIcons size="lg" />
    </div>
  </div>
)
