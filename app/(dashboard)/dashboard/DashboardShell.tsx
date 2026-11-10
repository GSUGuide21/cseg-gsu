'use client'

import { BadgeDollarSign, BookOpen, CalendarDays, CircleHelp, CornerUpRight, FileText, Handshake, Home, Images, Inbox, LayoutDashboard, LayoutTemplate, LogOut, MapPin, Newspaper, NotebookPen, PanelTop, PenSquare, Route, Settings, UserPlus, UserRoundCog, Users, Utensils, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { FC, ReactNode } from 'react'

import { ActionMenu, AppShell, Avatar, CommandPalette, NotificationProvider, type Command, type NavSection } from '@/components'
import { LogoMark } from '@/globals/Logo'
import type { OfficerRole } from '@/lib/supabase/types'

export interface ShellOfficer {
  email: string
  name: string | null
  title: string | null
  role: OfficerRole
}

const ROLE_WORDS: Record<OfficerRole, string> = { editor: 'Editor', officer: 'Officer', admin: 'Admin' }

/** What's about people, which an editor (who only writes the site) doesn't get */
const STAFF_ONLY = new Set(['/dashboard/messages', '/dashboard/members', '/dashboard/requests', '/dashboard/dues', '/dashboard/minutes'])

/** The sidebar; Messages shows how many are unread, and Join requests how many are waiting */
export const navFor = (unread: number, pending = 0, role: OfficerRole = 'officer'): NavSection[] =>
  ALL_NAV(unread, pending)
    .map((section) => ({ ...section, items: section.items.filter((i) => role !== 'editor' || !STAFF_ONLY.has(i.href)) }))
    .filter((section) => section.items.length)

const ALL_NAV = (unread: number, pending: number): NavSection[] => [
  {
    items: [
      { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard />, exact: true },
      { label: 'Messages', href: '/dashboard/messages', icon: <Inbox />, count: unread || undefined },
    ],
  },
  {
    label: 'Club',
    items: [
      { label: 'Members', href: '/dashboard/members', icon: <Users /> },
      { label: 'Join requests', href: '/dashboard/requests', icon: <UserPlus />, count: pending || undefined },
      { label: 'Dues', href: '/dashboard/dues', icon: <Wallet /> },
      { label: 'Events', href: '/dashboard/events', icon: <CalendarDays /> },
      { label: 'Minutes', href: '/dashboard/minutes', icon: <NotebookPen /> },
      { label: 'Executives', href: '/dashboard/executives', icon: <UserRoundCog /> },
      { label: 'Affiliates', href: '/dashboard/affiliates', icon: <Handshake /> },
      { label: 'Sponsors', href: '/dashboard/sponsors', icon: <BadgeDollarSign /> },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Homepage', href: '/dashboard/homepage', icon: <LayoutTemplate /> },
      { label: 'Posts', href: '/dashboard/posts', icon: <Newspaper /> },
      { label: 'Pages', href: '/dashboard/pages', icon: <FileText /> },
      { label: 'Media', href: '/dashboard/media', icon: <Images /> },
      { label: 'Questions', href: '/dashboard/faqs', icon: <CircleHelp /> },
      { label: 'Tab titles', href: '/dashboard/titles', icon: <PanelTop /> },
      { label: 'Redirects', href: '/dashboard/redirects', icon: <CornerUpRight /> },
    ],
  },
  {
    label: 'Campus guide',
    items: [
      { label: 'Map', href: '/dashboard/map', icon: <MapPin /> },
      { label: 'Shortcuts', href: '/dashboard/connections', icon: <Route /> },
      { label: 'Eateries', href: '/dashboard/eateries', icon: <Utensils /> },
      { label: 'Resources', href: '/dashboard/resources', icon: <BookOpen /> },
    ],
  },
  {
    pinned: true,
    items: [
      { label: 'Settings', href: '/dashboard/settings', icon: <Settings /> },
      { label: 'View the site', href: '/', icon: <Home /> },
    ],
  },
]

const Brand: FC<{ mark?: boolean }> = ({ mark }) => (
  <span className="flex items-center gap-2.5 font-bold text-ink">
    <LogoMark size={32} />
    {mark ? <span className="sr-only">CSEG dashboard</span> : 'CSEG dashboard'}
  </span>
)

const signOut = async () => {
  await fetch('/auth/signout', { method: 'POST' })
  window.location.assign('/login')
}

/** The dashboard's frame, around every page: sidebar, ⌘K search, and the account menu */
export const DashboardShell: FC<{ officer: ShellOfficer; avatarUrl: string | null; unread?: number; pending?: number; children: ReactNode }> = ({ officer, avatarUrl, unread = 0, pending = 0, children }) => {
  const router = useRouter()
  const name = officer.name ?? officer.email
  const nav = navFor(unread, pending, officer.role)

  const commands: Command[] = [
    ...nav.flatMap((s) => s.items).map((i) => ({ id: i.href, label: i.label, group: 'Go to', icon: i.icon, href: i.href })),
    { id: 'new-post', label: 'Write a post', group: 'Create', icon: <PenSquare />, href: '/dashboard/posts/new', keywords: ['blog', 'announcement'] },
    { id: 'new-page', label: 'Create a page', group: 'Create', icon: <FileText />, href: '/dashboard/pages/new' },
    ...(officer.role === 'editor' ? [] : [{ id: 'add-member', label: 'Add a member', group: 'Create', icon: <UserPlus />, href: '/dashboard/members?add=1' }]),
    { id: 'sign-out', label: 'Sign out', group: 'Account', icon: <LogOut />, onSelect: signOut },
  ]

  return (
    <NotificationProvider>
      <AppShell
        aria-label="Dashboard"
        persistKey="cseg:sidebar"
        nav={nav}
        brand={<Brand />}
        brandMark={<Brand mark />}
        topbar={
          <>
            <CommandPalette commands={commands} className="mr-auto w-full max-w-72" />
            <ActionMenu
              label="Account"
              trigger={
                <button type="button" aria-label={`Account: ${name}`} className="cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                  <Avatar name={name} src={avatarUrl} size="sm" decorative />
                </button>
              }
              items={[
                { label: name, description: [officer.title, ROLE_WORDS[officer.role]].filter(Boolean).join(' · '), disabled: true },
                'separator',
                { label: 'View the site', icon: <Home />, onSelect: () => router.push('/') },
                { label: 'Settings', icon: <Settings />, onSelect: () => router.push('/dashboard/settings') },
                'separator',
                { label: 'Sign out', icon: <LogOut />, onSelect: signOut },
              ]}
            />
          </>
        }
      >
        {children}
      </AppShell>
    </NotificationProvider>
  )
}
