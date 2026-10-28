/* eslint-disable @next/next/no-img-element -- cover images can be from any site, at any size */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SiteContentProvider } from '@/globals/SiteContent'
import { formatDate } from '@/lib/dashboard/format'
import { getPublishedPost, getSiteContent } from '@/lib/dashboard/public'
import { DocumentBody } from '@/lib/richtext'
import { hasLiveBlock } from '@/lib/richtext/blocks'
import { inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug)
  return post ? { title: post.title, description: post.excerpt ?? undefined, openGraph: post.cover_image_url ? { images: [post.cover_image_url] } : undefined } : {}
}

export default async function PostPage({ params }: Props) {
  const post = await getPublishedPost((await params).slug)
  if (!post) notFound()
  return (
    <article className={cn(pageShell, 'max-w-3xl gap-8')}>
      <header className="flex flex-col gap-3">
        <Link href="/posts" className={cn(inlineLink, 'text-[0.9rem]')}>
          ← All posts
        </Link>
        <h1 className="m-0 text-[clamp(2rem,5vw,3rem)] leading-[1.1] font-extrabold tracking-tight text-balance text-ink">{post.title}</h1>
        <p className="m-0 text-[0.9rem] text-muted">
          <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
        </p>
      </header>
      {post.cover_image_url ? <img src={post.cover_image_url} alt="" className="aspect-video w-full rounded-2xl object-cover" /> : null}
      {hasLiveBlock(post.body) ? (
        <SiteContentProvider content={await getSiteContent()}>
          <DocumentBody source={post.body} />
        </SiteContentProvider>
      ) : (
        <DocumentBody source={post.body} />
      )}
    </article>
  )
}
