import type { PresentationSettings, PresentationSlide, SlideLayout } from '@/lib/supabase/types'

/**
 * How a presentation looks and plays: each slide's layout, and the deck's theme, the way one
 * slide gives way to the next, and whether it can play by itself (for a table or a lobby screen).
 */

export const SLIDE_LAYOUTS: readonly { value: SlideLayout; label: string; description: string }[] = [
  { value: 'content', label: 'Title and content', description: 'A title, then the writing under it.' },
  { value: 'title', label: 'Title slide', description: 'A big centered title, with the writing as its subtitle.' },
  { value: 'section', label: 'Section header', description: 'Starts a new part: a large title with an accent bar.' },
  { value: 'image-right', label: 'Content, picture right', description: 'The writing on the left, a picture on the right.' },
  { value: 'image-left', label: 'Picture left, content', description: 'A picture on the left, the writing on the right.' },
  { value: 'image-full', label: 'Picture background', description: 'A picture filling the slide, with the words over it.' },
]

/** Layouts that show the slide's picture */
export const usesImage = (layout: SlideLayout | undefined) => layout === 'image-left' || layout === 'image-right' || layout === 'image-full'

export const DECK_THEMES: readonly { value: PresentationSettings['theme']; label: string }[] = [
  { value: 'site', label: 'The site’s own (light or dark)' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'brand', label: 'GSU blue' },
  { value: 'paper', label: 'Paper' },
]

export const DECK_TRANSITIONS: readonly { value: PresentationSettings['transition']; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide across' },
]

/** Seconds a slide stays up when the deck plays by itself; 0 is off */
export const DECK_AUTOPLAY: readonly { value: number; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 5, label: 'Every 5 seconds' },
  { value: 10, label: 'Every 10 seconds' },
  { value: 15, label: 'Every 15 seconds' },
  { value: 30, label: 'Every 30 seconds' },
  { value: 60, label: 'Every minute' },
]

export const DEFAULT_DECK_SETTINGS: PresentationSettings = { theme: 'site', transition: 'fade', autoplay: 0 }

/** A deck's settings as saved (or sent), with anything missing or unknown at its default */
export const deckSettings = (raw: unknown): PresentationSettings => {
  const given = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const theme = DECK_THEMES.find((t) => t.value === given.theme)?.value ?? DEFAULT_DECK_SETTINGS.theme
  const transition = DECK_TRANSITIONS.find((t) => t.value === given.transition)?.value ?? DEFAULT_DECK_SETTINGS.transition
  const autoplay = DECK_AUTOPLAY.find((a) => a.value === Number(given.autoplay))?.value ?? DEFAULT_DECK_SETTINGS.autoplay
  return { theme, transition, autoplay }
}

/** The slides a show plays: all but the ones marked hidden */
export const shownSlides = (slides: unknown): PresentationSlide[] => (Array.isArray(slides) ? (slides as PresentationSlide[]).filter((s) => !s.hidden) : [])
