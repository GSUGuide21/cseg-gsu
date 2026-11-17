import { ArrowUpRight, ChevronRight, CornerDownLeft, FileText } from 'lucide-react'
import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { markMatches, type SearchResult } from '@/lib/search'

import { Picture } from './Picture'
import type { SearchKind } from './types'

/*
 * How a result looks in each of the search's layouts, shared by the full-screen search and
 * the search page. Nothing here holds state, so the page can draw them on the server. A card
 * is drawn inside a link with its layout's `frame`; set `aria-selected` on an ancestor marked
 * `group` (a listbox's option) to show it picked.
 */

type Kinds = Readonly<Record<string, SearchKind>>
type Icons = Readonly<Record<string, ReactNode>>
export type Layout = NonNullable<SearchKind['layout']>

/** What a card shows: a result, or a quick item made to look like one */
export interface CardData {
  kind: string
  title: string
  href?: string
  snippet?: string | null
  meta?: string | null
  date?: string | null
  image?: string | null
  /** An icon by name (from `icons`), or one given directly */
  icon?: string | ReactNode
}

const ZONE = 'America/New_York'
/** Another site's: opened in a new tab */
export const isExternal = (href: string) => /^https?:/i.test(href)
/** Only pictures that are safe to show: https, or this site's own */
const pictureOf = (src?: string | null) => (src && /^(https:\/\/|\/(?!\/))/i.test(src) ? src : null)

/** "Nov 17, 2026" */
export const day = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString('en-US', { timeZone: iso.length === 10 ? 'UTC' : ZONE, month: 'short', day: 'numeric', year: 'numeric' })

/** The search's words, marked where they appear */
export const Marked: FC<{ text: string; words: readonly string[] }> = ({ text, words }) => (
  <>
    {markMatches(text, words).map((part, i) =>
      part.match ? (
        <mark key={i} className="rounded-[0.2em] bg-brand-tint px-[0.1em] text-inherit">
          {part.text}
        </mark>
      ) : (
        part.text
      )
    )}
  </>
)

/** How a result's kind lays it out: in a list, every one a tile */
export const layoutOf = (kinds: Kinds | undefined, kind: string, list = false): Layout | 'list' => (list ? 'list' : (kinds?.[kind]?.layout ?? 'tile'))

/** A result's card as a SearchResult's fields */
export const cardOf = (r: SearchResult): CardData => ({ ...r, icon: r.icon ?? undefined })

const iconOf = (card: CardData, kinds?: Kinds, icons?: Icons) =>
  (typeof card.icon === 'string' ? icons?.[card.icon] : card.icon) ?? kinds?.[card.kind]?.icon ?? (card.href && isExternal(card.href) ? <ArrowUpRight /> : <FileText />)

const box =
  'group flex h-full rounded-xl border border-line bg-surface text-ink no-underline transition-[border-color,background-color,box-shadow] hover:border-brand-edge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand group-aria-selected:border-brand group-aria-selected:bg-brand-wash group-aria-selected:shadow-[0_6px_18px_rgb(0_57_166/0.14)]'

/** The link around a card, by layout */
export const frame: Record<Layout | 'list', string> = {
  chip: cn(box, 'items-center gap-2.5 px-3.5 py-3'),
  tile: cn(box, 'items-center gap-3.5 p-3.5'),
  list: cn(box, 'items-center gap-3.5 p-3.5'),
  media: 'group flex h-full flex-col gap-2 rounded-xl text-ink no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand',
}

/** The grid a group of cards is set in, by layout */
export const columns: Record<Layout | 'list', string> = {
  chip: 'grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-3',
  tile: 'grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-3',
  media: 'grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-x-4 gap-y-6',
  list: 'grid-cols-1 gap-2.5',
}

