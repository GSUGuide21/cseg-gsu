import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SlideView, Stage } from '@/(page)/presentations/Deck'
import { SiteContentProvider } from '@/globals/SiteContent'
import { inlineLink } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { getPresentationToPrint, getSiteContent } from '@/lib/dashboard/public'
import { deckSettings, shownSlides, slideChrome, themeClass } from '@/lib/presentations'
import { slideBody } from '@/lib/slideBodies'
import { toDeckSlide } from '@/lib/presentations'

import { PrintButton } from './PrintButton'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const deck = await getPresentationToPrint((await params).slug)
  return { title: deck ? `${deck.title} (print)` : 'Presentation not found', robots: { index: false, follow: false } }
}

/**
 * A presentation laid out for paper: every slide it shows, in order, one to a widescreen
 * sheet, in the deck's theme, without the site around it. The browser's print dialog saves
 * it as a PDF. Published decks print for anyone who can open them; officers, signed in, can
 * print drafts and private ones too.
 */
export default async function PrintPresentationPage({ params }: Props) {
  const deck = await getPresentationToPrint((await params).slug)
  if (!deck) notFound()
  const slides = shownSlides(deck.slides)
  const settings = deckSettings(deck.settings)
  const theme = themeClass(settings.theme)
  return (
    <SiteContentProvider content={await getSiteContent()}>
      {/* A sheet the shape of a slide, with nothing around it */}
      <style>{`@page { size: 13.333in 7.5in; margin: 0 } @media print { html, body { background: none } }`}</style>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 print:max-w-none print:gap-0 print:p-0">
        <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="m-0 text-[1.5rem] font-extrabold tracking-tight text-ink">{deck.title}</h1>
            <p className="m-0 text-[0.9rem] text-muted">
              {slides.length} {slides.length === 1 ? 'slide' : 'slides'}, one to a page. In the print dialog, pick “Save as PDF” and turn on background graphics.{' '}
              <Link href={`/presentations/${deck.slug}`} className={inlineLink}>
                Back to the presentation
              </Link>
            </p>
          </div>
          <PrintButton />
        </header>
        {slides.length ? (
          slides.map((s, i) => (
            <section
              key={s.id}
              aria-label={`Slide ${i + 1} of ${slides.length}${s.title ? `: ${s.title}` : ''}`}
              style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
              className={cn(
                'relative aspect-video overflow-hidden rounded-xl border border-line bg-surface text-ink shadow-card',
                'print:aspect-auto print:h-[7.5in] print:w-[13.333in] print:break-after-page print:rounded-none print:border-0 print:shadow-none',
                theme
              )}
            >
              <Stage fill>
                <SlideView slide={toDeckSlide(s)} second={slideBody(s.body2)} chrome={slideChrome(settings, i + 1, s.layout)}>
                  {slideBody(s.body)}
                </SlideView>
              </Stage>
            </section>
          ))
        ) : (
          <p className="m-0 text-muted">This presentation has no slides to print.</p>
        )}
      </main>
    </SiteContentProvider>
  )
}
