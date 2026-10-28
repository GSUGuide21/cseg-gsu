import type { ReactNode } from 'react'

export interface CarouselSlide {
  content: ReactNode
  /** What the slide is, read with its number: "2 of 5: Fall social" */
  label?: string
  /** The image (a URL, ideally a small file) for the thumbnail strip, when `thumbnails` is on */
  thumbnail?: string
}

export interface CarouselProps {
  slides: readonly CarouselSlide[]
  /** What the carousel is, e.g. "Event photos" (required: there's no visible heading in it) */
  'aria-label': string
  /** The slide showing, from 0; leave out to let it manage itself */
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  /** Past the last slide, go back to the first (and the other way). Default false. */
  loop?: boolean
  /**
   * Moves to the next slide every this many ms. There's always a pause button, and it
   * also pauses while hovered or focused, and never runs with reduced motion.
   */
  autoplay?: number
  /** Previous and next buttons. Default true. */
  arrows?: boolean
  /** A dot per slide under it. Default true (off when `thumbnails` is on). */
  dots?: boolean
  /** A strip of each slide's `thumbnail` image under it (a numbered tile for slides without one). Default false. */
  thumbnails?: boolean
  /** Classes for the slide area, e.g. "aspect-video" */
  viewportClassName?: string
  className?: string
}
