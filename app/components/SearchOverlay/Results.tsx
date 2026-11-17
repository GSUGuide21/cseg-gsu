'use client'
/* eslint-disable @next/next/no-img-element -- results' pictures come from anywhere, at any size */

import { ArrowUpRight, CornerDownLeft, FileText } from 'lucide-react'
import { useState, type FC } from 'react'

import { cn } from '@/lib/cn'
import { searchWords } from '@/lib/search'

import { day, isExternal, Marked, type CardData } from './Layouts'
import type { SearchKind, SearchResultsProps } from './types'

export { isExternal, Marked, type CardData }

/** Only pictures that are safe to show: https, or this site's own */
const pictureOf = (src?: string | null) => (src && /^(https:\/\/|\/(?!\/))/i.test(src) ? src : null)

const TONES: Record<NonNullable<SearchKind['tone']>, string> = {
  brand: 'bg-brand-tint text-brand',
  neutral: 'bg-[color-mix(in_srgb,var(--fg)_7%,var(--bg))] text-ink-soft',
  accent: 'bg-[color-mix(in_srgb,#7c3aed_12%,var(--bg))] text-[#6d28d9] dark:text-[#c4b5fd]',
}

/** A filter chip's words for a kind */
export const kindLabel = (kinds: SearchResultsProps['kinds'], kind: string) => kinds?.[kind]?.label ?? kind

/** The picture column: the result's picture, else its own icon or its kind's, in a tile */
const Media: FC<{ card: CardData; kind?: SearchKind; icons?: SearchResultsProps['icons'] }> = ({ card, kind, icons }) => {
  const src = pictureOf(card.image)
  const [failed, setFailed] = useState(false)
  if (src && !failed) return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="size-16 shrink-0 rounded-[0.6rem] border border-line object-cover object-top" />
  const own = typeof card.icon === 'string' ? icons?.[card.icon] : card.icon
  return (
    <span
      aria-hidden
      className="grid size-16 shrink-0 place-items-center rounded-[0.6rem] border border-line bg-fill text-[1.35rem] text-ink-soft transition-colors group-aria-selected:border-brand-edge group-aria-selected:text-brand [&>svg]:size-[22px]"
    >
      {own ?? kind?.icon ?? (card.href && isExternal(card.href) ? <ArrowUpRight /> : <FileText />)}
    </span>
  )
}

/**
 * One result, as a card: its picture (or an icon), a badge saying what it is (an event's
 * says whether it's upcoming), its name, a line of detail, and the words around the match,
 * with the search's words marked. In a list of options, the one picked is outlined and
 * marked with ↵.
 */
export const ResultCard: FC<{ card: CardData; words: readonly string[]; kinds?: SearchResultsProps['kinds']; icons?: SearchResultsProps['icons']; now?: number }> = ({ card, words, kinds, icons, now = Date.now() }) => {
  const kind = kinds?.[card.kind]
  const when = kind?.dated && card.date ? (Date.parse(card.date) >= now - 12 * 3600 * 1000 ? 'upcoming' : 'past') : null
  const detail = [card.meta, card.date && !kind?.dated ? day(card.date) : null].filter(Boolean).join(' · ')
  return (
    <>
      <Media card={card} kind={kind} icons={icons} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className={cn('rounded-full px-2 py-0.5 text-[0.68rem] font-semibold', TONES[kind?.tone ?? 'neutral'])}>
            {card.kind}
            {when ? ` · ${when}` : null}
          </span>
          {card.href && isExternal(card.href) ? <ArrowUpRight size={13} className="text-ink-faint" aria-label="(opens another site)" /> : null}
        </span>
        <span className="text-[0.95rem] leading-snug font-bold text-ink group-aria-selected:text-brand">
          <Marked text={card.title} words={words} />
        </span>
        {detail ? <span className="truncate text-[0.74rem] text-ink-faint">{detail}</span> : null}
        {card.snippet ? (
          <span className="line-clamp-2 text-[0.8rem] leading-snug text-ink-soft">
            <Marked text={card.snippet} words={words} />
          </span>
        ) : null}
      </span>
      <CornerDownLeft size={16} aria-hidden className="shrink-0 self-center text-brand opacity-0 group-aria-selected:opacity-100" />
    </>
  )
}

/** A card's frame: outlined and tinted when it's the one picked */
export const cardFrame = cn(
  'flex h-full items-start gap-3 rounded-xl border border-line bg-surface p-3 text-ink no-underline transition-[border-color,background-color,box-shadow]',
  'hover:border-brand-edge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
  'group-aria-selected:border-brand group-aria-selected:bg-brand-wash group-aria-selected:shadow-[0_6px_18px_rgb(0_57_166/0.14)]'
)

/** The results grid, as the search page shows it: every result a card, best first */
export const SearchResults: FC<SearchResultsProps> = ({ results, query, kinds, icons, onFollow }) => {
  const words = searchWords(query)
  const now = Date.now()
  return (
    <ul aria-label="Results" className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,21rem),1fr))] gap-3 p-0">
      {results.map((r) => (
        <li key={r.href + r.title} className="group">
          <a href={r.href} onClick={(e) => onFollow?.(r, e)} {...(isExternal(r.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={cardFrame}>
            <ResultCard card={r} words={words} kinds={kinds} icons={icons} now={now} />
          </a>
        </li>
      ))}
    </ul>
  )
}
