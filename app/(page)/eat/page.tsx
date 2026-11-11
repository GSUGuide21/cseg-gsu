import { ArrowUpRight, Clock, MapPin, Utensils } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { EateryGrid } from '@/globals/Eateries'
import { accentOf, GuidePicks } from '@/globals/GuidePicks'
import { PageBlock, PageHeader } from '@/globals/Page'
import { ManagedPage, managedPageMetadata } from '@/globals/Page/ManagedPage'
import { button, card, eyebrow, iconTile, inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getEatAreas, getEateries, getGuidePicks, getPublishedPage, pageMetadata } from '@/lib/dashboard/public'
import { EAT_LINKS, EAT_TIPS, EATS_CHECKED, MORE_EATS } from '@/lib/data/eats'
import { eateriesIn, type Eatery, type EateryArea } from '@/lib/eateries'
import { picksFor, type GuidePick } from '@/lib/guidePicks'
import { SITE_PAGES } from '@/lib/sitePages'

/** The guide at a glance, as chips under the title: how much is in it */
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function EatContent({ eateries, areas, picks }: { eateries: readonly Eatery[]; areas: readonly EateryArea[]; picks: readonly GuidePick[] }) {
  const shown = areas.filter((a) => eateriesIn(eateries, a.slug).length)
  const halls = eateries.filter((e) => e.diningHall).length

  return (
    <div className={pageShell}>
      <PageHeader
        eyebrow="Food"
        title="Places to eat"
        lead="Twenty minutes between classes, or a whole evening to kill: here’s where Panthers actually eat. Dining halls, campus counters, and the restaurants, cafés, and late-night spots a short walk from class."
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

      <ul className="-mt-6 m-0 flex list-none flex-wrap gap-2 p-0 text-[0.85rem] font-semibold text-ink-soft" aria-label="In this guide">
        <li className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1 text-brand">
          <Utensils size={14} aria-hidden />
          {count(eateries.length, 'place to eat', 'places to eat')}
        </li>
        {halls ? <li className="rounded-full bg-fill px-3 py-1">{count(halls, 'dining hall', 'dining halls')}</li> : null}
        <li className="rounded-full bg-fill px-3 py-1">{count(shown.length, 'part of town', 'parts of town')}</li>
      </ul>

      <GuidePicks picks={picks} />

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
        {shown.map((area, i) => (
          <a
            key={area.slug}
            href={`#${area.slug}`}
            style={accentOf(i)}
            className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-[0.85rem] font-semibold text-ink-soft no-underline transition-colors hover:border-(--accent) hover:text-ink"
          >
            <span aria-hidden className="size-2 rounded-full bg-(--accent)" />
            {area.title}
            <span className="text-[0.75rem] font-bold text-ink-faint">{eateriesIn(eateries, area.slug).length}</span>
          </a>
        ))}
      </nav>

      {/* An area with dining halls shows them first, apart from the rest */}
      {shown.map((area) => {
        const halls = eateriesIn(eateries, area.slug, 'dining-halls')
        return (
          <PageBlock key={area.slug} id={area.slug} title={area.title} description={area.description}>
            {halls.length ? (
              <>
                <h3 className={cn(eyebrow, 'text-ink-faint')}>Dining halls</h3>
                <EateryGrid eateries={halls} />
                <h3 className={cn(eyebrow, 'mt-4 text-ink-faint')}>Eateries & cafés</h3>
                <EateryGrid eateries={eateriesIn(eateries, area.slug, 'others')} />
              </>
            ) : (
              <EateryGrid eateries={eateriesIn(eateries, area.slug)} />
            )}
          </PageBlock>
        )
      })}

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
  // Its page in the dashboard, while published; otherwise the tab title officers set (or the site's own)
  const meta = await pageMetadata('/eat')
  return page ? managedPageMetadata(page, meta.description) : meta
}

/**
 * The Places to Eat page officers wrote in the dashboard, once it's published; the one above
 * until then. Either way the eateries are the dashboard's (or the built-in list until it has any).
 */
export default async function EatPage() {
  const [page, eateries, areas, rows] = await Promise.all([getPublishedPage('eat'), getEateries(), getEatAreas(), getGuidePicks('eat')])
  const picks = picksFor('eat', rows, { eateries })
  // The picks lead either page: the site's own, or the one officers wrote
  return page ? <ManagedPage page={page} eyebrow={SITE_PAGES.eat.eyebrow} before={<GuidePicks picks={picks} />} /> : <EatContent eateries={eateries} areas={areas} picks={picks} />
}
