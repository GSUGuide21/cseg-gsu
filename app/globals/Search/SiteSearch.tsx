'use client'

import { BookOpen, CalendarDays, FileText, Map, Search, UserPlus, Utensils } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type FC } from 'react'

import { Kbd, SearchOverlay, type QuickItem } from '@/components'
import { iconButton } from '@/globals/ui/styles'
import type { SearchResult } from '@/lib/search'
import { BUILT_IN_CHROME, type SearchContent } from '@/lib/siteChrome'

import { SITE_ICONS, SITE_KINDS, SITE_ORDER } from './siteKinds'

/** Where most people are headed, offered before anything's typed */
const QUICK: QuickItem[] = [
  { id: 'events', group: 'Popular', label: 'Events', description: 'Socials, workshops, and meetings: what’s coming up.', href: '/events', icon: <CalendarDays /> },
  { id: 'map', group: 'Popular', label: 'Campus map', description: 'Buildings, parking, MARTA, and walking routes.', href: '/map', icon: <Map />, keywords: ['buildings', 'parking'] },
  { id: 'join', group: 'Popular', label: 'Join CSEG', description: 'How to become a member.', href: '/join', icon: <UserPlus />, keywords: ['member', 'sign up'] },
  { id: 'eat', group: 'Popular', label: 'Places to eat', description: 'Dining halls and food near campus.', href: '/eat', icon: <Utensils />, keywords: ['food', 'dining'] },
  { id: 'resources', group: 'Popular', label: 'Student resources', description: 'Academics, money, health, and campus life.', href: '/resources', icon: <BookOpen /> },
  { id: 'about', group: 'Popular', label: 'About CSEG', description: 'Who we are, what we do, and common questions.', href: '/about', icon: <FileText />, keywords: ['faq', 'mission'] },
]

/** Asks the site's search for what matches, and how many in all */
const askSite = async (query: string, signal: AbortSignal, kind?: string): Promise<{ results: SearchResult[]; total: number; kinds: Record<string, number> }> => {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}${kind ? `&kind=${encodeURIComponent(kind)}` : ''}`, { signal })
  if (!response.ok) throw new Error(`Search answered ${response.status}`)
  return (await response.json()) as { results: SearchResult[]; total: number; kinds: Record<string, number> }
}

/** What the site suggests before anything's typed: the next events, the latest news and photos */
const suggestSite = async (signal: AbortSignal): Promise<SearchResult[]> => {
  const response = await fetch('/api/search', { signal })
  if (!response.ok) return []
  return ((await response.json()) as { suggested?: SearchResult[] }).suggested ?? []
}

/** Whether a key press is someone typing into something, rather than a shortcut */
const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/**
 * The site's search: the header's button, and the full-screen search it opens. The button is
 * a link to the search page underneath, so it works before the page's JavaScript has loaded
 * (and opens in a new tab when asked to). Anywhere on the site, / or ⌘/Ctrl+K opens it too.
 */
export const SiteSearch: FC<{ words?: SearchContent }> = ({ words = BUILT_IN_CHROME.search }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || open) return
      const command = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      const slash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target)
      if (!command && !slash) return
      e.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <Link
        href="/search"
        aria-label="Search the site"
        title="Search (/)"
        aria-haspopup="dialog"
        onClick={(e) => {
          // A new tab or window was asked for: the search page, as a link
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
          e.preventDefault()
          setOpen(true)
        }}
        className={iconButton({
          size: 'md',
          // Wide screens: it reads as a search field, with its shortcut
          className: 'min-[1200px]:w-auto min-[1200px]:min-w-48 min-[1200px]:justify-start min-[1200px]:gap-2 min-[1200px]:bg-fill min-[1200px]:pr-2 min-[1200px]:pl-3 min-[1200px]:text-ink-faint',
        })}
      >
        <Search size={18} aria-hidden />
        <span className="hidden flex-1 text-left text-[0.85rem] min-[1200px]:inline">Search…</span>
        <Kbd keys={['mod', 'K']} size="sm" className="hidden min-[1200px]:inline-flex" />
      </Link>
      <SearchOverlay
        open={open}
        onClose={close}
        search={askSite}
        suggest={suggestSite}
        quick={QUICK}
        suggestedCount={4}
        kinds={SITE_KINDS}
        icons={SITE_ICONS}
        order={SITE_ORDER}
        label="Search the site"
        placeholder={words.placeholder || 'Search events, pages, places, and socials…'}
        suggestions={words.suggestions}
        emptyTitle={words.emptyTitle}
        emptyText={words.emptyText}
        allResultsHref={(q) => `/search?q=${encodeURIComponent(q)}`}
        recentKey="cseg:recent-searches"
        onNavigate={(href) => router.push(href)}
      />
    </>
  )
}
