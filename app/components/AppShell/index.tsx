'use client'

import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type FC, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Offcanvas } from '../Offcanvas'
import { Tooltip } from '../Tooltip'
import type { AppShellProps, NavItem, NavSection } from './types'

/** Whether a link is the page being viewed (or, unless `exact`, a section it's under) */
export const isActive = (item: NavItem, pathname: string) => {
  const href = item.href.split(/[?#]/)[0]
  if (item.exact ?? href === '/') return pathname === href
  return pathname === href || pathname.startsWith(href.endsWith('/') ? href : `${href}/`)
}

const NavLinks: FC<{ nav: NavSection[]; pathname: string; collapsed: boolean; onNavigate?: () => void }> = ({ nav, pathname, collapsed, onNavigate }) => (
  <div className={cn('flex flex-col', collapsed ? 'gap-2' : 'gap-5')}>
    {nav.map((section, s) => (
      // Narrowed to icons there are no headings, so a line tells the sections apart
      <div key={s} className={cn('flex flex-col gap-1', collapsed && s > 0 && 'border-t border-line pt-2')}>
        {section.label ? (
          <p className={cn('m-0 px-3 pb-1 text-[0.7rem] font-bold tracking-wider text-muted uppercase', collapsed && 'sr-only')}>{section.label}</p>
        ) : null}
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {section.items.map((item) => {
            const on = isActive(item, pathname)
            const link = (
              <Link
                href={item.href}
                aria-current={on ? 'page' : undefined}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-[0.9rem] font-semibold no-underline transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                  '[&>svg]:size-4.5 [&>svg]:shrink-0',
                  // The focus ring sits outside the blue fill, where it can be seen
                  on ? 'bg-linear-to-r from-brand-solid to-brand-bright text-white shadow-card focus-visible:outline-offset-2' : 'text-ink-soft hover:bg-brand-tint hover:text-ink',
                  collapsed && 'size-10 justify-center px-0 py-0'
                )}
              >
                {item.icon}
                <span className={cn('min-w-0 flex-1 truncate', collapsed && 'sr-only')}>{item.label}</span>
                {item.count !== undefined ? (
                  collapsed ? (
                    <span className="sr-only">, {item.count}</span>
                  ) : (
                    <span className={cn('min-w-5 rounded-full px-1.5 py-0.5 text-center text-[0.7rem] leading-none tabular-nums', on ? 'bg-white/20' : 'bg-fill')}>{item.count}</span>
                  )
                ) : null}
              </Link>
            )
            return (
              <li key={item.href} className={cn(collapsed && 'flex justify-center')}>
                {/* Narrowed to icons, the name shows on hover and focus */}
                {collapsed ? (
                  <Tooltip content={item.label} side="right" delay={150}>
                    {link}
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            )
          })}
        </ul>
      </div>
    ))}
  </div>
)

/**
 * The frame of a dashboard: a sidebar of links beside a top bar and the page's content.
 *
 *   <AppShell
 *     brand={<Logo />}
 *     nav={[{ items: [{ label: 'Overview', href: '/dashboard', icon: <Home />, exact: true }] },
 *           { label: 'Club', items: [{ label: 'Members', href: '/dashboard/members', icon: <Users /> }] }]}
 *     topbar={<><CommandPalette commands={…} /><ActionMenu trigger={<Avatar … />} … /></>}
 *   >
 *     {page}
 *   </AppShell>
 *
 * On wide screens the sidebar stays in view as the page scrolls, with its links scrolling
 * between a fixed top and bottom if they don't fit. It can be narrowed to icons, and with
 * `persistKey` it stays that way. On narrow screens it's behind a menu button, in a panel
 * that slides in. The link to the page being viewed is marked aria-current="page".
 */
export const AppShell: FC<AppShellProps> = ({ nav, brand, brandMark, topbar, sidebarFooter, children, defaultCollapsed = false, persistKey, 'aria-label': ariaLabel = 'Dashboard', className }) => {
  const pathname = usePathname() ?? ''
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  // Only a click animates: restoring a saved width on load shouldn't slide the page across
  const [animated, setAnimated] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const links = nav.filter((s) => !s.pinned)
  const pinned = nav.filter((s) => s.pinned)

  // The browser's saved choice, once there's a browser to ask
  useEffect(() => {
    if (!persistKey) return
    try {
      const saved = window.localStorage.getItem(persistKey)
      if (saved === 'collapsed' || saved === 'expanded') setCollapsed(saved === 'collapsed')
    } catch {
      // Storage is off: it just won't be remembered
    }
  }, [persistKey])

  const toggleCollapsed = () => {
    const next = !collapsed
    setAnimated(true)
    setCollapsed(next)
    if (!persistKey) return
    try {
      window.localStorage.setItem(persistKey, next ? 'collapsed' : 'expanded')
    } catch {
      // As above
    }
  }

  const toggleButton = (
    <button
      type="button"
      onClick={toggleCollapsed}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!collapsed}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[0.85rem] font-semibold text-muted transition-colors hover:bg-brand-tint hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
        collapsed && 'size-10 justify-center px-0 py-0'
      )}
    >
      {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
      {collapsed ? null : <span aria-hidden>Collapse</span>}
    </button>
  )
  const toggle: ReactNode = collapsed ? (
    <div className="flex justify-center">
      <Tooltip content="Expand sidebar" side="right" delay={150}>
        {toggleButton}
      </Tooltip>
    </div>
  ) : (
    toggleButton
  )

  return (
    <div className={cn('grid min-w-0 lg:grid-cols-[auto_minmax(0,1fr)]', className)}>
      <aside
        className={cn(
          'sticky top-header hidden h-[calc(100dvh-var(--header-height))] flex-col border-r border-line bg-linear-to-b from-brand-tint to-surface lg:flex',
          animated && 'transition-[width] duration-200 motion-reduce:transition-none',
          collapsed ? 'w-17' : 'w-60'
        )}
      >
        {/* Lines up with the top bar beside it */}
        {brand ? <div className={cn('flex min-h-14 shrink-0 items-center border-b border-line', collapsed ? 'justify-center' : 'px-5')}>{collapsed ? brandMark : brand}</div> : null}
        <nav aria-label={ariaLabel} className={cn('min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-4 scrollbar-thin', collapsed ? 'px-2' : 'px-3')}>
          <NavLinks nav={links} pathname={pathname} collapsed={collapsed} />
        </nav>
        <div className={cn('flex shrink-0 flex-col gap-1 border-t border-line py-3', collapsed ? 'px-2' : 'px-3')}>
          {pinned.length ? (
            <nav aria-label={`${ariaLabel}, more`}>
              <NavLinks nav={pinned} pathname={pathname} collapsed={collapsed} />
            </nav>
          ) : null}
          {sidebarFooter ? <div className={cn(collapsed && 'flex justify-center')}>{sidebarFooter}</div> : null}
          {toggle}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="flex min-h-14 items-center gap-3 border-b border-line px-4 py-2 lg:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
            aria-haspopup="dialog"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-soft hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand lg:hidden"
          >
            <Menu size={20} aria-hidden />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">{topbar}</div>
        </div>
        {/* The site layout already has the page's <main> */}
        <div className="min-w-0 flex-1 px-4 py-6 lg:px-6">{children}</div>
      </div>

      <Offcanvas open={menuOpen} onClose={() => setMenuOpen(false)} side="left" size="sm" title={brand ?? ariaLabel}>
        <nav aria-label={ariaLabel} className="flex flex-col gap-5">
          <NavLinks nav={nav} pathname={pathname} collapsed={false} onNavigate={() => setMenuOpen(false)} />
          {sidebarFooter ? <div className="border-t border-line pt-3">{sidebarFooter}</div> : null}
        </nav>
      </Offcanvas>
    </div>
  )
}
