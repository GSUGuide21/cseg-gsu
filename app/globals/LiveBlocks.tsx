'use client'

import { Footprints, MapPin } from 'lucide-react'
import Link from 'next/link'
import type { FC } from 'react'

import { EventGrid } from '@/globals/Events'
import { PlaceMap } from '@/globals/PlaceMap'
import { useSiteContent } from '@/globals/SiteContent'
import { button } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { PAST_EVENTS } from '@/lib/data/events'
import { getPlace, mapHref, PLACE_CATEGORIES, placesWithEateries } from '@/lib/data/places'
import { InlineText } from '@/lib/richtext/blocks/inline'
import type { EventCount, WhenNoEvents } from '@/lib/richtext/blocks/live'

/**
 * The next few CSEG events from PIN, as the homepage shows them, kept current on their own.
 * With none scheduled, the most recent ones (or a line saying so). In the editor (preview),
 * it shows what the page would show now.
 */
export const EventsBlock: FC<{ count: EventCount; whenNone: WhenNoEvents }> = ({ count, whenNone }) => {
  const content = useSiteContent()
  const upcoming = content?.events ?? []
  if (upcoming.length) return <EventGrid events={upcoming.slice(0, count)} className="my-6" />
  if (whenNone === 'recent') return <EventGrid events={(content?.pastEvents ?? PAST_EVENTS).slice(0, count)} past className="my-6" />
  return <p className="my-6 rounded-lg border border-dashed border-line px-4 py-3 text-muted">Nothing’s scheduled right now. New events are posted on PIN and Instagram.</p>
}

/**
 * A place on the campus map: a small map pinned on it, its name and address, a line about
 * it, and links to it on the full map and to walking directions there. The place is looked
 * up when the page is shown, so a renamed or moved one stays right.
 */
export const PlaceBlock: FC<{ placeId: string; note: string; preview?: boolean }> = ({ placeId, note, preview }) => {
  const content = useSiteContent()
  const place = (content ? placesWithEateries(content.eateries) : []).find((p) => p.id === placeId) ?? getPlace(placeId)
  if (!place) return preview ? <p className="my-4 rounded-lg border border-dashed border-line px-4 py-3 text-[0.85rem] text-muted">That place isn’t on the map anymore.</p> : null
  const color = PLACE_CATEGORIES[place.category]?.color
  return (
    <div className="my-6 grid overflow-hidden rounded-xl border border-line bg-surface sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <PlaceMap lat={place.lat} lng={place.lng} label={place.name} color={color} className="h-56 sm:h-full sm:min-h-60" />
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-[0.78rem] font-bold tracking-wide text-muted uppercase">
            <MapPin size={14} aria-hidden style={{ color }} />
            {PLACE_CATEGORIES[place.category]?.label ?? 'Campus map'}
          </span>
          <h3 className="m-0 text-[1.15rem] font-bold text-ink">{place.name}</h3>
          {place.address ? <p className="m-0 text-[0.9rem] text-muted">{place.address}</p> : null}
        </div>
        {note ? (
          <p className="m-0 leading-relaxed text-ink-soft">
            <InlineText text={note} />
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2">
          <Link href={mapHref(place)} className={cn(button({ size: 'sm' }))}>
            Open on the campus map
          </Link>
          <Link href={`/map?to=${place.id}`} className={cn(button({ size: 'sm', variant: 'outline' }), 'gap-1.5')}>
            <Footprints size={14} aria-hidden />
            Walking directions
          </Link>
        </div>
      </div>
    </div>
  )
}
