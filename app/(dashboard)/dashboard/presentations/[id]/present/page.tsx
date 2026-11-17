import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Deck } from '@/(page)/presentations/Deck'
import { SiteContentProvider } from '@/globals/SiteContent'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteContent } from '@/lib/dashboard/public'
import { getPresentation, getPresentationNotes } from '@/lib/dashboard/queries'
import { deckSettings, shownSlides } from '@/lib/presentations'
import { deckContent } from '@/lib/slideBodies'

export const metadata = { title: 'Present' }

/**
 * A presentation played in the dashboard, as it was last saved: where officers present the
 * private ones (and try out drafts), since those have no address on the site. It's the
 * presenter's view: under the slides, the speaker notes, the next slide, and the clocks, and a
 * button that opens the slides alone in a window of their own (/present/its-id) for the
 * projector, which follows this one.
 */
export default async function PresentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOfficer()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [deck, notes] = await Promise.all([getPresentation(id), getPresentationNotes(id)])
  if (!deck) notFound()
  const slides = shownSlides(deck.slides)
  return (
    <div className="flex flex-col gap-5">
      <Link href={`/dashboard/presentations/${deck.id}`} className="inline-flex items-center gap-1.5 self-start text-[0.85rem] font-semibold text-ink-soft no-underline hover:text-ink">
        <ArrowLeft size={15} aria-hidden /> Back to editing
      </Link>
      <h1 className="m-0 text-[clamp(1.5rem,3vw,1.9rem)] font-extrabold tracking-tight text-ink">{deck.title}</h1>
      <SiteContentProvider content={await getSiteContent()}>
        <Deck
          settings={deckSettings(deck.settings)}
          sync={`deck-${deck.id}`}
          audienceHref={`/present/${deck.id}`}
          notes={slides.map((s) => notes[s.id] ?? '')}
          {...deckContent(slides)}
        />
      </SiteContentProvider>
      <p className="m-0 text-[0.85rem] text-muted">
        To present on a projector, open the audience window, drag it to the projector, and press F there; keep this window on your own screen for the notes. The arrow keys (or a clicker) move both, from either window. G shows every slide, and B blanks the room’s screen.
      </p>
    </div>
  )
}
