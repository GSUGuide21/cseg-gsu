/* eslint-disable @next/next/no-img-element -- images can be from any site, at any size */
import Link from 'next/link'
import type { CSSProperties, FC, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { safeHref, safeSrc } from '@/lib/safeUrl'

/**
 * A picture in a post or page: an https image (uploaded to the club's storage, or from
 * another site), its description for people who can't see it, and an optional caption. It
 * can be smaller than the column, sit to one side with the text wrapping around it, and
 * be a link.
 */

export const IMAGE_SIZES = {
  full: { label: 'Full width', width: 'w-full' },
  large: { label: 'Large', width: 'w-full sm:w-3/4' },
  medium: { label: 'Medium', width: 'w-full sm:w-1/2' },
  small: { label: 'Small', width: 'w-2/3 sm:w-1/3' },
} as const
export type ImageSize = keyof typeof IMAGE_SIZES

export const IMAGE_ALIGNS = {
  center: { label: 'Centered' },
  left: { label: 'Left, text beside it' },
  right: { label: 'Right, text beside it' },
} as const
export type ImageAlign = keyof typeof IMAGE_ALIGNS

export interface ImageData {
  src: string
  alt: string
  caption: string
  /** How wide it is in the column. Left out: full width. */
  size?: ImageSize
  /** Where it sits. Left out: centered. */
  align?: ImageAlign
  /** Where a click on it goes. Left out or "": nowhere. */
  href?: string
  /** A width of its own, in percent of the column (dragged, or set in its dialog); left out, its size's */
  width?: number
}

export const IMAGE_ALT_MAX = 250
export const IMAGE_CAPTION_MAX = 300

const words = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** A saved image's address, if it's a safe one */
export const parseSrc = (value: unknown) => (typeof value === 'string' ? (safeSrc(value) ?? '') : '')
export const parseAlt = (value: unknown) => words(value, IMAGE_ALT_MAX)
export const parseCaption = (value: unknown) => words(value, IMAGE_CAPTION_MAX)
export const parseImageSize = (value: unknown): ImageSize => (typeof value === 'string' && Object.hasOwn(IMAGE_SIZES, value) ? (value as ImageSize) : 'full')
export const parseImageAlign = (value: unknown): ImageAlign => (typeof value === 'string' && Object.hasOwn(IMAGE_ALIGNS, value) ? (value as ImageAlign) : 'center')
export const IMAGE_WIDTH = { min: 10, max: 100, step: 5 } as const

/** A saved width, to the step, between the least and the column's; 0 for none */
export const parseImageWidth = (value: unknown) => {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(IMAGE_WIDTH.max, Math.max(IMAGE_WIDTH.min, Math.round(n / IMAGE_WIDTH.step) * IMAGE_WIDTH.step))
}

/** Where a click on the image goes, if it's a safe link */
export const parseImageHref = (value: unknown) => (typeof value === 'string' ? (safeHref(value) ?? '') : '')

/**
 * Where the figure sits. To one side, a full-width image has nothing beside it, so it reads
 * as medium. With `wrap` (on the site) the text flows around it from tablet width up; in the
 * editor it only sits to that side, since blocks there are each a line of their own.
 */
const placement = (size: ImageSize, align: ImageAlign, wrap: boolean, custom: boolean) => {
  // A width of its own is set from tablet width up; on a phone the image takes the column
  const own = 'w-full sm:w-(--image-width)'
  if (align === 'center') return cn('mx-auto', custom ? own : IMAGE_SIZES[size].width)
  const width = custom ? own : IMAGE_SIZES[size === 'full' ? 'medium' : size].width
  if (!wrap) return cn(width, align === 'left' ? 'mr-auto' : 'ml-auto')
  return cn(width, 'mx-auto', align === 'left' ? 'sm:float-left sm:mr-6 sm:mb-3 sm:ml-0' : 'sm:float-right sm:mb-3 sm:ml-6 sm:mr-0', 'sm:mt-1.5')
}

export const Figure: FC<ImageData & { className?: string; /** In the editor: where it sits, without text wrapping or the link working */ preview?: boolean; /** Drawn over the image (the editor's resize handle) */ overlay?: ReactNode }> = ({
  src,
  alt,
  caption,
  size = 'full',
  align = 'center',
  href = '',
  width = 0,
  className,
  preview = false,
  overlay,
}) => {
  const own = parseImageWidth(width)
  const img = <img src={src} alt={alt} loading="lazy" decoding="async" className="mx-auto block h-auto max-w-full rounded-xl border border-line" />
  const link = preview ? null : safeHref(href)
  let picture: ReactNode = img
  if (link)
    picture = link.startsWith('/') ? (
      <Link href={link} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
        {img}
      </Link>
    ) : (
      <a href={link} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" {...(/^https?:/.test(link) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {img}
      </a>
    )
  return (
    <figure className={cn('my-5', placement(size, align, !preview, !!own), overlay && 'relative', className)} style={own ? ({ '--image-width': `${own}%` } as CSSProperties) : undefined}>
      {picture}
      {overlay}
      {caption ? <figcaption className="mt-2 text-center text-[0.85rem] leading-snug text-muted">{caption}</figcaption> : null}
    </figure>
  )
}
