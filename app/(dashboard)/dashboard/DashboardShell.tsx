'use client'

import { BadgeDollarSign, BarChart3, BookOpen, Briefcase, Camera, ClipboardList, Footprints, LibraryBig, Quote, CalendarDays, CircleHelp, CornerUpRight, FileText, Handshake, Home, Images, Inbox, LayoutDashboard, LayoutTemplate, LogOut, MapPin, Menu, Newspaper, NotebookPen, PanelBottom, PanelTop, PenSquare, Plus, Presentation, Route, Search, Settings, Star, Type, UserPlus, UserRoundCog, Users, Utensils, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { FC, ReactNode } from 'react'

import { ActionMenu, AppShell, Avatar, Button, NotificationProvider, type NavSection, type QuickItem } from '@/components'
import { LogoMark } from '@/globals/Logo'
import { siteHref } from '@/lib/siteUrl'
import type { OfficerRole } from '@/lib/supabase/types'

import { DashboardSearch } from './DashboardSearch'

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
 * Which sections start open, by role, until the person folds or opens them: the club's
 * running and its writing for officers; for an editor, whose work is the site, its writing
 * and its frame. Whatever section the page being viewed is in opens anyway.
 */
const OPEN_AT_FIRST: Record<OfficerRole, ReadonlySet<string>> = {
  editor: new Set(['Publish', 'Site']),
  officer: new Set(['Club', 'Publish']),
  admin: new Set(['Club', 'Publish']),
}

/**
 * The sidebar, ordered by how often each part is used: what's waiting on you at the top,
 * then the club's running, what it publishes and asks, then what the site shows about the
 * club and campus, and last the site's frame and the settings set once. Messages and Join
 * requests show how many wait. An editor doesn't see what's about people.
 */
export const navFor = (unread: number, pending = 0, role: OfficerRole = 'officer'): NavSection[] =>
  ALL_NAV(unread, pending)
    .map((section) => ({
      ...section,
      items: section.items.filter((i) => role !== 'editor' || !STAFF_ONLY.has(i.href)),
      ...(section.collapsible && section.label ? { defaultOpen: OPEN_AT_FIRST[role].has(section.label) } : {}),
    }))
    .filter((section) => section.items.length)

const ALL_NAV = (unread: number, pending: number): NavSection[] => [
  {
    items: [
      { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard />, exact: true },
      { label: 'Messages', href: '/dashboard/messages', icon: <Inbox />, count: unread || undefined },
      { label: 'Join requests', href: '/dashboard/requests', icon: <UserPlus />, count: pending || undefined },
    ],
  },
  {
    label: 'Club',
    description: 'Running the club: who’s in it, what’s on, what’s owed, and what was decided.',
    collapsible: true,
    items: [
      { label: 'Members', href: '/dashboard/members', icon: <Users /> },
      { label: 'Events', href: '/dashboard/events', icon: <CalendarDays /> },
      { label: 'Dues', href: '/dashboard/dues', icon: <Wallet /> },
      { label: 'Minutes', href: '/dashboard/minutes', icon: <NotebookPen /> },
    ],
  },
  {
    label: 'Publish',
    description: 'What the club puts on the site: news, pages, slides, photos, documents, and opportunities.',
    collapsible: true,
    items: [
      { label: 'Posts', href: '/dashboard/posts', icon: <Newspaper /> },
      { label: 'Pages', href: '/dashboard/pages', icon: <FileText /> },
      { label: 'Presentations', href: '/dashboard/presentations', icon: <Presentation /> },
      { label: 'Photo albums', href: '/dashboard/albums', icon: <Camera /> },
      { label: 'Library', href: '/dashboard/library', icon: <LibraryBig /> },
      { label: 'Opportunities', href: '/dashboard/opportunities', icon: <Briefcase /> },
    ],
  },
  {
    label: 'Engage',
    description: 'Asking students things: polls, quizzes, and forms, and what they answered.',
    collapsible: true,
    items: [
      { label: 'Polls and quizzes', href: '/dashboard/polls', icon: <BarChart3 /> },
      { label: 'Forms', href: '/dashboard/forms', icon: <ClipboardList /> },
    ],
  },
  {
    label: 'About the club',
    description: 'Who leads it, who it works with and who backs it, what members say, and common questions.',
    collapsible: true,
    items: [
      { label: 'Executives', href: '/dashboard/executives', icon: <UserRoundCog /> },
      { label: 'Affiliates', href: '/dashboard/affiliates', icon: <Handshake /> },
      { label: 'Sponsors', href: '/dashboard/sponsors', icon: <BadgeDollarSign /> },
      { label: 'Testimonials', href: '/dashboard/testimonials', icon: <Quote /> },
      { label: 'Questions', href: '/dashboard/faqs', icon: <CircleHelp /> },
    ],
  },
  {
    label: 'Campus guide',
    description: 'The campus map and its tours and shortcuts, places to eat, and resources.',
    collapsible: true,
    items: [
      { label: 'Map', href: '/dashboard/map', icon: <MapPin /> },
      { label: 'Tours', href: '/dashboard/tours', icon: <Footprints /> },
      { label: 'Walking shortcuts', href: '/dashboard/connections', icon: <Route /> },
      { label: 'Eateries', href: '/dashboard/eateries', icon: <Utensils /> },
      { label: 'Resources', href: '/dashboard/resources', icon: <BookOpen /> },
      { label: 'Picks', href: '/dashboard/picks', icon: <Star /> },
    ],
  },
  {
    label: 'Site',
    description: 'The homepage, the menus, the top and bottom of every page, search, and the media every page draws on.',
    collapsible: true,
    items: [
      { label: 'Homepage', href: '/dashboard/homepage', icon: <LayoutTemplate /> },
      { label: 'Navigation', href: '/dashboard/site/navigation', icon: <Menu /> },
      { label: 'Header', href: '/dashboard/site/header', icon: <PanelTop /> },
      { label: 'Footer', href: '/dashboard/site/footer', icon: <PanelBottom /> },
      { label: 'Search', href: '/dashboard/site/search', icon: <Search /> },
      { label: 'Media', href: '/dashboard/media', icon: <Images /> },
    ],
  },
  {
    label: 'Advanced',
    description: 'Set once and rarely touched.',
    collapsible: true,
    items: [
      { label: 'Page titles', href: '/dashboard/titles', icon: <Type /> },
      { label: 'Old links', href: '/dashboard/redirects', icon: <CornerUpRight /> },
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

/** What can be started from anywhere: the top bar's New menu, and ⌘K */
const createFor = (role: OfficerRole) => [
  { id: 'new-post', label: 'Post', command: 'Write a post', icon: <PenSquare />, href: '/dashboard/posts/new', keywords: ['blog', 'announcement'] },
  { id: 'new-page', label: 'Page', command: 'Create a page', icon: <FileText />, href: '/dashboard/pages/new', keywords: [] as string[] },
  { id: 'new-presentation', label: 'Presentation', command: 'Create a presentation', icon: <Presentation />, href: '/dashboard/presentations/new', keywords: ['slides', 'deck'] },
  ...(role === 'editor' ? [] : [{ id: 'add-member', label: 'Member', command: 'Add a member', icon: <UserPlus />, href: '/dashboard/members?add=1', keywords: [] as string[] }]),
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

  const create = createFor(officer.role)
  // Found by name in the search, before anything's asked of the server: every screen, and what can be started
  const quick: QuickItem[] = [
    ...nav.flatMap((s) => s.items).map((i) => ({ id: i.href, label: i.label, group: 'Go to', icon: i.icon, href: i.href })),
    ...create.map(({ id, command, icon, href, keywords }) => ({ id, label: command, group: 'Create', icon, href, keywords })),
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
            <DashboardSearch quick={quick} />
            {/* Starting something new, from any page */}
            <ActionMenu
              label="New"
              trigger={
                <Button size="sm" leading={<Plus size={15} aria-hidden />}>
                  New
                </Button>
              }
              items={create.map(({ label, icon, href }) => ({ label, icon, onSelect: () => router.push(href) }))}
            />
            <ActionMenu
              label="Account"
              trigger={
                // As tall as Search and New beside it (36px), with the same thin edge, so the three line up
                <button
                  type="button"
                  aria-label={`Account: ${name}`}
                  className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full ring-1 ring-line transition-shadow hover:ring-brand-edge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <Avatar name={name} src={avatarUrl} size="sm" decorative className="size-9 text-[0.78rem]" />
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
