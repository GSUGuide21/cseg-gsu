/* eslint-disable @next/next/no-img-element -- PIN's images and the dashboard's uploads, from wherever they're kept */
import { Accessibility, ArrowUpRight, CalendarDays, ChevronDown, Clock, MapPin, Video } from 'lucide-react'
import Link from 'next/link'
import type { ComponentType, FC } from 'react'

import { Badge } from '@/components'
import { ACCOMMODATIONS } from '@/globals/config/club'
import { card, grid2, iconTile, inlineLink } from '@/globals/ui/styles'
import type { ClubEvent } from '@/lib/data/events'
import { eventSessions, eventState, groupByTerm } from '@/lib/events'
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

/** "Thu, Apr 9" */
const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: TIME_ZONE, weekday: 'short', month: 'short', day: 'numeric' })

const cardLink = 'inline-flex w-fit items-center gap-1 text-[0.85rem] font-semibold text-brand no-underline hover:underline'

/** The form for RSVPs taken on the site, on an event's card */
export type RsvpForm = ComponentType<{ eventId: string; eventName: string }>

/**
 * One event: its picture (described for screen readers), when and where (each session's,
 * when it meets more than once), a Cancelled or Happening now badge, its tags, and how to
 * RSVP (on PIN, or right here for one of the club's own) or join online while that's still useful.
 * `Rsvp` is the form for RSVPs taken here; whoever lists events passes it (it sends through a
 * server action, which this file stays clear of so the editor's previews can draw cards too).
 */
