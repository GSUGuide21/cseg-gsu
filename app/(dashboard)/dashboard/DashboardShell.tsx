'use client'

import { BadgeDollarSign, BookOpen, CalendarDays, CircleHelp, CornerUpRight, FileText, Handshake, Home, Images, Inbox, LayoutDashboard, LayoutTemplate, LogOut, MapPin, Menu, Newspaper, NotebookPen, PanelBottom, PanelTop, PenSquare, Presentation, Route, Search, Settings, Star, Type, UserPlus, UserRoundCog, Users, Utensils, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { FC, ReactNode } from 'react'

import { ActionMenu, AppShell, Avatar, CommandPalette, NotificationProvider, type Command, type NavSection } from '@/components'
import { LogoMark } from '@/globals/Logo'
import { siteHref } from '@/lib/siteUrl'
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

/**
 * The sidebar, in sections that fold: Messages shows how many are unread, and Join requests
 * how many are waiting. People and Club start open and the rest folded, except for an
 * editor, whose work is the site: Content starts open for them.
 */
export const navFor = (unread: number, pending = 0, role: OfficerRole = 'officer'): NavSection[] =>
  ALL_NAV(unread, pending)
    .map((section) => ({
      ...section,
      items: section.items.filter((i) => role !== 'editor' || !STAFF_ONLY.has(i.href)),
      ...(section.label === 'Content' && role === 'editor' ? { defaultOpen: true } : {}),
    }))
    .filter((section) => section.items.length)

const ALL_NAV = (unread: number, pending: number): NavSection[] => [
  {
    items: [
      { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard />, exact: true },
      { label: 'Messages', href: '/dashboard/messages', icon: <Inbox />, count: unread || undefined },
    ],
  },
  {
    label: 'People',
    description: 'Who’s in the club, and what they owe.',
    collapsible: true,
    items: [
      { label: 'Members', href: '/dashboard/members', icon: <Users /> },
      { label: 'Join requests', href: '/dashboard/requests', icon: <UserPlus />, count: pending || undefined },
      { label: 'Dues', href: '/dashboard/dues', icon: <Wallet /> },
      { label: 'Minutes', href: '/dashboard/minutes', icon: <NotebookPen /> },
    ],
  },
  {
    label: 'Club',
    description: 'Events, and the people and groups behind the club.',
    collapsible: true,
    items: [
      { label: 'Events', href: '/dashboard/events', icon: <CalendarDays /> },
      { label: 'Executives', href: '/dashboard/executives', icon: <UserRoundCog /> },
      { label: 'Affiliates', href: '/dashboard/affiliates', icon: <Handshake /> },
      { label: 'Sponsors', href: '/dashboard/sponsors', icon: <BadgeDollarSign /> },
    ],
  },
  {
    label: 'Content',
    description: 'What the website says: its homepage, posts, pages, and presentations.',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'Homepage', href: '/dashboard/homepage', icon: <LayoutTemplate /> },
      { label: 'Posts', href: '/dashboard/posts', icon: <Newspaper /> },
      { label: 'Pages', href: '/dashboard/pages', icon: <FileText /> },
      { label: 'Presentations', href: '/dashboard/presentations', icon: <Presentation /> },
      { label: 'Media', href: '/dashboard/media', icon: <Images /> },
      { label: 'Questions', href: '/dashboard/faqs', icon: <CircleHelp /> },
    ],
  },
  {
    label: 'Menus & layout',
    description: 'The menus, and the top and bottom of every page.',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'Navigation', href: '/dashboard/site/navigation', icon: <Menu /> },
      { label: 'Search', href: '/dashboard/site/search', icon: <Search /> },
      { label: 'Header', href: '/dashboard/site/header', icon: <PanelTop /> },
      { label: 'Footer', href: '/dashboard/site/footer', icon: <PanelBottom /> },
    ],
  },
  {
    label: 'Campus guide',
    description: 'The campus map, places to eat, and resources.',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'Map', href: '/dashboard/map', icon: <MapPin /> },
      { label: 'Eateries', href: '/dashboard/eateries', icon: <Utensils /> },
      { label: 'Resources', href: '/dashboard/resources', icon: <BookOpen /> },
      { label: 'Picks', href: '/dashboard/picks', icon: <Star /> },
    ],
  },
  {
    label: 'Advanced',
    description: 'Set once and rarely touched.',
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: 'Page titles', href: '/dashboard/titles', icon: <Type /> },
      { label: 'Old links', href: '/dashboard/redirects', icon: <CornerUpRight /> },
      { label: 'Walking shortcuts', href: '/dashboard/connections', icon: <Route /> },
    ],
  },
  {
    pinned: true,
    items: [
      { label: 'Settings', href: '/dashboard/settings', icon: <Settings /> },
      { label: 'View the site', href: siteHref('/'), icon: <Home /> },
    ],
  },
]

const Brand: FC<{ mark?: boolean }> = ({ mark }) => (
  <span className="flex items-center gap-2.5 font-bold text-ink">
    <LogoMark size={32} />
    {mark ? <span className="sr-only">Dashboard</span> : 'Dashboard'}
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
    { id: 'new-presentation', label: 'Create a presentation', group: 'Create', icon: <Presentation />, href: '/dashboard/presentations/new', keywords: ['slides', 'deck'] },
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
                { label: 'View the site', icon: <Home />, onSelect: () => window.location.assign(siteHref('/')) },
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
