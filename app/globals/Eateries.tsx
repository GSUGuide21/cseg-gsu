'use client'

import { ArrowUpRight, Clock, Info, MapPin, Navigation, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import type { FC } from 'react'

import { OpenBadge } from '@/globals/OpenBadge'
import { card, grid3 } from '@/globals/ui/styles'
import { directionsHref, eateryMapId, type Eatery } from '@/lib/eateries'

/**
 * Places to eat as cards, each with its live "Open now" badge and links to its pin on the
 * map and to directions: on the /eat page, and wherever a page's References block points at them.
 */

const smallLink = 'inline-flex items-center gap-1 text-[0.8rem] font-semibold text-brand no-underline hover:underline'

export const EateryCard: FC<{ eatery: Eatery }> = ({ eatery: e }) => {
  const mapId = eateryMapId(e)
  return (
    <article id={e.id} className={card({ className: 'flex scroll-mt-24 flex-col gap-2.5 p-5' })}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-[1.05rem] leading-snug font-bold text-ink">{e.name}</h3>
        {e.status ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,#c2410c_14%,var(--bg))] px-2.5 py-0.5 text-[0.72rem] font-bold text-[#9a3412] dark:text-[#fdba74]">
            <TriangleAlert size={12} aria-hidden />
            {e.status}
          </span>
        ) : null}
      </div>
      <p className="flex items-start gap-1.5 text-[0.82rem] text-muted">
        <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
        {e.address}
      </p>
      <p className="text-[0.92rem] leading-[1.6] text-muted">{e.description}</p>
      {e.schedule && !e.status ? <OpenBadge schedule={e.schedule} /> : null}
      {e.hours ? (
        <p className="flex items-start gap-1.5 text-[0.85rem] text-ink-soft">
          <Clock size={14} className="mt-0.5 shrink-0 text-brand" aria-hidden />
          {e.hours}
        </p>
      ) : null}
      {e.note ? (
        <p className="flex items-start gap-1.5 text-[0.8rem] leading-snug text-ink-faint">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
          {e.note}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1">
        {mapId ? (
          <Link href={`/map?place=${mapId}`} className={smallLink}>
            <MapPin size={13} aria-hidden />
            Show on map
          </Link>
        ) : null}
        <a
          href={directionsHref(e.locations?.[0] ? { address: e.address, ...e.locations[0] } : e)}
          className={smallLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Navigation size={13} aria-hidden />
          Directions
        </a>
        {e.url ? (
          <a href={e.url} className={smallLink} target="_blank" rel="noopener noreferrer">
            Official site
            <ArrowUpRight size={13} aria-hidden />
          </a>
        ) : null}
      </div>
    </article>
  )
}

export const EateryGrid: FC<{ eateries: readonly Eatery[]; className?: string }> = ({ eateries, className = grid3 }) => (
  <div className={className}>
    {eateries.map((e) => (
      <EateryCard key={e.id} eatery={e} />
    ))}
  </div>
)

