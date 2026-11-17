'use client'

import {
  Award,
  BadgeDollarSign,
  BarChart3,
  Briefcase,
  CalendarDays,
  Camera,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Handshake,
  Inbox,
  Link2,
  Newspaper,
  Presentation,
  Quote,
  Search,
  UserPlus,
  UserRound,
  Utensils,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type FC } from 'react'

import { Kbd, SearchOverlay, type QuickItem, type SearchKind } from '@/components'
import type { SearchResult } from '@/lib/search'

/** How the dashboard's search shows each kind of thing officers keep, and in what order */
const KINDS: Readonly<Record<string, SearchKind>> = {
  'Go to': { label: 'Screens', tone: 'brand' },
  Create: { label: 'Create', tone: 'accent' },
  Member: { label: 'Members', icon: <UserRound /> },
  'Join request': { label: 'Join requests', icon: <UserPlus />, tone: 'accent' },
  Message: { label: 'Messages', icon: <Inbox /> },
  Event: { label: 'Events', icon: <CalendarDays />, tone: 'brand', dated: true },
  Post: { label: 'Posts', icon: <Newspaper /> },
  Page: { label: 'Pages', icon: <FileText /> },
  Presentation: { label: 'Presentations', icon: <Presentation /> },
  Photos: { label: 'Photo albums', icon: <Camera /> },
  Document: { label: 'Library', icon: <FileText /> },
  Opportunity: { label: 'Opportunities', icon: <Briefcase /> },
  Poll: { label: 'Polls', icon: <BarChart3 /> },
  Quiz: { label: 'Quizzes', icon: <ClipboardCheck /> },
  Form: { label: 'Forms', icon: <ClipboardList /> },
  Executive: { label: 'Executives', icon: <Award /> },
  Testimonial: { label: 'Testimonials', icon: <Quote /> },
  Sponsor: { label: 'Sponsors', icon: <BadgeDollarSign /> },
  Affiliate: { label: 'Affiliates', icon: <Handshake /> },
  Question: { label: 'Questions', icon: <CircleHelp /> },
  'Place to eat': { label: 'Eateries', icon: <Utensils /> },
  Resource: { label: 'Resources', icon: <Link2 /> },
}
const ORDER = Object.keys(KINDS)

type Answer = { results: SearchResult[]; total: number; kinds: Record<string, number>; suggested?: SearchResult[] }

/** Asks the dashboard's search, as the officer signed in (a sign-in page, sent instead, isn't an answer) */
const ask = async (query: string, signal: AbortSignal, kind?: string): Promise<Answer> => {
  const response = await fetch(`/dashboard/search?q=${encodeURIComponent(query)}${kind ? `&kind=${encodeURIComponent(kind)}` : ''}`, { signal, credentials: 'same-origin' })
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error(`Search answered ${response.status}`)
  return (await response.json()) as Answer
}
const askDashboard = (query: string, signal: AbortSignal, kind?: string) => ask(query, signal, kind)
/** What was changed most recently, before anything's typed */
const suggestDashboard = async (signal: AbortSignal) => (await ask('', signal).catch(() => null))?.suggested ?? []

/**
 * The dashboard's search: a box in the top bar that opens a full-screen search across
 * everything officers keep (drafts too) and the dashboard's own screens and actions. ⌘/Ctrl+K
 * opens it from anywhere.
 */
export const DashboardSearch: FC<{ quick: readonly QuickItem[] }> = ({ quick }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || open || !((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) return
      e.preventDefault()
      setOpen(true)
    }
    // Caught on the way down, so where the site's search is on the page too, the dashboard's answers first
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="mr-auto flex h-9 w-full max-w-80 cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-left text-[0.88rem] text-muted transition-colors hover:border-brand-edge hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Search size={16} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">Search everything…</span>
        <Kbd keys={['mod', 'K']} size="sm" className="max-sm:hidden" />
      </button>
      <SearchOverlay
        open={open}
        onClose={close}
        search={askDashboard}
        suggest={suggestDashboard}
        quick={quick}
        suggestedCount={6}
        kinds={KINDS}
        order={ORDER}
        label="Search the dashboard"
        placeholder="Search members, posts, events, screens…"
        emptyText="Nothing by that name. Try fewer words, or part of a name or email."
        recentKey="cseg:dashboard-searches"
        onNavigate={(href) => router.push(href)}
      />
    </>
  )
}
