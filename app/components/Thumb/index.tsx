/* eslint-disable @next/next/no-img-element -- thumbnails can come from anywhere, at any size, so next/image's domain and size config doesn't fit */
import type { FC } from 'react'

import { cn } from '@/lib/cn'

import type { ThumbProps } from './types'

/**
 * An image thumbnail button, for picking a slide or photo from a strip (Carousel's
 * thumbnails, Gallery's viewer). The image fills it, cropped to `aspect`; the active one is
 * outlined, and the rest are dimmed until hovered. Loads lazily, so a long strip stays light.
 *
 *   <Thumb src="/photos/1-small.jpg" label="Go to slide 1: Welcome table" active />
 */
export const Thumb: FC<ThumbProps> = ({ src, alt = '', label, active = false, onClick, size = 80, aspect = '16 / 9', className }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-current={active || undefined}
    style={{ width: size, aspectRatio: aspect }}
    className={cn(
      'relative shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 bg-fill transition-[opacity,border-color]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
      active ? 'border-brand opacity-100' : 'border-transparent opacity-60 hover:opacity-100',
      className
    )}
  >
    <img src={src} alt={alt} loading="lazy" decoding="async" draggable={false} className="size-full object-cover" />
  </button>
)
