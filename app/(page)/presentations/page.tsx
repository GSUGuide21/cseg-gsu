import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState } from '@/components'
import { PageHeader } from '@/globals/Page'
import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/dashboard/format'
import { getPublishedPresentations } from '@/lib/dashboard/public'

export const metadata: Metadata = { title: 'Presentations', description: 'Slides from CSEG’s meetings, workshops, and events.' }

// New presentations show up within five minutes (publishing refreshes it right away, too)
export const revalidate = 300

export default async function PresentationsPage() {
  const decks = await getPublishedPresentations()
  return (
    <div className={cn(pageShell, 'max-w-4xl gap-[clamp(2rem,4vw,3rem)]')}>
      <PageHeader eyebrow="Presentations" title="Slides from CSEG" lead="What we’ve shown at meetings, workshops, and events, to read back or pass along." />
      {decks.length ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {decks.map((d) => (
            <li key={d.slug}>
              <Link
                href={`/presentations/${d.slug}`}
                className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-5 no-underline shadow-card transition-colors hover:border-brand-edge focus-visible:outline-2 focus-visible:outline-brand"
              >
                <span className="text-[1.15rem] leading-snug font-bold text-ink">{d.title}</span>
                {d.description ? <span className="text-[0.95rem] leading-relaxed text-muted">{d.description}</span> : null}
                <span className="text-[0.82rem] text-muted">
                  {d.author_name ? `${d.author_name} · ` : ''}
                  {d.published_at ? `${formatDate(d.published_at)} · ` : ''}
                  {d.slideCount} {d.slideCount === 1 ? 'slide' : 'slides'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState bordered title="No presentations yet" description="Check back after our next meeting." />
      )}
    </div>
  )
}
