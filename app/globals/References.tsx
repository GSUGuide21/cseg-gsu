'use client'

import { ArrowUpRight, BookOpen, FileText, MapPin, Newspaper, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { FC } from 'react'

import { EateryCard } from '@/globals/Eateries'
import { OpenBadge } from '@/globals/OpenBadge'
import { useSiteContent } from '@/globals/SiteContent'
import { card, iconTile } from '@/globals/ui/styles'
import { REFERENCE_KINDS, resolveReference, type ReferenceItem, type Resolved } from '@/lib/references'

/**
 * A References block: things already on the site, each drawn live as a card from what's
 * published now (SiteContent); an area's eateries as a card each. Something that's gone
 * (deleted, unpublished) drops out on the site; in the editor (`preview`) it says so, so it
 * can be fixed.
 */

/** Cards side by side as the page's width allows */
const blockGrid = 'my-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-4'

type CardResolved = Extract<Resolved, { label: string }>

const ICONS: Record<CardResolved['kind'], LucideIcon> = { place: MapPin, resource: BookOpen, post: Newspaper, page: FileText }

const isExternal = (href: string) => /^https?:/i.test(href)

const stretched =
  'text-ink no-underline outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand'

/** The whole card opens what it points at (the title's link is stretched over it); "Show on map" sits above that */
const ReferenceCard: FC<{ item: CardResolved; preview: boolean }> = ({ item, preview }) => {
  const Icon = ICONS[item.kind]
  const external = isExternal(item.href)
  return (
    <article className={card({ padded: true, className: 'group relative flex flex-col gap-2 transition-colors hover:border-brand/55 has-[a:focus-visible]:border-brand' })}>
      <div className="flex items-start justify-between gap-3">
        <span className={iconTile} aria-hidden>
          <Icon size={20} strokeWidth={2} />
        </span>
        <ArrowUpRight size={18} aria-hidden className="mt-1 shrink-0 text-muted transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" />
      </div>
      <p className="m-0 text-[0.72rem] font-bold tracking-wide text-ink-faint uppercase">{item.label}</p>
      <h3 className="m-0 text-[1.05rem] leading-snug font-bold text-ink">
        {preview ? (
          item.title
        ) : external ? (
          <a href={item.href} className={stretched} target="_blank" rel="noopener noreferrer">
            {item.title}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <Link href={item.href} className={stretched}>
            {item.title}
          </Link>
        )}
      </h3>
      {item.text ? <p className="m-0 text-[0.92rem] leading-[1.6] text-muted">{item.text}</p> : null}
      {item.schedule ? <OpenBadge schedule={item.schedule} /> : null}
      {item.mapHref && !preview ? (
        <Link href={item.mapHref} className="relative z-10 mt-auto inline-flex items-center gap-1 self-start text-[0.8rem] font-semibold text-brand no-underline hover:underline">
          <MapPin size={13} aria-hidden />
          Show on map
        </Link>
      ) : null}
    </article>
  )
}

const Note: FC<{ children: string }> = ({ children }) => <p className="m-0 rounded-lg border border-dashed border-line px-4 py-3 text-[0.85rem] text-muted">{children}</p>

/** Whether a found reference has anything to draw (an area can have no eateries yet) */
const shows = (found: Resolved | null) => !!found && (found.kind !== 'eateries' || found.eateries.length > 0)

export const ReferenceGrid: FC<{ items: readonly ReferenceItem[]; preview?: boolean }> = ({ items, preview = false }) => {
  const content = useSiteContent()
  const resolved = items.map((item) => ({ item, key: `${item.kind}:${item.ref}`, found: content ? resolveReference(item, content) : null }))
  if (!resolved.some((r) => shows(r.found)) && !preview) return null
  return (
    <div className={blockGrid}>
      {resolved.map(({ item, key, found }) => {
        if (found?.kind === 'eateries')
          return found.eateries.length ? (
            found.eateries.map((e) => <EateryCard key={`${key}:${e.id}`} eatery={e} />)
          ) : preview ? (
            <Note key={key}>{`No eateries in ${found.title} yet. Add them under Eateries.`}</Note>
          ) : null
        if (found?.kind === 'eatery') return <EateryCard key={key} eatery={found.eatery} />
        if (found) return <ReferenceCard key={key} item={found} preview={preview} />
        return preview ? (
          <Note key={key}>
            {content ? `This ${REFERENCE_KINDS[item.kind].toLowerCase()} isn’t on the site anymore (deleted or unpublished), so it won’t show.` : `${REFERENCE_KINDS[item.kind]}: shows here on the site.`}
          </Note>
        ) : null
      })}
    </div>
  )
}
