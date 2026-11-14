import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Deck } from '@/(page)/presentations/Deck'
import { SiteContentProvider } from '@/globals/SiteContent'
import { requireOfficer } from '@/lib/dashboard/dal'
import { getSiteContent } from '@/lib/dashboard/public'
import { getPresentation } from '@/lib/dashboard/queries'
import { DocumentBody } from '@/lib/richtext'

export const metadata = { title: 'Present' }

/**
 * A presentation played in the dashboard, as it was last saved: where officers present the
 * private ones (and try out drafts), since those have no address on the site.
 */
export default async function PresentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOfficer()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const deck = await getPresentation(id)
  if (!deck) notFound()
  const slides = Array.isArray(deck.slides) ? deck.slides : []
  return (
    <div className="flex flex-col gap-5">
      <Link href={`/dashboard/presentations/${deck.id}`} className="inline-flex items-center gap-1.5 self-start text-[0.85rem] font-semibold text-ink-soft no-underline hover:text-ink">
        <ArrowLeft size={15} aria-hidden /> Back to editing
      </Link>
      <h1 className="m-0 text-[clamp(1.5rem,3vw,1.9rem)] font-extrabold tracking-tight text-ink">{deck.title}</h1>
      <SiteContentProvider content={await getSiteContent()}>
        <Deck
          slides={slides.map(({ id: slideId, title }) => ({ id: slideId, title }))}
          bodies={slides.map((s) => (s.body.trim() ? <DocumentBody key={s.id} source={s.body} className="text-[clamp(1rem,1.6vw,1.2rem)]" /> : null))}
        />
      </SiteContentProvider>
      <p className="m-0 text-[0.85rem] text-muted">Arrow keys move between slides, F goes full screen, and G shows every slide.</p>
    </div>
  )
}
