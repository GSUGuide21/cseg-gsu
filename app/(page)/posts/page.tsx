/* eslint-disable @next/next/no-img-element -- cover images can be from any site, at any size */
import type { Metadata } from 'next'
import Link from 'next/link'

import { EmptyState } from '@/components'
import { formatDate } from '@/lib/dashboard/format'
import { getPublishedPosts } from '@/lib/dashboard/public'
import { PageHeader } from '@/globals/Page'
import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Posts',
  description: 'News and announcements from CSEG.',
}

// New posts show up within five minutes (publishing refreshes it right away, too)
export const revalidate = 300

export default async function PostsPage() {
  const posts = await getPublishedPosts()
  return (
    <div className={cn(pageShell, 'max-w-4xl gap-[clamp(2rem,4vw,3rem)]')}>
      <PageHeader eyebrow="Posts" title="News from CSEG" lead="Announcements, recaps, and what’s coming up." />
      {posts.length ? (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/posts/${p.slug}`} className="group flex flex-col gap-4 rounded-2xl border border-line p-5 no-underline transition-colors hover:border-brand-edge sm:flex-row">
                {p.cover_image_url ? <img src={p.cover_image_url} alt="" className="aspect-video w-full shrink-0 rounded-xl object-cover sm:w-48" loading="lazy" /> : null}
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-[0.8rem] text-muted">{formatDate(p.published_at)}</span>
                  <span className="text-[1.2rem] font-bold text-ink group-hover:text-brand">{p.title}</span>
                  {p.excerpt ? <span className="text-[0.95rem] text-ink-soft">{p.excerpt}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState bordered title="No posts yet" description="Check back soon, or follow us on Instagram for the latest." />
      )}
    </div>
  )
}
