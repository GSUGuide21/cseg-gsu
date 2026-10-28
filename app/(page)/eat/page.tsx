import { ArrowUpRight, Clock, MapPin } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EateryGrid } from '@/globals/Eateries'
import { PageBlock, PageHeader } from '@/globals/Page'
import { ManagedPage } from '@/globals/Page/ManagedPage'
import { button, card, eyebrow, iconTile, inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getEateries, getPublishedPage } from '@/lib/dashboard/public'
import { EAT_LINKS, EAT_TIPS, EATS_CHECKED, MORE_EATS } from '@/lib/data/eats'
import { EAT_AREA_LIST, EAT_AREAS, eateriesIn, type Eatery } from '@/lib/eateries'
import { SITE_PAGES } from '@/lib/sitePages'

const FALLBACK_METADATA: Metadata = {
  title: 'Places to Eat',
  description:
    'Campus dining halls, on-campus eateries, and nearby restaurants, cafés, and late-night spots around Georgia State’s downtown campus.',
}

function EatContent({ eateries }: { eateries: readonly Eatery[] }) {

  return (
    <div className={pageShell}>
      <PageHeader
        eyebrow="Food"
        title="Places to eat"
        lead="Campus dining halls, on-campus eateries, and nearby restaurants, cafés, quick bites, and late-night spots around Georgia State’s downtown campus."
      >
        <Link href="/map?category=food" className={button()}>
          <MapPin size={16} aria-hidden />
          See food on the map
        </Link>
        <a
          href="https://dining.gsu.edu/locations-and-hours/"
          className={button({ variant: 'outline' })}
          target="_blank"
          rel="noopener noreferrer"
        >
          PantherDining hours
          <ArrowUpRight size={16} aria-hidden />
        </a>
      </PageHeader>

      <aside className={card({ accent: true, className: 'flex items-start gap-4 p-5' })}>
        <span className={iconTile} aria-hidden>
          <Clock size={20} />
        </span>
        <p className="text-[0.92rem] leading-relaxed text-muted">
          <strong className="text-ink">Checked {EATS_CHECKED}.</strong> Restaurants, hours, and menus change by semester,
          holiday, and break. Every place here was confirmed open against PantherDining or the Downtown Atlanta dining
          directory, but check today’s hours before you walk over. Hours are only listed where an official source gives
          them.
        </p>
      </aside>

      {/* Jump links */}
      <nav aria-label="Areas" className="-mt-4 flex flex-wrap gap-2">
        {EAT_AREA_LIST.map((area) => (
          <a
            key={area}
            href={`#${area}`}
            className="rounded-full border border-line px-3.5 py-1.5 text-[0.85rem] font-semibold text-ink-soft no-underline transition-colors hover:border-brand hover:text-brand"
          >
            {EAT_AREAS[area].title}
          </a>
        ))}
      </nav>

      <PageBlock id="campus" title={EAT_AREAS.campus.title} description={EAT_AREAS.campus.description}>
        <h3 className={cn(eyebrow, 'text-ink-faint')}>Dining halls</h3>
        <EateryGrid eateries={eateriesIn(eateries, 'campus', 'dining-halls')} />
        <h3 className={cn(eyebrow, 'mt-4 text-ink-faint')}>Eateries & cafés</h3>
        <EateryGrid eateries={eateriesIn(eateries, 'campus', 'others')} />
      </PageBlock>

      {EAT_AREA_LIST.filter((a) => a !== 'campus').map((area) => (
        <PageBlock key={area} id={area} title={EAT_AREAS[area].title} description={EAT_AREAS[area].description}>
          <EateryGrid eateries={eateriesIn(eateries, area)} />
        </PageBlock>
      ))}

      <PageBlock title="A little farther">
        <p className="text-[0.95rem] leading-relaxed text-muted">
          Also in the Downtown Atlanta directory:{' '}
          {MORE_EATS.map((m, i) => (
            <span key={m.name}>
              {i > 0 ? ', ' : ''}
              <strong className="text-ink">{m.name}</strong> ({m.address})
            </span>
          ))}
          .
        </p>
      </PageBlock>

      <div className="grid gap-6 md:grid-cols-2">
        <PageBlock title="Quick tips">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-[0.95rem] leading-relaxed text-muted marker:text-brand">
            {EAT_TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </PageBlock>
        <PageBlock title="Useful links">
          <ul className="flex flex-col gap-2 text-[0.95rem]">
            {EAT_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className={inlineLink} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </PageBlock>
      </div>
    </div>
  )
}

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage('eat')
  return page ? { title: page.title, description: page.description ?? FALLBACK_METADATA.description } : FALLBACK_METADATA
}

/**
 * The Places to Eat page officers wrote in the dashboard, once it's published; the one above
 * until then. Either way the eateries are the dashboard's (or the built-in list until it has any).
 */
export default async function EatPage() {
  const page = await getPublishedPage('eat')
  return page ? <ManagedPage page={page} eyebrow={SITE_PAGES.eat.eyebrow} /> : <EatContent eateries={await getEateries()} />
}
