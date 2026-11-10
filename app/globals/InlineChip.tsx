'use client'

import { Bookmark, BookOpen, CalendarDays, FileText, MapPin, Utensils } from 'lucide-react'
import Link from 'next/link'
import type { FC, ReactNode } from 'react'

import { useSiteContent } from '@/globals/SiteContent'
import type { ClubEvent } from '@/lib/data/events'
import { getPlace, mapHref } from '@/lib/data/places'
import { eateryMapId } from '@/lib/eateries'
import { NO_SITE_CONTENT, resolveReference, type SiteContent } from '@/lib/references'
import type { ChipData, ChipKind } from '@/lib/richtext/blocks/inlineItems'
import { safeHref } from '@/lib/safeUrl'

const ICONS: Record<ChipKind, ReactNode> = {
  place: <MapPin aria-hidden />,
  event: <CalendarDays aria-hidden />,
  post: <FileText aria-hidden />,
  page: <Bookmark aria-hidden />,
  eatery: <Utensils aria-hidden />,
  resource: <BookOpen aria-hidden />,
}

const chip = 'mx-0.5 inline-flex max-w-full items-center gap-1 rounded-full border border-brand-edge bg-brand-tint px-2 py-0.5 align-baseline text-[0.85em] leading-snug font-semibold text-brand no-underline [&>svg]:size-[1em] [&>svg]:shrink-0'

/** Events run on campus's clock, wherever someone's reading */
const eventDay = (e: ClubEvent) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' }).format(new Date(e.start))

/** What a chip points at now, or null when it's gone */
const lookUp = ({ kind, target: ref }: ChipData, content: SiteContent | null): { title: string; href: string } | null => {
  if (kind === 'event') {
    const event = [...(content?.events ?? []), ...(content?.pastEvents ?? [])].find((e) => e.id === ref)
    return event ? { title: `${event.name} · ${eventDay(event)}`, href: event.href ?? `/events#event-${event.id}` } : null
  }
  const found = resolveReference({ kind, ref }, content ?? NO_SITE_CONTENT)
  if (found?.kind === 'eatery') {
    const id = eateryMapId(found.eatery)
    return { title: found.eatery.name, href: id ? `/map?place=${id}` : '/eat' }
  }
  if (found && 'href' in found) return { title: found.title, href: found.href }
  // The map's own places are here even on a page without what's published
  const place = kind === 'place' ? getPlace(ref) : undefined
  return place ? { title: place.name, href: mapHref(place) } : null
}

/**
 * A thing on the site named in a sentence, linked to it, looked up when the page is shown so
 * a renamed one stays right. One that's gone is just its name from when it was picked. With
 * `preview`, in the editor, it doesn't go anywhere.
 */
export const InlineChip: FC<ChipData & { preview?: boolean }> = ({ preview, ...data }) => {
  const found = lookUp(data, useSiteContent())
  if (!found) return preview ? <span className={`${chip} border-dashed opacity-70`}>{data.label || 'Not found'}</span> : <>{data.label}</>
  const body = (
    <>
      {ICONS[data.kind]}
      <span className="truncate">{found.title}</span>
    </>
  )
  const href = safeHref(found.href)
  if (preview || !href) return <span className={chip}>{body}</span>
  return href.startsWith('/') ? (
    <Link href={href} className={chip}>
      {body}
    </Link>
  ) : (
    <a href={href} className={chip} {...(/^https?:/i.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {body}
    </a>
  )
}
