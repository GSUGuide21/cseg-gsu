import { ArrowUpRight, CalendarX2 } from 'lucide-react'
import type { Metadata } from 'next'
import { FaInstagram } from 'react-icons/fa6'

import { EventGrid } from '@/globals/Events'
import { PageBlock, PageHeader } from '@/globals/Page'
import { SOCIAL_LINKS } from '@/globals/config/social'
import { button, card, iconTile, pageShell } from '@/globals/ui/styles'
import { getUpcomingEvents, PAST_EVENTS } from '@/lib/data/events'

export const metadata: Metadata = {
  title: 'Events',
  description: 'Talks, showcases, and meetups from the Campus Survival and Engagement Group.',
}

// Upcoming events come from PIN; re-check hourly
export const revalidate = 3600

export default async function EventsPage() {
  const upcoming = await getUpcomingEvents()

  return (
    <div className={pageShell}>
      <PageHeader
        eyebrow="Events"
        title="Events"
        lead="Discussions, talent showcases, and meetups that help you learn the campus, meet other Panthers, and make the most of your time at Georgia State."
      >
        <a href={SOCIAL_LINKS.pin} className={button()} target="_blank" rel="noopener noreferrer">
          CSEG on PIN
          <ArrowUpRight size={16} aria-hidden />
        </a>
        <a href={SOCIAL_LINKS.instagram} className={button({ variant: 'outline' })} target="_blank" rel="noopener noreferrer">
          <FaInstagram aria-hidden />
          @cseg_gsu
        </a>
      </PageHeader>

      <PageBlock id="upcoming" title="Upcoming" description="RSVP on PIN. Times are Eastern.">
        {upcoming.length ? (
          <EventGrid events={upcoming} />
        ) : (
          <div className={card({ className: 'flex flex-wrap items-center gap-4 p-6' })}>
            <span className={iconTile} aria-hidden>
              <CalendarX2 size={20} />
            </span>
            <p className="min-w-60 flex-1 text-[0.95rem] leading-relaxed text-muted">
              Nothing on the calendar right now. New events are announced on Instagram and posted to PIN.
            </p>
            <a
              href={SOCIAL_LINKS.instagram}
              className={button({ variant: 'outline', size: 'sm' })}
              target="_blank"
              rel="noopener noreferrer"
            >
              Follow for updates
            </a>
          </div>
        )}
      </PageBlock>

      <PageBlock id="past" title="Past events">
        <EventGrid events={PAST_EVENTS} past />
      </PageBlock>
    </div>
  )
}
