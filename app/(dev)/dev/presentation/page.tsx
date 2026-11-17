import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Deck, type DeckSlide } from '@/(page)/presentations/Deck'
import { pageShell } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { deckSettings } from '@/lib/presentations'
import { DocumentBody } from '@/lib/richtext'

export const metadata: Metadata = {
  title: 'Presentation',
  robots: { index: false, follow: false },
}

/** A sample deck, in markdown, as a presentation's slides can also be written, with one slide of each kind */
const SLIDES: (DeckSlide & { body: string })[] = [
  { id: 'welcome', layout: 'title', title: 'Welcome to CSEG', body: 'The Campus Survival and Engagement Group at Georgia State\n\n**Fall 2026 kickoff** · Student Center East' },
  { id: 'who', title: 'Who we are', body: '- Students who commute, for students who commute\n- Officers from every college on campus\n- Open to everyone: no dues to come to a meeting' },
  { id: 'part', layout: 'section', title: 'What we do', body: 'Guides, events, and a voice for commuters.' },
  { id: 'what', layout: 'image-right', image: '/assets/logos/cseg-pin.png', title: 'Campus guides', body: '1. **Where to park**, and what it costs\n2. **Where to eat** between classes\n3. **Where to study** when the library is full' },
  { id: 'quote', layout: 'image-full', title: 'Why it matters', body: '> “I found my people in the first week, and I don’t even live near campus.”' },
  { id: 'join', title: 'Join us', body: 'Meetings are every other Thursday at 12:30.\n\nSign up at [the Join page](/join), or find us on Instagram.' },
]

const NOTES = ['Thank everyone for coming; introduce the officers.', 'Ask who drove, who took MARTA, who walked.', '', 'Point at the map on the table.', 'Pause here for a moment.', 'Pass the sign-up sheet around.']

/**
 * The slide player with a sample deck, to look at and try without a database: as a
 * published presentation shows on the site, with the speaker notes officers see when
 * presenting from the dashboard. `?theme=dark|brand|paper|light` tries a theme. Only served
 * by `next dev`.
 */
export default async function PresentationDemoPage({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { theme } = await searchParams
  return (
    <article className={cn(pageShell, 'max-w-5xl gap-6')}>
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-[clamp(1.8rem,4.5vw,2.75rem)] leading-[1.1] font-extrabold tracking-tight text-balance text-ink">Fall kickoff</h1>
        <p className="m-0 max-w-3xl text-[clamp(1rem,1.6vw,1.15rem)] leading-[1.7] text-muted">What CSEG is, what we do, and how to join.</p>
        <p className="m-0 text-[0.9rem] text-muted">By Jordan Lee · Nov 14, 2026 · {SLIDES.length} slides</p>
      </header>
      <Deck
        settings={deckSettings({ theme, transition: 'slide', autoplay: 5 })}
        notes={NOTES}
        slides={SLIDES.map(({ id, title, layout, image }) => ({ id, title, layout, image }))}
        bodies={SLIDES.map((s) => (
          <DocumentBody key={s.id} source={s.body} className="text-[clamp(1rem,1.6vw,1.2rem)]" />
        ))}
      />
    </article>
  )
}
