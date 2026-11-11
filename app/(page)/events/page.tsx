import { ArrowUpRight, CalendarX2 } from 'lucide-react'
import type { Metadata } from 'next'
import { FaInstagram } from 'react-icons/fa6'

import { instagramHandle } from '@/lib/clubDetails'
import { getClubDetails, getEvents, getPublishedPage, pageMetadata } from '@/lib/dashboard/public'
import type { ClubEvent } from '@/lib/data/events'
import { SITE_PAGES } from '@/lib/sitePages'
import { EventRsvp } from '@/globals/EventRsvp'
import { AccommodationsNote, EventGrid, PastEvents } from '@/globals/Events'
import { PageBlock, PageHeader } from '@/globals/Page'
import { ManagedPage, managedPageMetadata } from '@/globals/Page/ManagedPage'
import { button, card, iconTile, pageShell } from '@/globals/ui/styles'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage('events')
  // Its page in the dashboard, while published; otherwise the tab title officers set (or the site's own)
  const meta = await pageMetadata('/events')
  return page ? managedPageMetadata(page, meta.description) : meta
}

// Upcoming events come from PIN and the dashboard; re-check every few minutes, so one that
// just ended moves down to Past without waiting (a dashboard change refreshes it at once)
export const revalidate = 300

/**
 * The events themselves: what's coming (cards, with RSVPs) and what's been (rows, by term).
 * The site draws these whether the page around them is its own or one officers wrote.
 */
const EventLists = ({ upcoming, past, instagramUrl }: { upcoming: readonly ClubEvent[]; past: readonly ClubEvent[]; instagramUrl: string }) => (
  <>
    <PageBlock id="upcoming" title="Upcoming" description="RSVP here or on PIN. Times are Eastern.">
      {upcoming.length ? (
        <EventGrid events={upcoming} Rsvp={EventRsvp} />
      ) : (
        <div className={card({ className: 'flex flex-wrap items-center gap-4 p-6' })}>
          <span className={iconTile} aria-hidden>
            <CalendarX2 size={20} />
          </span>
          <p className="min-w-60 flex-1 text-[0.95rem] leading-relaxed text-muted">
            Nothing on the calendar right now. New events are announced on Instagram and posted to PIN.
          </p>
          <a href={instagramUrl} className={button({ variant: 'outline', size: 'sm' })} target="_blank" rel="noopener noreferrer">
            Follow for updates
          </a>
        </div>
      )}
      <AccommodationsNote />
    </PageBlock>

    <PageBlock id="past" title="Past events" description={past.length ? 'What we’ve been up to, by term. Open a term to see what happened.' : undefined}>
      <PastEvents events={past} />
    </PageBlock>
  </>
)

/** The Events page officers wrote in the dashboard, once it's published; the site's own until then. The lists stay either way. */
export default async function EventsPage() {
  const [page, { instagramUrl, links }, { upcoming, past }] = await Promise.all([getPublishedPage('events'), getClubDetails(), getEvents()])
  const lists = <EventLists upcoming={upcoming} past={past} instagramUrl={instagramUrl} />
  if (page) return <ManagedPage page={page} eyebrow={SITE_PAGES.events.eyebrow} after={lists} />

  return (
    <div className={pageShell}>
      <PageHeader
        eyebrow="Events"
        title="Events"
        lead="Discussions, talent showcases, and meetups that help you learn the campus, meet other Panthers, and make the most of your time at Georgia State."
      >
        <a href={links.pin} className={button()} target="_blank" rel="noopener noreferrer">
          CSEG on PIN
          <ArrowUpRight size={16} aria-hidden />
        </a>
        <a href={instagramUrl} className={button({ variant: 'outline' })} target="_blank" rel="noopener noreferrer">
          <FaInstagram aria-hidden />
          {instagramHandle(instagramUrl)}
        </a>
      </PageHeader>
      {lists}
    </div>
  )
}
