/* eslint-disable @next/next/no-img-element -- cover images can be from any site, at any size */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@/components'
import { SiteContentProvider } from '@/globals/SiteContent'
import { formatDate } from '@/lib/dashboard/format'
import { getPublishedPost, getRelatedPosts, getSiteContent } from '@/lib/dashboard/public'
import { DocumentBody, documentHeadings, plainText, readingMinutes } from '@/lib/richtext'
import { hasLiveBlock } from '@/lib/richtext/blocks'
import { previewImagePath } from '@/lib/siteUrl'
import { postCategoryLabel } from '@/lib/supabase/types'
import { inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'

export const revalidate = 300

/** Fewer headings than this, and an "On this page" list isn't worth its space */
const TOC_MIN = 3

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPost(slug)
  if (!post) return { title: 'Post not found' }
  const images = [post.cover_image_url ?? previewImagePath('post', slug)]
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: { type: 'article', title: post.title, description: post.excerpt ?? undefined, images, publishedTime: post.published_at ?? undefined },
    twitter: { card: 'summary_large_image', images },
  }
}

export default async function PostPage({ params }: Props) {
  const post = await getPublishedPost((await params).slug)
  if (!post) notFound()
  const related = await getRelatedPosts(post)
  const headings = documentHeadings(post.body)
  const minutes = readingMinutes(plainText(post.body))
  const category = postCategoryLabel(post.category)
  return (
    <article className={cn(pageShell, 'max-w-3xl gap-8')}>
      <header className="flex flex-col gap-3">
        <Link href="/posts" className={cn(inlineLink, 'text-[0.9rem]')}>
          ← All posts
        </Link>
        {category ? (
          <Link href={`/posts?category=${post.category}`} className="self-start no-underline">
            <Badge size="sm" tone="brand">
              {category}
            </Badge>
          </Link>
        ) : null}
        <h1 className="m-0 text-[clamp(2rem,5vw,3rem)] leading-[1.1] font-extrabold tracking-tight text-balance text-ink">{post.title}</h1>
        <p className="m-0 text-[0.9rem] text-muted">
          {post.author_name ? <>By {post.author_name} · </> : null}
          <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time> · {minutes} min read
        </p>
      </header>
      {post.cover_image_url ? <img src={post.cover_image_url} alt="" className="aspect-video w-full rounded-2xl object-cover" /> : null}
      {headings.length >= TOC_MIN ? (
        <nav aria-label="On this page" className="flex flex-col gap-2 rounded-xl border border-line bg-fill px-4 py-3">
          <p className="m-0 text-[0.8rem] font-bold tracking-wide text-muted uppercase">On this page</p>
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {headings.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} className={cn(inlineLink, 'text-[0.92rem]')}>
                  {h.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      {hasLiveBlock(post.body) ? (
        <SiteContentProvider content={await getSiteContent()}>
          <DocumentBody source={post.body} />
        </SiteContentProvider>
      ) : (
        <DocumentBody source={post.body} />
      )}
      {related.length ? (
        <aside aria-labelledby="related-posts" className="flex flex-col gap-3 border-t border-line pt-6">
          <h2 id="related-posts" className="m-0 text-[1.1rem] font-bold text-ink">
            Keep reading
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {related.map((p) => (
              <li key={p.slug}>
                <Link href={`/posts/${p.slug}`} className="group flex flex-col rounded-xl border border-line p-3.5 no-underline transition-colors hover:border-brand-edge">
                  <span className="font-bold text-ink group-hover:text-brand">{p.title}</span>
                  <span className="text-[0.82rem] text-muted">{formatDate(p.published_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  )
}
