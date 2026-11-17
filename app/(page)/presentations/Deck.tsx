'use client'

/* eslint-disable @next/next/no-img-element -- slide pictures can be from any site, at any size */
import { ChevronLeft, ChevronRight, LayoutGrid, Maximize, Minimize, Pause, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FC, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { DEFAULT_DECK_SETTINGS } from '@/lib/presentations'
import { safeSrc } from '@/lib/safeUrl'
import type { PresentationSettings, SlideLayout } from '@/lib/supabase/types'

const control =
  'grid size-9 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-brand-tint aria-pressed:text-brand [&>svg]:size-5'

/** The size a slide is laid out for; full screen, it's scaled up from this to fill the screen */
const STAGE = { width: 1100, height: 620 }
/** How far a finger has to travel sideways to turn the slide */
const SWIPE = 50

const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/** A deck's theme as a class: the colours everything on its slides is drawn in (see globals.css) */
export const themeClass = (theme: PresentationSettings['theme'] | undefined) => (theme && theme !== 'site' ? `deck-theme deck-theme-${theme}` : undefined)

export type DeckSlide = { id: string; title: string; layout?: SlideLayout; image?: string }

const titleSize = 'm-0 leading-tight font-extrabold tracking-tight text-balance text-ink'

/**
 * One slide, laid out: its title and its writing (`children`, drawn by the page), arranged
 * as its layout says. The player and the page that prints a deck both draw slides with this.
 */
export const SlideView: FC<{ slide: DeckSlide; children?: ReactNode; style?: CSSProperties; className?: string }> = ({ slide, children, style, className }) => {
  const layout = slide.layout ?? 'content'
  const src = slide.image ? safeSrc(slide.image) : null
  const frame = cn('mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center gap-4 p-[clamp(1.25rem,4vw,3rem)]', className)
  const heading = slide.title ? <h2 className={cn(titleSize, 'text-[clamp(1.5rem,3.5vw,2.4rem)]')}>{slide.title}</h2> : null

  if (layout === 'title')
    return (
      <div style={style} className={cn(frame, 'items-center text-center')}>
        {slide.title ? <h2 className={cn(titleSize, 'text-[clamp(2rem,5.5vw,3.6rem)]')}>{slide.title}</h2> : null}
        {children ? <div className="max-w-2xl text-muted">{children}</div> : null}
      </div>
    )

  if (layout === 'section')
    return (
      <div style={style} className={frame}>
        <span aria-hidden className="h-1.5 w-20 rounded-full bg-brand" />
        {slide.title ? <h2 className={cn(titleSize, 'text-[clamp(1.9rem,5vw,3.2rem)]')}>{slide.title}</h2> : null}
        {children ? <div className="text-muted">{children}</div> : null}
      </div>
    )

  if (layout === 'image-full')
    return (
      // Words over a picture: drawn light on a darkened picture, whatever the deck's theme
      <div className="deck-theme deck-theme-dark relative flex h-full min-h-full flex-col bg-surface">
        {src ? <img src={src} alt="" className="absolute inset-0 size-full object-cover" /> : null}
        <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/85 via-black/45 to-black/20" />
        {/* The words sit along the bottom, where the picture is darkest */}
        <div style={style} className={cn(frame, 'relative min-h-0 flex-1 justify-end')}>
          {heading}
          {children}
        </div>
      </div>
    )

  if (layout === 'image-left' || layout === 'image-right')
    return (
      <div style={style} className={cn(frame, 'max-w-5xl')}>
        <div className="grid items-center gap-[clamp(1rem,3vw,2.5rem)] sm:grid-cols-2">
          <div className={cn('flex min-w-0 flex-col gap-4', layout === 'image-left' && 'sm:order-2')}>
            {heading}
            {children}
          </div>
          {src ? (
            <img src={src} alt="" className="aspect-[4/3] w-full rounded-xl object-cover shadow-card" />
          ) : (
            <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-line bg-fill text-[0.85rem] text-muted">No picture yet</div>
          )}
        </div>
      </div>
    )

  return (
    <div style={style} className={frame}>
      {heading}
      {children}
    </div>
  )
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/**
 * Plays a slide deck: one slide at a time in a 16:9 frame, in the deck's theme, each slide
 * arriving by the deck's transition. Under it: Previous and Next, the slide number, how far
 * through it is, every slide at a glance (to jump to one), and a full-screen button; and, for
 * a deck set to play by itself, a Play button that turns the slides on a timer, round and round.
 *
 * Keys: the arrows, Page Up/Down, Home, and End move between slides (Space too, full screen),
 * as does a swipe. F goes full screen, G shows all the slides, and B blanks the screen. The
 * address keeps the slide's number (#3), so a link can open on a slide.
 *
 * Each slide's writing is drawn by the page and handed in (`bodies`, in the slides' order);
 * this only decides which one shows. With `notes` (the dashboard's, for whoever is presenting),
 * a panel under the frame has the slide's speaker notes, what's next, and a clock; none of it
 * shows full screen, where the room would read it.
 */
export const Deck: FC<{ slides: readonly DeckSlide[]; bodies: readonly ReactNode[]; notes?: readonly string[]; settings?: PresentationSettings }> = ({
  slides,
  bodies,
  notes,
  settings = DEFAULT_DECK_SETTINGS,
}) => {
  const count = slides.length
  const [index, setIndex] = useState(0)
  // Which way the last move went, for a slide to arrive from that side
  const [back, setBack] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [overview, setOverview] = useState(false)
  const [blank, setBlank] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [elapsed, setElapsed] = useState(0)
  const stage = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const go = useCallback(
    (to: number) =>
      setIndex((from) => {
        const next = Math.min(Math.max(to, 0), count - 1)
        if (next !== from) setBack(next < from)
        return next
      }),
    [count]
  )
  const step = useCallback(
    (by: number) =>
      setIndex((from) => {
        const next = Math.min(Math.max(from + by, 0), count - 1)
        if (next !== from) setBack(by < 0)
        return next
      }),
    [count]
  )

  // A link to a slide (#3) opens on it; moving keeps the address in step, without adding history
  const opened = useRef(false)
  useEffect(() => {
    if (!opened.current) {
      opened.current = true
      const n = Number(window.location.hash.slice(1))
      if (Number.isInteger(n) && n >= 1 && n <= count) setIndex(n - 1)
      return
    }
    window.history.replaceState(null, '', index ? `#${index + 1}` : window.location.pathname + window.location.search)
  }, [index, count])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else stage.current?.requestFullscreen?.()?.catch(() => {})
  }, [])

  useEffect(() => {
    const fit = () => {
      const on = !!stage.current && document.fullscreenElement === stage.current
      setFullscreen(on)
      if (!on) setBlank(false)
      setZoom(on ? Math.max(1, Math.min(window.innerWidth / STAGE.width, window.innerHeight / STAGE.height)) : 1)
    }
    document.addEventListener('fullscreenchange', fit)
    window.addEventListener('resize', fit)
    return () => {
      document.removeEventListener('fullscreenchange', fit)
      window.removeEventListener('resize', fit)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return
      const full = document.fullscreenElement === stage.current
      const by = e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && full && !e.shiftKey) ? 1 : e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && full && e.shiftKey) ? -1 : 0
      if (by) step(by)
      else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(count - 1)
      else if (e.key.toLowerCase() === 'f') toggleFullscreen()
      else if (e.key.toLowerCase() === 'g') setOverview((o) => !o)
      else if (e.key.toLowerCase() === 'b' || e.key === '.') setBlank((b) => !b)
      else if (e.key === 'Escape' && !full) setOverview(false)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, go, step, toggleFullscreen])

  // Playing by itself: each slide stays up for the deck's time, then the next, and round again.
  // Turning a slide by hand starts its time over.
  const autoplay = settings.autoplay
  useEffect(() => {
    if (!playing || !autoplay || overview || count < 2) return
    const timer = window.setTimeout(() => {
      setBack(false)
      setIndex((i) => (i + 1) % count)
    }, autoplay * 1000)
    return () => window.clearTimeout(timer)
  }, [playing, autoplay, overview, count, index])

  // The presenter's clock
  const presenting = notes !== undefined
  useEffect(() => {
    if (!presenting) return
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(timer)
  }, [presenting])

  if (!count) return <p className="m-0 text-muted">This presentation has no slides yet.</p>

  const arrive = settings.transition === 'fade' ? 'deck-fade' : settings.transition === 'slide' ? (back ? 'deck-prev' : 'deck-next') : undefined

  return (
    <>
      <div
        ref={stage}
        role="region"
        aria-roledescription="slide deck"
        aria-label="Slides"
        className={cn('flex flex-col bg-surface text-ink', themeClass(settings.theme), fullscreen ? 'h-screen w-screen' : 'overflow-hidden rounded-2xl border border-line shadow-card')}
      >
        <div
          className={cn('relative min-h-0 overflow-hidden', fullscreen ? 'flex-1' : 'aspect-video max-sm:aspect-[4/5]')}
          onTouchStart={(e) => {
            touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
          }}
          onTouchEnd={(e) => {
            const from = touch.current
            touch.current = null
            if (!from || overview) return
            const dx = e.changedTouches[0].clientX - from.x
            const dy = e.changedTouches[0].clientY - from.y
            // Sideways, and clearly not a scroll down a long slide
            if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1)
          }}
        >
          {slides.map((s, i) => (
            <section
              key={s.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} of ${count}${s.title ? `: ${s.title}` : ''}`}
              hidden={i !== index || overview}
              className={cn('absolute inset-0 overflow-y-auto', arrive)}
            >
              <SlideView slide={s} style={fullscreen ? { zoom } : undefined}>
                {bodies[i]}
              </SlideView>
            </section>
          ))}
          {overview ? (
            <nav aria-label="All slides" className="absolute inset-0 overflow-y-auto p-4">
              <ol className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))] gap-3 p-0">
                {slides.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-current={i === index ? 'true' : undefined}
                      onClick={() => {
                        go(i)
                        setOverview(false)
                      }}
                      className="flex aspect-video w-full cursor-pointer flex-col justify-between gap-2 rounded-lg border border-line bg-fill p-3 text-left transition-colors hover:border-brand-edge focus-visible:outline-2 focus-visible:outline-brand aria-[current]:border-brand aria-[current]:bg-brand-tint"
                    >
                      <span className="text-[0.75rem] font-bold text-muted tabular-nums">{i + 1}</span>
                      <span className="line-clamp-3 text-[0.9rem] leading-snug font-semibold text-ink">{s.title || 'Untitled slide'}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          {/* B: the screen goes dark, for the room to look at the speaker; any key or a click brings it back */}
          {blank && fullscreen ? <button type="button" aria-label="Show the slides again" onClick={() => setBlank(false)} className="absolute inset-0 cursor-default border-0 bg-black" /> : null}
        </div>
        {/* How far through it is */}
        <div aria-hidden className="h-1 bg-fill">
          <div className="h-full bg-brand transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${((index + 1) / count) * 100}%` }} />
        </div>
        <div className="flex items-center gap-1 px-2 py-1.5">
          <button type="button" aria-label="Previous slide" disabled={index === 0} onClick={() => step(-1)} className={control}>
            <ChevronLeft aria-hidden />
          </button>
          <span aria-live={playing ? 'off' : 'polite'} className="min-w-16 text-center text-[0.85rem] text-muted tabular-nums">
            {index + 1} / {count}
          </span>
          <button type="button" aria-label="Next slide" disabled={index === count - 1} onClick={() => step(1)} className={control}>
            <ChevronRight aria-hidden />
          </button>
          <span className="ml-2 truncate text-[0.85rem] text-muted max-sm:hidden">{slides[index].title}</span>
          {autoplay && count > 1 ? (
            <button type="button" aria-label={playing ? 'Pause' : `Play by itself, a slide every ${autoplay} seconds`} aria-pressed={playing} onClick={() => setPlaying((p) => !p)} className={cn(control, 'ml-auto')}>
              {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
            </button>
          ) : null}
          <button type="button" aria-label="All slides" aria-pressed={overview} onClick={() => setOverview((o) => !o)} className={cn(control, !(autoplay && count > 1) && 'ml-auto')}>
            <LayoutGrid aria-hidden />
          </button>
          <button type="button" aria-label={fullscreen ? 'Leave full screen' : 'Present full screen'} onClick={toggleFullscreen} className={control}>
            {fullscreen ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
          </button>
        </div>
      </div>
      {presenting ? (
        <aside aria-label="Speaker notes" className="grid gap-x-6 gap-y-3 rounded-xl border border-line bg-fill px-4 py-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="flex flex-col gap-1.5" aria-live="polite">
            <h2 className="m-0 text-[0.75rem] font-bold tracking-wide text-muted uppercase">Speaker notes</h2>
            <p className={cn('m-0 text-[0.95rem] leading-relaxed whitespace-pre-wrap', notes[index] ? 'text-ink' : 'text-muted')}>{notes[index] || 'None for this slide.'}</p>
          </div>
          <div className="flex flex-col gap-1.5 text-[0.85rem]">
            <span className="text-[0.75rem] font-bold tracking-wide text-muted uppercase">Next</span>
            <span className="text-ink">{index + 1 < count ? slides[index + 1].title || `Slide ${index + 2}` : 'The end'}</span>
            <span className="mt-1 flex items-center gap-2 text-muted">
              <span role="timer" aria-label="Time presenting" className="text-[1.05rem] font-bold text-ink tabular-nums">
                {clock(elapsed)}
              </span>
              <button type="button" aria-label="Start the clock over" onClick={() => setElapsed(0)} className="grid size-7 cursor-pointer place-items-center rounded-md hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-brand [&>svg]:size-4">
                <RotateCcw aria-hidden />
              </button>
            </span>
          </div>
        </aside>
      ) : null}
    </>
  )
}
