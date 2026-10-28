'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { isNavActive, NAV_LINKS } from '@/globals/config/nav'
import { SITE_SHORT_NAME } from '@/globals/config/site'
import { LogoMark } from '@/globals/Logo'
import { iconButton } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { DesktopNav } from './DesktopNav'
import { MobileNav } from './MobileNav'
import { HeaderThemeToggle } from './ThemeToggle'

/** Join is promoted to a button on desktop, so the text nav omits it. */
const DESKTOP_LINKS = NAV_LINKS.filter((l) => l.href !== '/join')

export const Header = () => {
  const pathname = usePathname()
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
          'fixed inset-x-0 top-0 z-50 border-b border-transparent pt-[var(--navbar-safe-top)]',
          'bg-surface/88 backdrop-blur-[10px] backdrop-saturate-[1.6] transition-[border-color,box-shadow,background-color] duration-200',
          'data-scrolled:border-line data-scrolled:bg-surface/94 data-scrolled:shadow-[0_6px_20px_rgba(15,23,41,0.05)] dark:data-scrolled:shadow-[0_6px_20px_rgba(0,0,0,0.4)]'
        )}
        data-scrolled={scrolled || open || subnavOpen ? '' : undefined}
      >
        <nav
          className="relative mx-auto flex min-h-header-bar max-w-7xl items-center gap-3 px-[clamp(1rem,3vw,2.5rem)] lg:gap-8"
          aria-label="Main"
        >
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2.5 text-ink no-underline transition-colors hover:text-brand"
          >
            <LogoMark size={44} priority />
            <span className="flex flex-col leading-tight max-[22rem]:hidden">
              <span className="text-lg font-extrabold tracking-tight">{SITE_SHORT_NAME}</span>
              <span className="text-[0.7rem] font-medium text-muted max-sm:hidden">
                Campus Survival &amp; Engagement
              </span>
            </span>
          </Link>
          <div className="ml-auto hidden self-stretch lg:flex">
            <DesktopNav links={DESKTOP_LINKS} isActive={activeFor} onMenuChange={setSubnavOpen} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            <HeaderThemeToggle />
            <Link
              href="/join"
              className="hidden h-10 items-center rounded-[0.6rem] bg-brand-solid px-[1.1rem] text-[0.85rem] font-semibold text-white no-underline transition-colors hover:bg-brand-solid-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:inline-flex"
              aria-current={activeFor('/join') ? 'page' : undefined}
            >
              Join
            </Link>
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
      <MobileNav open={open} links={NAV_LINKS} isActive={activeFor} onNavigate={closeMenu} />
    </>
  )
}
