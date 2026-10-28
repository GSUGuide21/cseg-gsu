import type { Metadata } from 'next'
import Link from 'next/link'

import { EventGrid } from '@/globals/Events'
import { HomepageHero, HomepageSection } from '@/globals/Homepage'
import { getUpcomingEvents, PAST_EVENTS } from '@/lib/data/events'
import { JoinSteps, OfferingCards } from '@/globals/Page'
import { CLUB_DESCRIPTION } from '@/globals/config/site'
import { SocialIcons } from '@/globals/SocialIcons'
import { inlineLink } from '@/globals/ui/styles'
import { SOCIAL_LINKS } from '@/globals/config/social'

export const metadata: Metadata = {
  title: 'Home',
  description: CLUB_DESCRIPTION.oneLiner,
}

export const revalidate = 3600

export default async function HomePage() {
  const upcoming = await getUpcomingEvents()

  return (
    <>
      <HomepageHero />
      <HomepageSection
        eyebrow="What we do"
        title="Making Georgia State feel like home"
        lead={CLUB_DESCRIPTION.purpose}
        cta={{ href: '/about', label: 'About CSEG →' }}
      >
        <OfferingCards className="mt-2 w-full text-left" />
      </HomepageSection>
      <HomepageSection
        tinted
        eyebrow="Events"
        title={upcoming.length ? 'Coming up' : 'Show up, meet people, learn the ropes'}
        lead={
          <>
            {upcoming.length ? 'RSVP on ' : 'Discussions, talent showcases, and more. Upcoming events are posted on '}
            <a href={SOCIAL_LINKS.pin} className={inlineLink} target="_blank" rel="noopener noreferrer">
              PIN
            </a>{' '}
            and announced on Instagram.
          </>
        }
        cta={{ href: '/events', label: 'See all events →' }}
      >
        {/* Next events if any are scheduled, otherwise the most recent ones */}
        <EventGrid
          events={upcoming.length ? upcoming.slice(0, 2) : PAST_EVENTS.slice(0, 2)}
          past={!upcoming.length}
          className="mt-2 w-full text-left"
        />
      </HomepageSection>
      <HomepageSection
        eyebrow="Join us"
        title="Getting started takes three steps"
        lead="Every Panther is welcome, whether it's your first semester or your last."
        cta={{ href: '/join', label: 'How to join →' }}
      >
        <JoinSteps className="mt-2 w-full max-w-4xl text-left" />
      </HomepageSection>
      <HomepageSection
        tinted
        eyebrow="Connect"
        title="Stay in the loop"
        lead={
          <>
            Follow us on social, or{' '}
            <Link href="/contact" className={inlineLink}>
              reach out to the officers
            </Link>{' '}
            with any questions.
          </>
        }
      >
        <SocialIcons size="lg" className="justify-center" />
      </HomepageSection>
    </>
  )
}
