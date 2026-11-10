import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { EventGrid } from '@/globals/Events'
import { HomepageHero, HomepageSection } from '@/globals/Homepage'
import { getEvents, getHomepage, pageMetadata } from '@/lib/dashboard/public'
import { leadParts, type HomeSection } from '@/lib/homepage'
import { JoinSteps, OfferingCards } from '@/globals/Page'
import { ConnectGrid } from '@/globals/ConnectGrid'
import { inlineLink } from '@/globals/ui/styles'

export const generateMetadata = (): Promise<Metadata> => pageMetadata('/')

export const revalidate = 3600

/** A lead's words, with its [words](link) as links (other sites open in a new tab) */
const Lead =({ text }: { text: string }) =>
  leadParts(text).map((part, i) =>
    typeof part === 'string' ? (
      part
    ) : part.href.startsWith('/') ? (
      <Link key={i} href={part.href} className={inlineLink}>
        {part.text}
      </Link>
    ) : (
      <a key={i} href={part.href} className={inlineLink} target="_blank" rel="noopener noreferrer">
        {part.text}
      </a>
    )
  )

export default async function HomePage() {
  const [content, { upcoming, past }] = await Promise.all([getHomepage(), getEvents()])

  // What each section holds under its words; the words come from the dashboard
  const body = (s: HomeSection): { title: string; lead: string; children: ReactNode } => {
    switch (s.id) {
      case 'offerings':
        return { title: s.title, lead: s.lead, children: <OfferingCards className="mt-2 w-full text-left" /> }
      case 'events':
        // Next events if any are scheduled, otherwise the most recent ones
        return {
          title: upcoming.length ? s.title : (s.quietTitle ?? s.title),
          lead: upcoming.length ? s.lead : (s.quietLead ?? s.lead),
          children: (
            <EventGrid events={upcoming.length ? upcoming.slice(0, 2) : past.slice(0, 2)} past={!upcoming.length} className="mt-2 w-full text-left" />
          ),
        }
      case 'join':
        return { title: s.title, lead: s.lead, children: <JoinSteps className="mt-2 w-full max-w-4xl text-left" /> }
      case 'connect':
        return { title: s.title, lead: s.lead, children: <ConnectGrid className="mt-2 max-w-4xl text-left" /> }
    }
  }

  return (
    <>
      <HomepageHero hero={content.hero} lead={<Lead text={content.hero.lead} />} />
      {/* Shown sections in the dashboard's order, every other one tinted */}
      {content.sections
        .filter((s) => s.shown)
        .map((s, i) => {
          const { title, lead, children } = body(s)
          return (
            <HomepageSection key={s.id} tinted={i % 2 === 1} eyebrow={s.eyebrow} title={title} lead={lead ? <Lead text={lead} /> : undefined} cta={s.cta ?? undefined}>
              {children}
            </HomepageSection>
          )
        })}
    </>
  )
}
