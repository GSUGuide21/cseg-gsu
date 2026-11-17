'use client'
/* eslint-disable @next/next/no-img-element -- officers' pictures come from Storage or anywhere, at any size */

import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore, type FC } from 'react'

import { cn } from '@/lib/cn'
import type { HeroMedia as Media } from '@/lib/homepage'

const REDUCE = '(prefers-reduced-motion: reduce)'
/** The browser's answer to "less motion?", or none where it can't say (as if it had asked for less) */
const motionQuery = () => (typeof window.matchMedia === 'function' ? window.matchMedia(REDUCE) : null)
/** Whether the visitor asked for less motion; on the server, as if they had (nothing starts before it's known) */
const useReducedMotion = () =>
  useSyncExternalStore(
    (onChange) => {
      const query = motionQuery()
      query?.addEventListener('change', onChange)
      return () => query?.removeEventListener('change', onChange)
    },
    () => motionQuery()?.matches ?? true,
    () => true
  )

/** The pause and play button in the hero's corner, for anything that moves */
const Toggle: FC<{ playing: boolean; onToggle: () => void; what: string }> = ({ playing, onToggle, what }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={playing ? `Pause the ${what}` : `Play the ${what}`}
    className="grid size-10 cursor-pointer place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-colors hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
  >
    {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
  </button>
)

/** A video behind the words: muted and looping, not started when the visitor asked for less motion, and pausable */
const Video: FC<{ src: string; poster: string }> = ({ src, poster }) => {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLVideoElement>(null)
  const [chosen, setChosen] = useState<boolean | null>(null)
  const playing = chosen ?? !reduced
  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (playing) video.play().catch(() => setChosen(false))
    else video.pause()
  }, [playing])
  return (
    <>
      <video ref={ref} src={src} poster={poster || undefined} muted loop playsInline preload={reduced ? 'none' : 'auto'} aria-hidden className="absolute inset-0 size-full object-cover" />
      <div className="absolute right-4 bottom-4 z-10">
        <Toggle playing={playing} onToggle={() => setChosen(!playing)} what="video" />
      </div>
    </>
  )
}

/** Pictures in turn, fading one into the next; still when the visitor asked for less motion, and pausable, with a dot to go to each */
const Slideshow: FC<{ slides: Media['slides']; interval: number }> = ({ slides, interval }) => {
  const reduced = useReducedMotion()
  const [at, setAt] = useState(0)
  const [chosen, setChosen] = useState<boolean | null>(null)
  const playing = (chosen ?? !reduced) && slides.length > 1
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setAt((i) => (i + 1) % slides.length), interval * 1000)
    return () => window.clearInterval(timer)
  }, [playing, interval, slides.length])
  const shown = at % Math.max(1, slides.length)
  return (
    <>
      {slides.map((s, i) => (
        <img
          key={i}
          src={s.src}
          alt={i === shown ? s.alt : ''}
          aria-hidden={i !== shown || !s.alt || undefined}
          loading={i === 0 ? 'eager' : 'lazy'}
          className={cn('absolute inset-0 size-full object-cover transition-opacity duration-1000 motion-reduce:transition-none', i === shown ? 'opacity-100' : 'opacity-0')}
        />
      ))}
      <div className="absolute right-4 bottom-4 z-10 flex items-center gap-3">
        <div role="group" aria-label="Pictures" className="flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-2 backdrop-blur">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Picture ${i + 1} of ${slides.length}`}
              aria-current={i === shown || undefined}
              onClick={() => {
                setAt(i)
                setChosen(false)
              }}
              className={cn('size-2 cursor-pointer rounded-full transition-[background-color,width]', i === shown ? 'w-5 bg-white' : 'bg-white/50 hover:bg-white/80')}
            />
          ))}
        </div>
        <Toggle playing={playing} onToggle={() => setChosen(!playing)} what="slideshow" />
      </div>
    </>
  )
}

/**
 * What's behind the hero's words, filling it: a picture, a video, or a slideshow, under a dark
 * wash so white words read on any of them. Nothing for "none".
 */
export const HeroMedia: FC<{ media: Media }> = ({ media }) => {
  if (media.kind === 'none') return null
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-[#0b1530]">
      {media.kind === 'image' && media.image.src ? (
        <img src={media.image.src} alt={media.image.alt} aria-hidden={!media.image.alt || undefined} className="absolute inset-0 size-full object-cover" />
      ) : media.kind === 'video' && media.video.src ? (
        <Video src={media.video.src} poster={media.video.poster} />
      ) : media.kind === 'slideshow' && media.slides.length ? (
        <Slideshow slides={media.slides} interval={media.interval} />
      ) : null}
      {/* Darker toward the words' middle and the bottom, so they read on a bright picture */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(0_0_0/0.55),rgb(0_0_0/0.35)_70%),linear-gradient(to_bottom,rgb(0_0_0/0.15),rgb(0_0_0/0.5))]" />
    </div>
  )
}
