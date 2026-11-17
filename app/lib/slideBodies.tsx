import { toDeckSlide } from '@/lib/presentations'
import { DocumentBody } from '@/lib/richtext'
import type { PresentationSlide } from '@/lib/supabase/types'

/** A slide's writing, drawn; nothing for none */
export const slideBody = (source: string | undefined) => (source?.trim() ? <DocumentBody source={source} /> : null)

/** What a Deck needs to play these slides: each one's settings, its writing, and its second column's */
export const deckContent = (slides: readonly PresentationSlide[]) => ({
  slides: slides.map(toDeckSlide),
  bodies: slides.map((s) => slideBody(s.body)),
  seconds: slides.map((s) => slideBody(s.body2)),
})
