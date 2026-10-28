/* eslint-disable @next/next/no-img-element -- images can be from any site, at any size */
import type { FC } from 'react'

import { cn } from '@/lib/cn'
import { safeSrc } from '@/lib/safeUrl'

/**
 * A picture in a post or page: an https image (uploaded to the club's storage, or from
 * another site), its description for people who can't see it, and an optional caption.
 */

export interface ImageData {
  src: string
  alt: string
  caption: string
}

export const IMAGE_ALT_MAX = 250
export const IMAGE_CAPTION_MAX = 300

const words = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** A saved image's address, if it's a safe one */
export const parseSrc = (value: unknown) => (typeof value === 'string' ? (safeSrc(value) ?? '') : '')
export const parseAlt = (value: unknown) => words(value, IMAGE_ALT_MAX)
export const parseCaption = (value: unknown) => words(value, IMAGE_CAPTION_MAX)

export const Figure: FC<ImageData & { className?: string }> = ({ src, alt, caption, className }) => (
  <figure className={cn('my-5', className)}>
    <img src={src} alt={alt} loading="lazy" decoding="async" className="mx-auto block h-auto max-w-full rounded-xl border border-line" />
    {caption ? <figcaption className="mt-2 text-center text-[0.85rem] leading-snug text-muted">{caption}</figcaption> : null}
  </figure>
)
