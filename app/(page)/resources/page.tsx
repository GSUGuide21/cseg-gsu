import { ArrowUpRight, MapPin, MessagesSquare, type LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { FC } from 'react'

import { ManagedPage, managedPageMetadata } from '@/globals/Page/ManagedPage'
import { getPublishedPage, getResources, pageMetadata } from '@/lib/dashboard/public'
import { SITE_PAGES } from '@/lib/sitePages'
import { PageBlock, PageCallout, PageHeader } from '@/globals/Page'
import { button, card, grid3, iconTile, pageShell } from '@/globals/ui/styles'
import { getPlace, mapHref } from '@/lib/data/places'
import { CHATS_GROUP, resourcesIn, type Resource, type ResourceGroup } from '@/lib/resources'
import { CARD_ICONS } from '@/lib/richtext/blocks'

/** The whole card opens the resource (the title link is stretched over it); "Show on map" sits above that layer. */
const ResourceCard: FC<{ link: Resource; Icon?: LucideIcon }> = ({ link, Icon }) => {
  const place = link.placeId ? getPlace(link.placeId) : undefined
  return (
    <li
      className={card({
        className:
          'group relative flex h-full items-start gap-[0.9rem] px-5 py-[1.1rem] text-ink transition-colors hover:border-brand/55 has-[a:focus-visible]:border-brand',
      })}
    >
      {Icon ? (
        <span className={iconTile} aria-hidden>
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
function ResourcesContent({ groups, resources }: { groups: readonly ResourceGroup[]; resources: readonly Resource[] }) {
  const shown = groups.filter((g) => resourcesIn(resources, g.slug).length)
  return (
    <div className={pageShell}>
      <PageHeader
        eyebrow="Resources"
        title="Student resources"
        lead="Georgia State offers more support than most students ever use. These are the links we point Panthers to most, from registering for classes to finding free food."
      >
        {shown.some((g) => g.slug === CHATS_GROUP) ? (
          <a href={`#${CHATS_GROUP}`} className={button()}>
            <MessagesSquare size={16} aria-hidden />
            Join a group chat
          </a>
        ) : null}
      </PageHeader>

      {/* Jump links */}
      <nav aria-label="Categories" className="-mt-4 flex flex-wrap gap-2">
        {shown.map(({ slug, title }) => (
          <a
            key={slug}
            href={`#${slug}`}
            className="rounded-full border border-line px-3.5 py-1.5 text-[0.85rem] font-semibold text-ink-soft no-underline transition-colors hover:border-brand hover:text-brand"
          >
            {title}
          </a>
        ))}
      </nav>

      {shown.map(({ slug, title, description, icon }) => (
        <PageBlock key={slug} id={slug} title={title} description={description}>
          <ul className={grid3}>
            {resourcesIn(resources, slug).map((link) => (
              <ResourceCard key={link.id} link={link} Icon={CARD_ICONS[icon]?.Icon} />
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
  const page = await getPublishedPage('resources')
  return page ? <ManagedPage page={page} eyebrow={SITE_PAGES.resources.eyebrow} /> : <ResourcesContent {...await getResources()} />
}
