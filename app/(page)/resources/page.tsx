import { ArrowUpRight, MapPin, MessagesSquare, type LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { CSSProperties, FC } from 'react'

import { ManagedPage, managedPageMetadata } from '@/globals/Page/ManagedPage'
import { accentOf, accentTile, GuidePicks } from '@/globals/GuidePicks'
import { InsiderTip } from '@/globals/InsiderTip'
import { getGuidePicks, getPublishedPage, getResources, pageMetadata } from '@/lib/dashboard/public'
import { picksFor, type GuidePick } from '@/lib/guidePicks'
import { SITE_PAGES } from '@/lib/sitePages'
import { PageBlock, PageCallout, PageHeader } from '@/globals/Page'
import { button, card, grid3, iconTile, pageShell } from '@/globals/ui/styles'
import { getPlace, mapHref } from '@/lib/data/places'
import { CHATS_GROUP, resourcesIn, type Resource, type ResourceGroup } from '@/lib/resources'
import { CARD_ICONS } from '@/lib/richtext/blocks'

/** The whole card opens the resource (the title link is stretched over it); "Show on map" sits above that layer. */
const ResourceCard: FC<{ link: Resource; Icon?: LucideIcon; accent?: CSSProperties }> = ({ link, Icon, accent }) => {
  const place = link.placeId ? getPlace(link.placeId) : undefined
  return (
    <li
      style={accent}
      className={card({
        className:
          'group relative flex h-full items-start gap-[0.9rem] px-5 py-[1.1rem] text-ink transition-colors hover:border-(--accent,var(--brand)) has-[a:focus-visible]:border-brand',
      })}
    >
      {Icon ? (
        <span className={accent ? accentTile : iconTile} aria-hidden>
          <Icon size={20} strokeWidth={2} />
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <a
          href={link.href}
          className="text-[1.05rem] leading-snug font-bold text-ink no-underline outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <p className="text-[0.88rem] leading-[1.55] text-muted">{link.description}</p>
        {link.tip ? <InsiderTip tip={link.tip} className="relative z-10 mt-1" /> : null}
        {place ? (
          <Link
            href={mapHref(place)}
            aria-label={`Show ${place.name} on the map`}
            className="relative z-10 mt-1 inline-flex items-center gap-1 self-start text-[0.8rem] font-semibold text-brand no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <MapPin size={13} aria-hidden />
            Show on map
          </Link>
        ) : null}
      </div>
      <ArrowUpRight
        className="mt-1 shrink-0 text-muted transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand"
        size={18}
        aria-hidden
      />
    </li>
  )
}

/** The resources and their groups, from the dashboard (or the built-in list until it has any) */
function ResourcesContent({ groups, resources, picks }: { groups: readonly ResourceGroup[]; resources: readonly Resource[]; picks: readonly GuidePick[] }) {
  const shown = groups.filter((g) => resourcesIn(resources, g.slug).length)
  return (
    <div className={pageShell}>
      <PageHeader
        eyebrow="Resources"
        title="Student resources"
        lead="Georgia State has more help on offer than most students ever find out about, and you’re already paying for it. These are the links we send Panthers to most, from registering for classes to free groceries."
      >
        {shown.some((g) => g.slug === CHATS_GROUP) ? (
          <a href={`#${CHATS_GROUP}`} className={button()}>
            <MessagesSquare size={16} aria-hidden />
            Join a group chat
          </a>
        ) : null}
      </PageHeader>

      <GuidePicks picks={picks} className="-mt-4" />

      {/* Jump links, each in its group's color */}
      <nav aria-label="Categories" className="-mt-4 flex flex-wrap gap-2">
        {shown.map(({ slug, title, icon }, i) => {
          const Icon = CARD_ICONS[icon]?.Icon
          return (
            <a
              key={slug}
              href={`#${slug}`}
              style={accentOf(i)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[0.85rem] font-semibold text-ink-soft no-underline transition-colors hover:border-(--accent) hover:text-ink"
            >
              {Icon ? <Icon size={14} aria-hidden className="text-(--accent)" /> : <span aria-hidden className="size-2 rounded-full bg-(--accent)" />}
              {title}
              <span className="text-[0.75rem] font-bold text-ink-faint">{resourcesIn(resources, slug).length}</span>
            </a>
          )
        })}
      </nav>

      {shown.map(({ slug, title, description, icon }, i) => (
        <PageBlock key={slug} id={slug} title={title} description={description}>
          <ul className={grid3}>
            {resourcesIn(resources, slug).map((link) => (
              <ResourceCard key={link.id} link={link} Icon={CARD_ICONS[icon]?.Icon} accent={accentOf(i)} />
            ))}
          </ul>
        </PageBlock>
      ))}

      <PageCallout
        title="Can't find what you need?"
        actions={
          <Link href="/contact" className={button({ variant: 'outline' })}>
            Ask the officers
          </Link>
        }
      >
        Tell us what you&apos;re looking for and we&apos;ll point you in the right direction.
      </PageCallout>
    </div>
  )
}

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage('resources')
  // Its page in the dashboard, while published; otherwise the tab title officers set (or the site's own)
  const meta = await pageMetadata('/resources')
  return page ? managedPageMetadata(page, meta.description) : meta
}

/** The Resources page officers wrote in the dashboard, once it's published; the one above until then */
export default async function ResourcesPage() {
  const [page, { groups, resources }, rows] = await Promise.all([getPublishedPage('resources'), getResources(), getGuidePicks('resources')])
  const picks = picksFor('resources', rows, { resources })
  // The picks lead either page: the site's own, or the one officers wrote
  return page ? (
    <ManagedPage page={page} eyebrow={SITE_PAGES.resources.eyebrow} before={<GuidePicks picks={picks} />} />
  ) : (
    <ResourcesContent groups={groups} resources={resources} picks={picks} />
  )
}
