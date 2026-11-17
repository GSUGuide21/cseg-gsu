import type { PresentationSettings, PresentationSlide, SlideLayout } from '@/lib/supabase/types'

/** A slide as a show needs it: everything but its writing (drawn by the page) and whether it's hidden */
export type DeckSlide = Omit<PresentationSlide, 'body' | 'body2' | 'hidden'>
export const toDeckSlide = (slide: PresentationSlide): DeckSlide => {
  const shown: Partial<PresentationSlide> = { ...slide }
  delete shown.body
  delete shown.body2
  delete shown.hidden
  return shown as DeckSlide
}

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
  { value: 'two-column', label: 'Two columns', description: 'A title, then two columns of writing side by side.' },
  { value: 'comparison', label: 'Comparison', description: 'A title, then two columns, each with its own heading.' },
  { value: 'quote', label: 'Quote', description: 'The writing as a large quote; the title is who said it.' },
  { value: 'blank', label: 'Blank', description: 'Just the writing, with no title showing.' },
]

/** Layouts with a second column of writing */
export const usesSecond = (layout: SlideLayout | undefined) => layout === 'two-column' || layout === 'comparison'

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

/** The longest a deck's footer line can be */
export const DECK_FOOTER_MAX = 80

/** How long one slide can stay up when the deck plays by itself, whatever the deck's time */
export const SLIDE_ADVANCE: readonly { value: number; label: string }[] = [
  { value: 3, label: '3 seconds' },
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: 'A minute' },
  { value: 120, label: 'Two minutes' },
]

/** A slide background colour, if it's one (#rrggbb) */
export const isHexColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)

/**
 * Whether words read better on a colour in light ('dark' background: light words) or dark
 * ones: whichever of white or near-black has more contrast with it.
 */
export const toneOf = (hex: string): 'dark' | 'light' => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.179 ? 'dark' : 'light'
}

export const DEFAULT_DECK_SETTINGS: PresentationSettings = { theme: 'site', transition: 'fade', autoplay: 0, footer: '', numbers: false, logo: false }

/** A deck's theme as a class: the colours everything on its slides is drawn in (see globals.css) */
export const themeClass = (theme: PresentationSettings['theme'] | undefined) => (theme && theme !== 'site' ? `deck-theme deck-theme-${theme}` : undefined)

/** What's along the bottom of a slide: the deck's footer, the slide's number, and the logo, as the deck says */
export type SlideChrome = { footer?: string; number?: number; logo?: boolean }

/**
 * A slide's chrome, from the deck's settings and where the slide is in the show (from 1).
 * A title slide has none, as in a presentation program; nor does a deck that wants none.
 */
export const slideChrome = (settings: PresentationSettings, number: number, layout: SlideLayout | undefined): SlideChrome | undefined => {
  if (layout === 'title' || !(settings.footer || settings.numbers || settings.logo)) return undefined
  return { footer: settings.footer || undefined, number: settings.numbers ? number : undefined, logo: settings.logo || undefined }
}

/** A deck's settings as saved (or sent), with anything missing or unknown at its default */
export const deckSettings = (raw: unknown): PresentationSettings => {
  const given = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const theme = DECK_THEMES.find((t) => t.value === given.theme)?.value ?? DEFAULT_DECK_SETTINGS.theme
  const transition = DECK_TRANSITIONS.find((t) => t.value === given.transition)?.value ?? DEFAULT_DECK_SETTINGS.transition
  const autoplay = DECK_AUTOPLAY.find((a) => a.value === Number(given.autoplay))?.value ?? DEFAULT_DECK_SETTINGS.autoplay
  const footer = typeof given.footer === 'string' ? given.footer.replace(/\s+/g, ' ').trim().slice(0, DECK_FOOTER_MAX) : ''
  return { theme, transition, autoplay, footer, numbers: given.numbers === true, logo: given.logo === true }
}

/** The slides a show plays: all but the ones marked hidden */
export const shownSlides = (slides: unknown): PresentationSlide[] => (Array.isArray(slides) ? (slides as PresentationSlide[]).filter((s) => !s.hidden) : [])
