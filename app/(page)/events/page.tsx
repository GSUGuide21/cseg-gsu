import { ArrowUpRight, CalendarX2 } from 'lucide-react'
import type { Metadata } from 'next'
import { FaInstagram } from 'react-icons/fa6'

import { instagramHandle } from '@/lib/clubDetails'
import { getClubDetails, getEvents, pageMetadata } from '@/lib/dashboard/public'
import { EventRsvp } from '@/globals/EventRsvp'
import { AccommodationsNote, EventGrid } from '@/globals/Events'
import { PageBlock, PageHeader } from '@/globals/Page'
import { button, card, iconTile, pageShell } from '@/globals/ui/styles'

export const generateMetadata = (): Promise<Metadata> => pageMetadata('/events')

// Upcoming events come from PIN and the dashboard; re-check hourly (a dashboard change refreshes it sooner)
export const revalidate = 3600

export default async function EventsPage() {
  const { instagramUrl, links } = await getClubDetails()
  const { upcoming, past } = await getEvents()

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
            <a
              href={instagramUrl}
              className={button({ variant: 'outline', size: 'sm' })}
              target="_blank"
              rel="noopener noreferrer"
            >
              Follow for updates
            </a>
          </div>
        )}
        <AccommodationsNote />
      </PageBlock>

      <PageBlock id="past" title="Past events">
        <EventGrid events={past} past />
      </PageBlock>
    </div>
  )
}
