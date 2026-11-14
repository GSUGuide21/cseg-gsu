import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SiteContentProvider } from '@/globals/SiteContent'
import { inlineLink, pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/dashboard/format'
import { getPublishedPresentation, getSiteContent } from '@/lib/dashboard/public'
import { DocumentBody } from '@/lib/richtext'
import { hasLiveBlock } from '@/lib/richtext/blocks'

import { Deck } from '../Deck'

// A change in the dashboard refreshes this sooner
export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const deck = await getPublishedPresentation((await params).slug)
  if (!deck) return { title: 'Presentation not found' }
  return { title: deck.title, description: deck.description ?? undefined, ...(deck.visibility === 'public' ? {} : { robots: { index: false, follow: false } }), openGraph: { type: 'article', title: deck.title, description: deck.description ?? undefined } }
}

/** A slide deck, played in the page: its title and what it's about, then its slides one at a time */
export default async function PresentationPage({ params }: Props) {
  const deck = await getPublishedPresentation((await params).slug)
  if (!deck) notFound()
  const slides = Array.isArray(deck.slides) ? deck.slides : []
  const player = (
    <Deck
      slides={slides.map(({ id, title }) => ({ id, title }))}
      bodies={slides.map((s) => (s.body.trim() ? <DocumentBody key={s.id} source={s.body} className="text-[clamp(1rem,1.6vw,1.2rem)]" /> : null))}
    />
  )
  return (
    <article className={cn(pageShell, 'max-w-5xl gap-6')}>
      <header className="flex flex-col gap-3">
        <Link href="/presentations" className={cn(inlineLink, 'text-[0.9rem]')}>
          ← All presentations
        </Link>
        <h1 className="m-0 text-[clamp(1.8rem,4.5vw,2.75rem)] leading-[1.1] font-extrabold tracking-tight text-balance text-ink">{deck.title}</h1>
        {deck.description ? <p className="m-0 max-w-3xl text-[clamp(1rem,1.6vw,1.15rem)] leading-[1.7] text-muted">{deck.description}</p> : null}
        <p className="m-0 text-[0.9rem] text-muted">
          {deck.author_name ? <>By {deck.author_name} · </> : null}
          {deck.published_at ? (
            <>
              <time dateTime={deck.published_at}>{formatDate(deck.published_at)}</time> ·{' '}
            </>
          ) : null}
          {slides.length} {slides.length === 1 ? 'slide' : 'slides'}
        </p>
      </header>
      {/* Blocks that draw from the site (events, eateries) need what the site knows */}
      {slides.some((s) => hasLiveBlock(s.body)) ? <SiteContentProvider content={await getSiteContent()}>{player}</SiteContentProvider> : player}
      <p className="m-0 text-[0.85rem] text-muted">Use the arrow keys or swipe to move between slides, and F for full screen.</p>
    </article>
  )
}
