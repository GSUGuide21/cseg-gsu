'use client'

/* eslint-disable @next/next/no-img-element -- profile photos come from sign-in providers' domains, at any size */
import { useEffect, useRef, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { IndicatorBadge } from '../Badge'
import type { Tone } from '../tones'
import type { AvatarGroupProps, AvatarProps, AvatarSize, AvatarStatus } from './types'

const SIZES: Record<AvatarSize, { box: string; px: number }> = {
  xs: { box: 'size-6 text-[0.6rem]', px: 24 },
  sm: { box: 'size-8 text-[0.72rem]', px: 32 },
  md: { box: 'size-10 text-[0.85rem]', px: 40 },
  lg: { box: 'size-12 text-[1rem]', px: 48 },
  xl: { box: 'size-16 text-[1.3rem]', px: 64 },
}

/** Initials sit on a tint of one of the chart hues, picked from the name, so a person keeps their color */
const TINTS = [
  'bg-series-1/18',
  'bg-series-2/18',
  'bg-series-3/18',
  'bg-series-4/20',
  'bg-series-5/20',
  'bg-series-6/15',
  'bg-series-7/18',
  'bg-series-8/18',
]

const STATUS: Record<AvatarStatus, { tone: Tone; word: string }> = {
  online: { tone: 'success', word: 'Online' },
  away: { tone: 'warning', word: 'Away' },
  busy: { tone: 'danger', word: 'Busy' },
  offline: { tone: 'neutral', word: 'Offline' },
}

/** "Jordan Lee" → "JL", "cher" → "C" */
export const initials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/**
 * A person's photo, or their initials when there isn't one.
 *
 *   <Avatar name="Jordan Lee" src={user.image} />
 *   <Avatar name="Sam Kim" size="sm" status="online" />
 */
export const Avatar: FC<AvatarProps> = ({ name, src, size = 'md', shape = 'circle', status, decorative = false, className }) => {
  // The src that failed, so a new src gets its own try
  const [failed, setFailed] = useState<string | null>(null)
  const photo = src && failed !== src ? src : null
  // A photo that failed while the page was still server-rendered fired its error before
  // React was listening; catch that once it's mounted
  const imgRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const img = imgRef.current
    if (photo && img?.complete && img.naturalWidth === 0) setFailed(photo)
  }, [photo])
  const round = shape === 'circle' ? 'rounded-full' : 'rounded-lg'

  const face = (
    <span
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      title={decorative ? undefined : name}
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden font-bold text-ink select-none',
        SIZES[size].box,
        round,
        !photo && TINTS[hash(name) % TINTS.length],
        className
      )}
    >
      {photo ? (
        <img
          ref={imgRef}
          src={photo}
          alt=""
          width={SIZES[size].px}
          height={SIZES[size].px}
          referrerPolicy="no-referrer"
          onError={() => setFailed(photo)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  )

  if (!status) return face
  return (
    <IndicatorBadge dot tone={STATUS[status].tone} label={STATUS[status].word} overlap={shape === 'circle' ? 'circle' : 'rect'} placement="bottom-end">
      {face}
    </IndicatorBadge>
  )
}

/**
 * Overlapping avatars, then "+N" for the rest.
 *
 *   <AvatarGroup aria-label="Going" people={rsvps} max={5} />
 */
export const AvatarGroup: FC<AvatarGroupProps> = ({ people, max = 4, size = 'sm', 'aria-label': ariaLabel, className }) => {
  const shown = people.length > max ? people.slice(0, max - 1) : people
  const rest = people.length - shown.length
  return (
    <ul aria-label={ariaLabel} className={cn('m-0 flex list-none items-center p-0', className)}>
      {shown.map((p, i) => (
        <li key={p.name + i} className={cn('rounded-full ring-2 ring-surface', i > 0 && '-ml-2')}>
          <Avatar name={p.name} src={p.src} size={size} />
        </li>
      ))}
      {rest > 0 ? (
        <li className="-ml-2 rounded-full ring-2 ring-surface">
          <span
            title={people
              .slice(shown.length)
              .map((p) => p.name)
              .join(', ')}
            className={cn('inline-grid place-items-center rounded-full bg-fill font-bold text-ink-soft', SIZES[size].box)}
          >
            <span aria-hidden>+{rest}</span>
            <span className="sr-only">and {rest} more</span>
          </span>
        </li>
      ) : null}
    </ul>
  )
}
