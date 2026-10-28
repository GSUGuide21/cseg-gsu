'use client'

import { CalendarDays, FileText, Home, LayoutDashboard, LogOut, MapPin, Newspaper, PenSquare, Settings, UserPlus, Users, Utensils } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { FC, ReactNode } from 'react'

import { ActionMenu, AppShell, Avatar, CommandPalette, NotificationProvider, type Command, type NavSection } from '@/components'
import type { OfficerRole } from '@/lib/supabase/types'

export interface ShellOfficer {
  email: string
  name: string | null
  title: string | null
  role: OfficerRole
}

const NAV: NavSection[] = [
  {
    items: [
      { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard />, exact: true },
      { label: 'Members', href: '/dashboard/members', icon: <Users /> },
      { label: 'Events', href: '/dashboard/events', icon: <CalendarDays /> },
    ],
  },
  {
    label: 'Site',
    items: [
      { label: 'Posts', href: '/dashboard/posts', icon: <Newspaper /> },
      { label: 'Pages', href: '/dashboard/pages', icon: <FileText /> },
      { label: 'Map', href: '/dashboard/map', icon: <MapPin /> },
      { label: 'Eateries', href: '/dashboard/eateries', icon: <Utensils /> },
    ],
  },
  { items: [{ label: 'Settings', href: '/dashboard/settings', icon: <Settings /> }] },
]

const Brand: FC<{ mark?: boolean }> = ({ mark }) => (
  <span className="flex items-center gap-2.5 font-bold text-ink">
    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-solid text-[0.8rem] text-white">
      C
    </span>
    {mark ? <span className="sr-only">CSEG dashboard</span> : 'CSEG dashboard'}
  </span>
)

const signOut = async () => {
  await fetch('/auth/signout', { method: 'POST' })
  window.location.assign('/login')
}

/** The dashboard's frame, around every page: sidebar, ⌘K search, and the account menu */
export const DashboardShell: FC<{ officer: ShellOfficer; avatarUrl: string | null; children: ReactNode }> = ({ officer, avatarUrl, children }) => {
  const router = useRouter()
  const name = officer.name ?? officer.email

  const commands: Command[] = [
    ...NAV.flatMap((s) => s.items).map((i) => ({ id: i.href, label: i.label, group: 'Go to', icon: i.icon, href: i.href })),
    { id: 'new-post', label: 'Write a post', group: 'Create', icon: <PenSquare />, href: '/dashboard/posts/new', keywords: ['blog', 'announcement'] },
    { id: 'new-page', label: 'Create a page', group: 'Create', icon: <FileText />, href: '/dashboard/pages/new' },
    { id: 'add-member', label: 'Add a member', group: 'Create', icon: <UserPlus />, href: '/dashboard/members?add=1' },
    { id: 'site', label: 'View the site', group: 'Go to', icon: <Home />, href: '/' },
    { id: 'sign-out', label: 'Sign out', group: 'Account', icon: <LogOut />, onSelect: signOut },
  ]

  return (
    <NotificationProvider>
      <AppShell
        aria-label="Dashboard"
        nav={NAV}
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
                { label: name, description: [officer.title, officer.role === 'admin' ? 'Admin' : 'Officer'].filter(Boolean).join(' · '), disabled: true },
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