const Away: FC<{ href?: string }> = ({ href }) => (href && isExternal(href) ? <ArrowUpRight size={15} className="shrink-0 text-ink-faint" aria-label="(opens another site)" /> : null)
const Picked = () => <CornerDownLeft size={16} aria-hidden className="hidden shrink-0 text-brand group-aria-selected:block" />

interface BodyProps {
  card: CardData
  layout: Layout | 'list'
  words: readonly string[]
  kinds?: Kinds
  icons?: Icons
  now: number
}

/**
 * A card's insides. "chip": its icon, name, and an arrow. "tile" (and "list", with more of
 * its words): a round picture or an icon tile beside its name, the words around the match,
 * and a line of detail. "media": a picture above its date and name; a past event says so.
 */
export const CardBody: FC<BodyProps> = ({ card, layout, words, kinds, icons, now }) => {
  const kind = kinds?.[card.kind]
  const src = pictureOf(card.image)
  const icon = iconOf(card, kinds, icons)
  const past = kind?.dated && card.date ? Date.parse(card.date) < now - 12 * 3600 * 1000 : false
  const title = (
    <span data-title>
      <Marked text={card.title} words={words} />
    </span>
  )

  if (layout === 'chip')
    return (
      <>
        <span aria-hidden className="text-ink-faint [&>svg]:size-4">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.92rem] font-semibold group-aria-selected:text-brand">{title}</span>
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-fill text-ink-soft transition-colors group-hover:bg-brand-tint group-hover:text-brand group-aria-selected:bg-brand-tint group-aria-selected:text-brand">
          {card.href && isExternal(card.href) ? <ArrowUpRight size={14} /> : <ChevronRight size={14} />}
        </span>
      </>
    )

  if (layout === 'media') {
    const stand = (
      <span aria-hidden className="grid size-full place-items-center text-ink-faint [&>svg]:size-8">
        {icon}
      </span>
    )
    return (
      <>
        <span className="relative block aspect-16/10 overflow-hidden rounded-xl border border-line bg-fill transition-[border-color,box-shadow] group-hover:border-brand-edge group-aria-selected:border-brand group-aria-selected:shadow-[0_0_0_2px_var(--brand)]">
          {src ? <Picture src={src} fallback={stand} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : stand}
          {past ? <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[0.68rem] font-semibold text-white">Past</span> : null}
        </span>
        <span className="flex flex-col gap-0.5">
          {card.date ? <span className="text-[0.76rem] text-ink-faint">{day(card.date)}</span> : null}
          <span className="flex items-start justify-between gap-2">
            <span className="line-clamp-2 text-[0.95rem] leading-snug font-semibold group-hover:text-brand group-aria-selected:text-brand">{title}</span>
            <Away href={card.href} />
          </span>
          {card.meta ? <span className="truncate text-[0.76rem] text-ink-faint">{card.meta}</span> : null}
        </span>
      </>
    )
  }

  const detail = [card.meta, card.date ? `${day(card.date)}${past ? ' · past' : ''}` : null].filter(Boolean).join(' · ')
  const tile = (
    <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-fill text-ink-soft transition-colors group-hover:text-brand group-aria-selected:border-brand-edge group-aria-selected:text-brand [&>svg]:size-5.5">
      {icon}
    </span>
  )
  return (
    <>
      {src ? <Picture src={src} fallback={tile} className="size-12 shrink-0 rounded-full border border-line object-cover" /> : tile}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[0.95rem] leading-snug font-semibold group-hover:text-brand group-aria-selected:text-brand">{title}</span>
        {card.snippet ? (
          <span className={cn('text-[0.82rem] leading-snug text-ink-soft', layout === 'list' ? 'line-clamp-2' : 'line-clamp-1')}>
            <Marked text={card.snippet} words={words} />
          </span>
        ) : null}
        {detail ? <span className="mt-0.5 truncate text-[0.74rem] text-ink-faint">{detail}</span> : null}
      </span>
      <Away href={card.href} />
      <Picked />
    </>
  )
}
