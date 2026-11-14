'use client'

import { Menu, Search, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { isNavActive, navWithPages, type NavItem, type NavLink } from '@/globals/config/nav'
import { Wordmark } from '@/globals/Logo'
import { iconButton } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { BUILT_IN_CHROME, headerLinks, type HeaderContent } from '@/lib/siteChrome'

const BUILT_IN_LINKS = headerLinks(BUILT_IN_CHROME)
import { DesktopNav } from './DesktopNav'
import { MobileNav } from './MobileNav'
import { HeaderThemeToggle } from './ThemeToggle'

export type HeaderProps = {
  /** The pages officers put in the menu from the dashboard: under More on desktop, each its own line on mobile */
  pages?: readonly (NavLink & { description?: string })[]
  /** The menu the dashboard gave the header; the built-in one when left out */
  links?: readonly NavItem[]
  /** The pages that picked a different menu, by path: on one of them, it shows instead */
  pageMenus?: Readonly<Record<string, readonly NavItem[]>>
  /** What sits beside the menu, as the dashboard has it; the built-in set when left out */
  header?: HeaderContent
}

export const Header = ({ pages = [], links: siteLinks = BUILT_IN_LINKS, pageMenus, header = BUILT_IN_CHROME.header }: HeaderProps) => {
  const pathname = usePathname()
  const { cta } = header
  const links = pageMenus?.[pathname] ?? siteLinks
  // The button's page is promoted to a button on desktop, so the text nav omits it
  const desktopLinks = useMemo(() => navWithPages(links.filter((l) => l.href !== cta?.href), pages), [links, cta, pages])
  const mobileLinks = useMemo(() => [...links, ...pages.map(({ href, label }) => ({ href, label }))], [links, pages])
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [subnavOpen, setSubnavOpen] = useState(false)

  const closeMenu = useCallback(() => {
    setOpen(false)
    document.body.style.overflow = ''
  }, [])

  const toggleMenu = useCallback(() => {
    setOpen((prev) => {
      document.body.style.overflow = prev ? '' : 'hidden'
      return !prev
    })
  }, [])

  // Close the mobile menu after navigating
  useEffect(() => {
    closeMenu()
  }, [pathname, closeMenu])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeMenu])

  const activeFor = useCallback((href: string) => isNavActive(pathname, href), [pathname])

  return (
    <>
      {/* Mobile menu backdrop */}
      <div
        className={cn(
          'fixed inset-x-0 top-header bottom-0 z-39 bg-black/35 transition-[opacity,visibility] duration-200 lg:hidden',
          open ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
        )}
        aria-hidden
        onClick={closeMenu}
      />
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 border-b border-transparent pt-(--navbar-safe-top)',
          'bg-surface/88 backdrop-blur-[10px] backdrop-saturate-[1.6] transition-[border-color,box-shadow,background-color] duration-200',
          'data-scrolled:border-line data-scrolled:bg-surface/94 data-scrolled:shadow-[0_6px_20px_rgba(15,23,41,0.05)] dark:data-scrolled:shadow-[0_6px_20px_rgba(0,0,0,0.4)]'
        )}
        data-scrolled={scrolled || open || subnavOpen ? '' : undefined}
      >
        <nav
          className="relative mx-auto flex min-h-header-bar max-w-7xl items-center gap-3 px-[clamp(1rem,3vw,2.5rem)] lg:gap-8"
          aria-label="Main"
        >
          <Wordmark priority className="shrink-0" textClassName="max-[22rem]:hidden" />
          <div className="ml-auto hidden self-stretch lg:flex">
            <DesktopNav links={desktopLinks} isActive={activeFor} onMenuChange={setSubnavOpen} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            {header.search ? (
              <Link href="/search" aria-label="Search the site" title="Search" className={iconButton({ size: 'md' })}>
                <Search size={18} aria-hidden />
              </Link>
            ) : null}
            {header.themeToggle ? <HeaderThemeToggle /> : null}
            {cta ? (
              <Link
                href={cta.href}
                className="hidden h-10 items-center rounded-[0.6rem] bg-brand-solid px-[1.1rem] text-[0.85rem] font-semibold text-white no-underline transition-colors hover:bg-brand-solid-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:inline-flex"
                aria-current={activeFor(cta.href) ? 'page' : undefined}
              >
                {cta.label}
              </Link>
            ) : null}
            <button
              type="button"
              className={iconButton({ size: 'lg', className: 'lg:hidden' })}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={toggleMenu}
            >
              {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
            </button>
          </div>
        </nav>
      </header>
      <MobileNav open={open} links={mobileLinks} cta={cta ? { label: cta.href === '/join' ? 'Join CSEG →' : cta.label, href: cta.href } : null} isActive={activeFor} onNavigate={closeMenu} />
    </>
  )
}
