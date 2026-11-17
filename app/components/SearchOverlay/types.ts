import type { MouseEvent, ReactNode } from 'react'

import type { SearchResult } from '@/lib/search'

/** What a search answers: the best matches, and how many matched in all (more than were sent, when it's cut off) */
export interface SearchAnswer {
  results: SearchResult[]
  /** How many matched in all (of the kind asked for, when one was) */
  total: number
  /** How many of each kind matched in all, when the search says */
  kinds?: Record<string, number>
}

/** How a kind of result is shown: its badge, its filter chip, and what stands in for a picture */
export interface SearchKind {
  /** The filter chip's words ("Events"); default the kind itself */
  label?: string
  /** Stands in for a picture on a result without one */
  icon?: ReactNode
  /** The badge's color. Default "neutral". */
  tone?: 'brand' | 'neutral' | 'accent'
  /** Its results are dated (events): the badge says whether each is upcoming or past */
  dated?: boolean
  /**
   * How the search page lays its results out: "chip", a name in a slim box (socials);
   * "tile", a picture or icon beside its name and a line about it; "media", a picture
   * above its date and name (events, news). Default "tile".
   */
  layout?: 'chip' | 'tile' | 'media'
}

/** Something found without asking the server: a screen to go to, a thing to start */
export interface QuickItem {
  id: string
  label: string
  /** What it is, on its badge and as a filter: "Go to", "Create" */
  group: string
  /** A line under its name */
  description?: string
  icon?: ReactNode
  href?: string
  onSelect?: () => void
  /** Other words it's found by */
  keywords?: readonly string[]
}

export interface SearchOverlayProps {
  open: boolean
  onClose: () => void
  /**
   * Asks for what matches. Called as the person types (once they pause), and its signal
   * aborts when they've typed on, so an answer that's no longer wanted is dropped. Called
   * again with a `kind` when a filter chip is picked and more of that kind matched than were
   * sent, for that kind's best.
   */
  search: (query: string, signal: AbortSignal, kind?: string) => Promise<SearchResult[] | SearchAnswer>
  /** Asked once each time it opens: what's worth showing before anything's typed (the next events, say) */
  suggest?: (signal: AbortSignal) => Promise<SearchResult[]>
  /** Found by name as the person types, without asking, and suggested before anything's typed */
  quick?: readonly QuickItem[]
  /** How many quick items are suggested before anything's typed. Default 9. */
  suggestedCount?: number
  /** How each kind of result is shown, by its `kind` */
  kinds?: Readonly<Record<string, SearchKind>>
  /** Icons a result can name (its `icon`), for one that needs its own (a social network's) */
  icons?: Readonly<Record<string, ReactNode>>
  /** The order the filter chips come in; kinds not in it follow */
  order?: readonly string[]
  /** Names the search: "Search the site". Default "Search". */
  label?: string
  placeholder?: string
  /** Searches to offer: before anything's typed, and when nothing's found */
  suggestions?: readonly string[]
  /** What to say when nothing's found */
  emptyTitle?: string
  emptyText?: string
  /** A page with every result: (query) => `/search?q=…`. Offered under the results, and when they're cut off. */
  allResultsHref?: (query: string) => string
  /** Where this browser remembers recent searches; leave out to not remember them */
  recentKey?: string
  /** Goes to a result on this site (a client-side navigation); default a plain page load */
  onNavigate?: (href: string) => void
}

export interface SearchResultsProps {
  results: readonly SearchResult[]
  /** The search, for marking its words in the results */
  query: string
  kinds?: Readonly<Record<string, SearchKind>>
  icons?: Readonly<Record<string, ReactNode>>
  /** Called when a result is followed */
  onFollow?: (result: SearchResult, event: MouseEvent<HTMLAnchorElement>) => void
}