export const EventCard: FC<{ event: ClubEvent; past?: boolean; now?: number; Rsvp?: RsvpForm }> = ({ event, past, now, Rsvp }) => {
  const state = eventState(event, now)
  const sessions = eventSessions(event)
  const over = past || state === 'ended'
  const live = !over && state !== 'cancelled'
  // The row of links under the card: only drawn when it has one, so a card without ends at its words
  const hasLinks = !!event.href || (live && (!!event.onlineUrl || (!!Rsvp && !!event.rsvp)))
  return (
    <article id={`event-${event.id}`} className={card({ className: cn('flex scroll-mt-24 flex-col overflow-hidden', state === 'cancelled' && 'opacity-85') })}>
      {event.imageSrc ? (
        <div className="relative aspect-2/1 bg-fill">
          <img src={event.imageSrc} alt={event.imageAlt ?? ''} loading="lazy" className={cn('absolute inset-0 size-full object-cover', state === 'cancelled' && 'grayscale')} />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-start gap-4">
          <DateBadge iso={event.start} />
          <div className="flex min-w-0 flex-col gap-1">
            {state === 'cancelled' || state === 'live' ? (
              <Badge size="sm" dot tone={state === 'cancelled' ? 'danger' : 'success'} className="w-fit">
                {state === 'cancelled' ? 'Cancelled' : 'Happening now'}
              </Badge>
            ) : null}
            <h3 className={cn('text-[1.1rem] leading-snug font-bold text-ink', state === 'cancelled' && 'line-through decoration-2')}>{event.name}</h3>
            {sessions.length > 1 ? (
              <ul className="flex flex-col gap-1 text-[0.85rem] text-muted" aria-label={`Meets ${sessions.length} times`}>
                {sessions.map((s) => (
                  <li key={s.start} className="flex flex-wrap items-center gap-x-1.5">
                    <CalendarDays size={14} aria-hidden />
                    <span>
                      {formatDay(s.start)}, {formatTime(s.start)} – {formatTime(s.end)}
                    </span>
                    {s.location ? (
                      <span>
                        · <EventLocation location={s.location} />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
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
            )}
          </div>
        </div>
        {event.description ? <p className="line-clamp-4 text-[0.95rem] leading-[1.65] text-muted">{event.description}</p> : null}
        {event.tags?.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Tags">
            {event.tags.map((t) => (
              <li key={t}>
                <Badge size="sm" tone="neutral">
                  {t}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
        {hasLinks ? (
        <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-1">
          {event.onlineUrl && live ? (
            <a href={event.onlineUrl} className={cardLink} target="_blank" rel="noopener noreferrer">
              <Video size={14} aria-hidden />
              {state === 'live' ? 'Join online now' : 'Join online'}
            </a>
          ) : null}
          {event.href ? (
            <a href={event.href} className={cardLink} target="_blank" rel="noopener noreferrer">
              {over || state === 'cancelled' ? 'View on PIN' : 'RSVP on PIN'}
              <ArrowUpRight size={14} aria-hidden />
            </a>
          ) : null}
          {Rsvp && event.rsvp && live ? <Rsvp eventId={event.id} eventName={event.name} /> : null}
        </div>
        ) : null}
      </div>
    </article>
  )
}

/** How to ask for an accommodation at an event: from AACE, or from an officer */
export const AccommodationsNote: FC<{ className?: string }> = ({ className }) => (
  <aside aria-label="Accommodations" className={card({ className: cn('flex flex-wrap items-start gap-4 p-6', className) })}>
    <span className={iconTile} aria-hidden>
      <Accessibility size={20} />
    </span>
    <div className="flex min-w-60 flex-1 flex-col gap-1.5">
      <h3 className="text-[1.05rem] font-bold text-ink">Need an accommodation?</h3>
      <p className="text-[0.95rem] leading-relaxed text-muted">
        Contact the{' '}
        <a href={ACCOMMODATIONS.href} className={inlineLink} target="_blank" rel="noopener noreferrer">
          {ACCOMMODATIONS.name}
        </a>{' '}
        ({ACCOMMODATIONS.short}) at <a href={`mailto:${ACCOMMODATIONS.email}`} className={inlineLink}>{ACCOMMODATIONS.email}</a> or{' '}
        <a href={`tel:${ACCOMMODATIONS.phone.replace(/\D/g, '')}`} className={cn(inlineLink, 'whitespace-nowrap')}>
          {ACCOMMODATIONS.phone}
        </a>
        , or speak to any officer at an event. {ACCOMMODATIONS.short} is in{' '}
        <Link href={`/map?place=${ACCOMMODATIONS.placeId}`} className={inlineLink}>
          Student Center East
        </Link>
        .
      </p>
    </div>
  </aside>
)

export const EventGrid: FC<{ events: readonly ClubEvent[]; past?: boolean; className?: string; Rsvp?: RsvpForm }> = ({
  events,
  past,
  className,
  Rsvp,
}) => (
  <div className={cn(grid2, className)}>
    {events.map((event) => (
      <EventCard key={event.id} event={event} past={past} Rsvp={Rsvp} />
    ))}
  </div>
)

/** One past event as a row: its day, its name, when and where it was, and a line about it */
const PastEventRow: FC<{ event: ClubEvent }> = ({ event }) => (
  <li id={`event-${event.id}`} className="flex scroll-mt-24 items-start gap-4 px-5 py-4">
    <DateBadge iso={event.start} />
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <h4 className={cn('text-[1rem] leading-snug font-bold text-ink', event.cancelled && 'line-through decoration-2')}>
        {event.name}
        {event.cancelled ? <span className="sr-only"> (cancelled)</span> : null}
      </h4>
      <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-[0.82rem] text-muted">
        <span>
          {formatDay(event.start)}, {formatTime(event.start)} – {formatTime(event.end)}
        </span>
        {event.location ? (
          <span>
            · <EventLocation location={event.location} />
          </span>
        ) : null}
      </p>
      {event.description ? <p className="line-clamp-2 text-[0.9rem] leading-[1.6] text-muted">{event.description}</p> : null}
      {event.href ? (
        <a href={event.href} className={cn(cardLink, 'mt-0.5')} target="_blank" rel="noopener noreferrer">
          View on PIN
          <ArrowUpRight size={14} aria-hidden />
        </a>
      ) : null}
    </div>
  </li>
)

const countOf = (n: number) => `${n} ${n === 1 ? 'event' : 'events'}`

/**
 * What's already happened, by term, newest first: the latest term open, and each earlier one
 * folded under its name and count, so the page stays short however long the club's history
 * gets. Rows rather than cards: a past event is something to look up, not to plan around.
 */
export const PastEvents: FC<{ events: readonly ClubEvent[]; className?: string }> = ({ events, className }) => {
  const terms = groupByTerm(events)
  if (!terms.length) return <p className="text-[0.95rem] text-muted">Nothing here yet. Events show up after they’ve happened.</p>
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {terms.map(({ term, events: inTerm }, i) => (
        <details key={term} open={i === 0} className={card({ className: 'group overflow-hidden' })}>
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
            <h3 className="text-[1.05rem] font-bold text-ink transition-colors group-hover:text-brand">{term}</h3>
            <span className="rounded-full bg-fill px-2.5 py-0.5 text-[0.75rem] font-semibold text-muted">{countOf(inTerm.length)}</span>
            <ChevronDown size={18} aria-hidden className="ml-auto text-muted transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <ul className="m-0 list-none divide-y divide-line border-t border-line p-0">
            {inTerm.map((event) => (
              <PastEventRow key={event.id} event={event} />
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}
