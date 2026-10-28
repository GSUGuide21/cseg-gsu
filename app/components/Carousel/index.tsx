'use client'

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { useControllable } from '../Form/useControllable'
import { useMediaQuery } from '../Form/useMediaQuery'
import { Thumb } from '../Thumb'
import type { CarouselProps } from './types'

const arrowButton =
  'absolute top-1/2 z-1 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-line bg-surface/90 text-ink shadow-[0_2px_8px_rgb(0_0_0/0.15)] backdrop-blur transition-[opacity,background-color] hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-0'

/**
 * Slides shown one at a time, moved with swipes (it scrolls natively, with snapping), the
 * arrows, the dots or thumbnails, or the arrow keys while focus is inside it.
 *
 *   <Carousel aria-label="Event photos" slides={photos.map((p) => ({ label: p.alt, content: <img … /> }))} />
 *
 * Follows the WAI-ARIA carousel pattern: it's a labeled region of numbered slides; only the
 * slide showing can be tabbed into; slide changes are announced, except while it plays on
 * its own (that would never stop talking).
 */
export const Carousel: FC<CarouselProps> = ({
  slides,
  'aria-label': ariaLabel,
  index: indexProp,
  defaultIndex = 0,
  onIndexChange,
  loop = false,
  autoplay,
  arrows = true,
  dots,
  thumbnails = false,
  viewportClassName,
  className,
}) => {
  const [index, setIndex] = useControllable(indexProp, defaultIndex, onIndexChange)
  const trackRef = useRef<HTMLDivElement>(null)
  const thumbsRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [playing, setPlaying] = useState(!!autoplay)
  const [held, setHeld] = useState(false)
  const count = slides.length
  const current = Math.min(Math.max(0, index), Math.max(0, count - 1))
  const showDots = dots ?? !thumbnails

  const scrollTo = (i: number, smooth: boolean) => {
    const track = trackRef.current
    if (!track) return
    const left = i * track.clientWidth
    if (Math.abs(track.scrollLeft - left) > 1) track.scrollTo?.({ left, behavior: smooth && !reduced ? 'smooth' : 'instant' })
  }

  const goTo = (i: number) => {
    const next = loop ? (i + count) % count : Math.min(Math.max(0, i), count - 1)
    setIndex(next)
    scrollTo(next, true)
  }

  // A new index from outside (or on first load): bring that slide into view
  useEffect(() => {
    scrollTo(current, false)
    // Only when the index changes; scrollTo reads the track as it is
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  // Keep the active thumbnail in view in its strip
  useEffect(() => {
    const strip = thumbsRef.current
    const thumb = strip?.children[current] as HTMLElement | undefined
    if (strip && thumb) strip.scrollTo?.({ left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2, behavior: 'instant' })
  }, [current])

  // Autoplay, unless paused, hovered or focused, or the person prefers less motion. The
  // timer reads the current slide through a ref, so two ticks before a re-render still
  // advance twice instead of landing on the same slide.
  const autoplaying = !!autoplay && playing && !held && !reduced
  const currentRef = useRef(current)
  currentRef.current = current
  useEffect(() => {
    if (!autoplaying || count < 2) return
    const timer = window.setInterval(() => {
      const next = currentRef.current + 1 < count ? currentRef.current + 1 : 0
      currentRef.current = next
      goTo(next)
    }, autoplay)
    return () => window.clearInterval(timer)
    // goTo only depends on what's listed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplaying, autoplay, count])

  // Swiping and trackpad scrolling: the slide most in view becomes current
  const frame = useRef(0)
  const onScroll = () => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const track = trackRef.current
      if (!track || !track.clientWidth) return
      const i = Math.round(track.scrollLeft / track.clientWidth)
      if (i !== current && i >= 0 && i < count) setIndex(i)
    })
  }

  const slideName = (i: number) => `Go to slide ${i + 1}${slides[i].label ? `: ${slides[i].label}` : ''}`
  const atStart = !loop && current === 0
  const atEnd = !loop && current === count - 1

  return (
    <section
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className={cn('flex flex-col gap-3', className)}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false)
      }}
      onKeyDown={(e) => {
        const typing = (e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')
        if (typing || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
        e.preventDefault()
        goTo(current + (e.key === 'ArrowRight' ? 1 : -1))
      }}
    >
      <div className="relative">
        <div
          ref={trackRef}
          id={`${id}-slides`}
          onScroll={onScroll}
          // Announce slide changes, except while it moves on its own
          aria-live={autoplaying ? 'off' : 'polite'}
          className={cn(
            'flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            viewportClassName
          )}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}${slide.label ? `: ${slide.label}` : ''}`}
              // Only the slide showing can be tabbed into or read
              inert={i !== current}
              className="w-full shrink-0 snap-center snap-always"
            >
              {slide.content}
            </div>
          ))}
        </div>
        {arrows && count > 1 ? (
          <>
            <button type="button" onClick={() => goTo(current - 1)} disabled={atStart} aria-label="Previous slide" aria-controls={`${id}-slides`} className={cn(arrowButton, 'left-3')}>
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button type="button" onClick={() => goTo(current + 1)} disabled={atEnd} aria-label="Next slide" aria-controls={`${id}-slides`} className={cn(arrowButton, 'right-3')}>
              <ChevronRight size={20} aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {(showDots || autoplay) && count > 1 ? (
        <div className="flex items-center justify-center gap-3">
          {autoplay ? (
            <button
              type="button"
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? 'Pause slides' : 'Play slides'}
              className="grid size-8 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
            >
              {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
            </button>
          ) : null}
          {showDots ? (
            <div role="group" aria-label="Choose a slide" className="flex items-center gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}${slide.label ? `: ${slide.label}` : ''}`}
                  aria-current={i === current || undefined}
                  className="grid size-6 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span className={cn('block h-2 rounded-full transition-[width,background-color]', i === current ? 'w-5 bg-brand' : 'w-2 bg-line hover:bg-ink-faint')} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {thumbnails && count > 1 ? (
        <div
          ref={thumbsRef}
          role="group"
          aria-label="Choose a slide"
          // Centered when it fits; auto margins (not justify-center) keep a long strip scrollable from its start
          className="flex gap-2 overflow-x-auto px-0.5 py-1 [scrollbar-width:thin] *:first:ml-auto *:last:mr-auto"
        >
          {slides.map((slide, i) => (
            slide.thumbnail ? (
              <Thumb key={i} src={slide.thumbnail} active={i === current} onClick={() => goTo(i)} label={slideName(i)} />
            ) : (
              // No image for this slide: a numbered tile in the same spot
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={slideName(i)}
                aria-current={i === current || undefined}
                className={cn(
                  'grid aspect-video w-20 shrink-0 cursor-pointer place-items-center rounded-lg border-2 bg-fill text-[0.75rem] font-semibold text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  i === current ? 'border-brand' : 'border-transparent'
                )}
              >
                {i + 1}
              </button>
            )
          ))}
        </div>
      ) : null}
    </section>
  )
}
