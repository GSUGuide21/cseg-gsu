import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Deck } from '@/(page)/presentations/Deck'
import { SiteContentProvider } from '@/globals/SiteContent'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteContent } from '@/lib/dashboard/public'
import { getPresentation } from '@/lib/dashboard/queries'
import { deckSettings, shownSlides } from '@/lib/presentations'
import { deckContent } from '@/lib/slideBodies'

export const metadata: Metadata = { title: 'Audience view', robots: { index: false, follow: false } }

/**
 * A presentation's audience window: the slides alone, filling the window, without the
 * dashboard around them, for the projector. The presenter opens it from the dashboard's
 * Present view, and it follows that one (and that one follows it), so a clicker works in
 * either. No notes reach it. It's outside the dashboard's layout, so there's nothing on screen
 * but the slides.
 */
export default async function AudiencePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOfficer()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const deck = await getPresentation(id)
  if (!deck) notFound()
  const slides = shownSlides(deck.slides)
  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <SiteContentProvider content={await getSiteContent()}>
        <Deck
          mode="audience"
          sync={`deck-${deck.id}`}
          settings={deckSettings(deck.settings)}
          {...deckContent(slides)}
        />
      </SiteContentProvider>
    </main>
  )
}
