import { ArrowUpRight, CalendarDays, Clock, MapPin } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { FC } from 'react'

import { card, grid2 } from '@/globals/ui/styles'
import type { ClubEvent } from '@/lib/data/events'
import { findPlaceForLocation, mapHref } from '@/lib/data/places'
import { cn } from '@/lib/cn'

const TIME_ZONE = 'America/New_York'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' })

/** Month/day block shown on each card. */
const DateBadge: FC<{ iso: string }> = ({ iso }) => {
  const date = new Date(iso)
  return (
    <span className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-brand-edge bg-brand-wash py-1.5 leading-none">
      <span className="text-[0.7rem] font-bold tracking-wider text-brand uppercase">
        {date.toLocaleDateString('en-US', { timeZone: TIME_ZONE, month: 'short' })}
      </span>
      <span className="mt-1 text-[1.4rem] font-extrabold text-ink">
        {date.toLocaleDateString('en-US', { timeZone: TIME_ZONE, day: 'numeric' })}
      </span>
    </span>
  )
}

/** Links the location to the campus map when it names a building we have. */
const EventLocation: FC<{ location: string }> = ({ location }) => {
  const place = findPlaceForLocation(location)
  if (!place) return <>{location}</>
  return (
    <Link href={mapHref(place)} className="text-inherit underline decoration-line underline-offset-[0.2em] hover:text-brand hover:decoration-brand">
      {location}
    </Link>
  )
}

export const EventCard: FC<{ event: ClubEvent; past?: boolean }> = ({ event, past }) => (
  <article id={`event-${event.id}`} className={card({ className: 'flex scroll-mt-24 flex-col overflow-hidden' })}>
    {event.imageSrc ? (
      <div className="relative aspect-2/1 bg-fill">
        <Image src={event.imageSrc} alt="" fill sizes="(min-width: 900px) 34rem, 100vw" className="object-cover" />
      </div>
    ) : null}
    <div className="flex flex-1 flex-col gap-3 p-6">
      <div className="flex items-start gap-4">
        <DateBadge iso={event.start} />
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-[1.1rem] leading-snug font-bold text-ink">{event.name}</h3>
          <ul className="flex flex-col gap-1 text-[0.85rem] text-muted">
            <li className="flex items-center gap-1.5">
              <CalendarDays size={14} aria-hidden />
              {formatDate(event.start)}
            </li>
            <li className="flex items-center gap-1.5">
              <Clock size={14} aria-hidden />
              {formatTime(event.start)} – {formatTime(event.end)}
            </li>
            {event.location ? (
              <li className="flex items-center gap-1.5">
                <MapPin size={14} aria-hidden />
                <EventLocation location={event.location} />
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      {event.description ? (
        <p className="line-clamp-4 text-[0.95rem] leading-[1.65] text-muted">{event.description}</p>
      ) : null}
      {event.href ? (
        <a
          href={event.href}
          className="mt-auto inline-flex w-fit items-center gap-1 pt-1 text-[0.85rem] font-semibold text-brand no-underline hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {past ? 'View on PIN' : 'RSVP on PIN'}
          <ArrowUpRight size={14} aria-hidden />
        </a>
      ) : null}
    </div>
  </article>
)

export const EventGrid: FC<{ events: readonly ClubEvent[]; past?: boolean; className?: string }> = ({
  events,
  past,
  className,
}) => (
  <div className={cn(grid2, className)}>
    {events.map((event) => (
      <EventCard key={event.id} event={event} past={past} />
    ))}
  </div>
)
