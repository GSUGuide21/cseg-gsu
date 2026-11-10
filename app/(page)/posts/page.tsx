import { Rss } from 'lucide-react'
import type { Metadata } from 'next'

import { EmptyState } from '@/components'
import { getPublishedPosts, pageMetadata } from '@/lib/dashboard/public'
import { PageHeader } from '@/globals/Page'
import { PostList } from '@/globals/PostList'
import { inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

export const generateMetadata = async (): Promise<Metadata> => ({
  ...(await pageMetadata('/posts')),
  alternates: { types: { 'application/rss+xml': '/feed.xml' } },
})

// New posts show up within five minutes (publishing refreshes it right away, too)
export const revalidate = 300

export default async function PostsPage() {
  const posts = await getPublishedPosts()
  return (
    <div className={cn(pageShell, 'max-w-4xl gap-[clamp(2rem,4vw,3rem)]')}>
      <PageHeader eyebrow="Posts" title="News from CSEG" lead="Announcements, recaps, and what’s coming up.">
        <a href="/feed.xml" className={cn(inlineLink, 'inline-flex items-center gap-1.5 text-[0.9rem]')}>
          <Rss size={15} aria-hidden /> Follow by RSS
        </a>
      </PageHeader>
      {posts.length ? <PostList posts={posts} /> : <EmptyState bordered title="No posts yet" description="Check back soon, or follow us on Instagram for the latest." />}
    </div>
  )
}
