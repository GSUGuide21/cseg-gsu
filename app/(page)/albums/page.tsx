/* eslint-disable @next/next/no-img-element -- uploads come at any size, from Storage */
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState } from '@/components'
import { PageHeader } from '@/globals/Page'
import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getAlbums } from '@/lib/content/public'
import { formatDate } from '@/lib/dashboard/format'

export const metadata: Metadata = { title: 'Photos', description: 'Photos from CSEG’s events and meetings.' }

// New albums show up within five minutes (showing one refreshes it right away, too)
export const revalidate = 300

export default async function AlbumsPage() {
  const albums = await getAlbums()
  return (
    <div className={cn(pageShell, 'gap-[clamp(2rem,4vw,3rem)]')}>
      <PageHeader eyebrow="Photos" title="Photo albums" lead="What our events and meetings looked like." />
      {albums.length ? (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-5 p-0">
          {albums.map((a) => {
            const cover = a.cover_url ?? a.photos[0]?.src
            return (
              <li key={a.id}>
                <Link
                  href={`/albums/${a.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface no-underline shadow-card transition-colors hover:border-brand-edge focus-visible:outline-2 focus-visible:outline-brand"
                >
                  {cover ? (
                    <img src={cover} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
                  ) : (
                    <span className="aspect-[4/3] w-full bg-fill" aria-hidden />
                  )}
                  <span className="flex flex-col gap-1 p-4">
                    <span className="text-[1.05rem] leading-snug font-bold text-ink">{a.title}</span>
                    <span className="text-[0.82rem] text-muted">
                      {a.taken_on ? `${formatDate(a.taken_on)} · ` : ''}
                      {a.photos.length} {a.photos.length === 1 ? 'photo' : 'photos'}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState bordered title="No albums yet" description="Check back after our next event." />
      )}
    </div>
  )
}
