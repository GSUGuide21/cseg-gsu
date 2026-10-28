import type { ReactNode } from 'react'

export interface NavItem {
  label: string
  href: string
  icon?: ReactNode
  /** A count after the label: unread, pending */
  count?: number
  /** Active only on this exact path, not the pages under it. Default: exact for "/" only. */
  exact?: boolean
}

export interface NavSection {
  /** A heading over the section's links */
  label?: string
  items: NavItem[]
}

export interface AppShellProps {
  nav: NavSection[]
  /** At the top of the sidebar: a logo and name */
  brand?: ReactNode
  /** What stands for the brand when the sidebar is narrowed to icons: just the logo */
  brandMark?: ReactNode
  /** The top bar's contents, after the menu button: search, account */
  topbar?: ReactNode
  /** At the bottom of the sidebar: the signed-in person, help */
  sidebarFooter?: ReactNode
  children: ReactNode
  /** Start with the sidebar narrowed to icons (wide screens) */
  defaultCollapsed?: boolean
  /** Names the navigation. Default "Dashboard". */
  'aria-label'?: string
  className?: string
}
