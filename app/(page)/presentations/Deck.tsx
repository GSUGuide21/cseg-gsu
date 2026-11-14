'use client'

import { ChevronLeft, ChevronRight, LayoutGrid, Maximize, Minimize } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FC, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

const control =
  'grid size-9 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-fill hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-brand-tint aria-pressed:text-brand [&>svg]:size-5'

/** The size a slide is laid out for; full screen, it's scaled up from this to fill the screen */
const STAGE = { width: 1100, height: 620 }
/** How far a finger has to travel sideways to turn the slide */
const SWIPE = 50

const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/**
 * Plays a slide deck: one slide at a time in a 16:9 frame, with Previous and Next, the slide
 * number, how far through it is, every slide at a glance (to jump to one), and a full-screen
 * button. The arrow keys, Page Up/Down, Home, and End move between slides (Space too, full
 * screen), as does a swipe; F goes full screen, and G shows all the slides. The address keeps
 * the slide's number (#3), so a link can open on a slide.
 *
 * Each slide's writing is drawn by the page and handed in (`bodies`, in the slides' order);
 * this only decides which one shows.
 */
export const Deck: FC<{ slides: readonly { id: string; title: string }[]; bodies: readonly ReactNode[] }> = ({ slides, bodies }) => {
  const count = slides.length
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [overview, setOverview] = useState(false)
  const [zoom, setZoom] = useState(1)
  const stage = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const go = useCallback((to: number) => setIndex(Math.min(Math.max(to, 0), count - 1)), [count])

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
      const step = e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && full && !e.shiftKey) ? 1 : e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && full && e.shiftKey) ? -1 : 0
      if (step) setIndex((i) => Math.min(Math.max(i + step, 0), count - 1))
      else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(count - 1)
      else if (e.key.toLowerCase() === 'f') toggleFullscreen()
      else if (e.key.toLowerCase() === 'g') setOverview((o) => !o)
      else if (e.key === 'Escape' && !full) setOverview(false)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, go, toggleFullscreen])

  if (!count) return <p className="m-0 text-muted">This presentation has no slides yet.</p>

  return (
    <div
      ref={stage}
      role="region"
      aria-roledescription="slide deck"
      aria-label="Slides"
      className={cn('flex flex-col bg-surface', fullscreen ? 'h-screen w-screen' : 'overflow-hidden rounded-2xl border border-line shadow-card')}
    >
      <div
        className={cn('relative min-h-0', fullscreen ? 'flex-1' : 'aspect-video max-sm:aspect-[4/5]')}
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
          if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1))
        }}
      >
        {slides.map((s, i) => (
          <section
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${i + 1} of ${count}${s.title ? `: ${s.title}` : ''}`}
            hidden={i !== index || overview}
            className="absolute inset-0 overflow-y-auto"
          >
            <div style={fullscreen ? { zoom } : undefined} className="mx-auto flex min-h-full max-w-4xl flex-col justify-center gap-4 p-[clamp(1.25rem,4vw,3rem)]">
              {s.title ? <h2 className="m-0 text-[clamp(1.5rem,3.5vw,2.4rem)] leading-tight font-extrabold tracking-tight text-balance text-ink">{s.title}</h2> : null}
              {bodies[i]}
            </div>
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
      </div>
      {/* How far through it is */}
      <div aria-hidden className="h-1 bg-fill">
        <div className="h-full bg-brand transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${((index + 1) / count) * 100}%` }} />
      </div>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button type="button" aria-label="Previous slide" disabled={index === 0} onClick={() => go(index - 1)} className={control}>
          <ChevronLeft aria-hidden />
        </button>
        <span aria-live="polite" className="min-w-16 text-center text-[0.85rem] text-muted tabular-nums">
          {index + 1} / {count}
        </span>
        <button type="button" aria-label="Next slide" disabled={index === count - 1} onClick={() => go(index + 1)} className={control}>
          <ChevronRight aria-hidden />
        </button>
        <span className="ml-2 truncate text-[0.85rem] text-muted max-sm:hidden">{slides[index].title}</span>
        <button type="button" aria-label="All slides" aria-pressed={overview} onClick={() => setOverview((o) => !o)} className={cn(control, 'ml-auto')}>
          <LayoutGrid aria-hidden />
        </button>
        <button type="button" aria-label={fullscreen ? 'Leave full screen' : 'Present full screen'} onClick={toggleFullscreen} className={control}>
          {fullscreen ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
        </button>
      </div>
    </div>
  )
}
