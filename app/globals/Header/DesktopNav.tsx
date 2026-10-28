import { type FC, useCallback, useEffect, useRef, useState } from 'react'

import type { NavItem as NavItemConfig } from '@/globals/config/nav'
import { NavItem } from './NavItem'

export type DesktopNavProps = {
  links: readonly NavItemConfig[]
  isActive: (href: string) => boolean
  /** Lets the header draw its border while a subnav is open */
  onMenuChange?: (open: boolean) => void
}

/** Grace period so the pointer can cross small gaps without the subnav flickering shut. */
const CLOSE_DELAY_MS = 150

export const DesktopNav: FC<DesktopNavProps> = ({ links, isActive, onMenuChange }) => {
  const [openHref, setOpenHref] = useState<string | null>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const listRef = useRef<HTMLUListElement>(null)

  const setOpen = useCallback(
    (href: string | null) => {
      window.clearTimeout(closeTimer.current)
      setOpenHref(href)
      onMenuChange?.(href !== null)
    },
    [onMenuChange]
  )

  const close = useCallback(
    (options?: { delay?: boolean }) => {
      window.clearTimeout(closeTimer.current)
      if (options?.delay) {
        closeTimer.current = window.setTimeout(() => setOpen(null), CLOSE_DELAY_MS)
      } else {
        setOpen(null)
      }
    },
    [setOpen]
  )

  useEffect(() => {
    if (openHref === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Return focus to the toggle so keyboard users keep their place
      listRef.current
        ?.querySelector<HTMLButtonElement>('[aria-controls][aria-expanded="true"]')
        ?.focus()
      setOpen(null)
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!listRef.current?.contains(e.target as Node)) setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [openHref, setOpen])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  return (
    <ul ref={listRef} className="flex items-stretch gap-[clamp(1rem,2vw,2rem)]">
      {links.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          active={isActive(item.href)}
          menuOpen={openHref === item.href}
          onMenuOpen={() => setOpen(item.href)}
          onMenuClose={close}
          onMenuToggle={() => setOpen(openHref === item.href ? null : item.href)}
        />
      ))}
    </ul>
  )
}
