/* eslint-disable @next/next/no-img-element -- images can be from any site, at any size */
import type { FC } from 'react'

import { Gallery } from '@/components/Gallery'

import { parseAlt, parseCaption, parseSrc } from './image'
import { listOf } from './inline'

/**
 * Several photos together: an event's pictures, say. On the site each opens larger, with
 * arrows to the next; in the editor it's a still grid, so a click selects the block.
 */

export interface GalleryPhoto {
  src: string
  /** What it shows, for people who can't see it */
  alt: string
  caption: string
}

export const GALLERY_LAYOUTS = {
  grid: { label: 'Even squares', hint: 'Every photo cropped to a square.' },
  masonry: { label: 'Each its own shape', hint: 'Nothing cropped; photos stack in columns.' },
} as const
export type GalleryBlockLayout = keyof typeof GALLERY_LAYOUTS

export const GALLERY_MAX = 30

export const parseGalleryPhotos = (value: unknown): GalleryPhoto[] => {
  const seen = new Set<string>()
  return listOf(value, GALLERY_MAX, (raw) => {
    const src = parseSrc(raw.src)
    // The same photo twice is once
    if (!src || seen.has(src)) return null
    seen.add(src)
    return { src, alt: parseAlt(raw.alt), caption: parseCaption(raw.caption) }
  })
}
export const parseGalleryLayout = (value: unknown): GalleryBlockLayout => (value === 'masonry' ? 'masonry' : 'grid')

export const galleryText = (photos: readonly GalleryPhoto[]) =>
  photos
    .map((p) => p.caption)
    .filter(Boolean)
    .join('\n')

export const PhotoGallery: FC<{ photos: readonly GalleryPhoto[]; layout: GalleryBlockLayout; preview?: boolean }> = ({ photos, layout, preview = false }) =>
  preview ? (
    <ul className="my-5 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,7rem),1fr))] gap-2 p-0">
      {photos.map((p) => (
        <li key={p.src}>
          <img src={p.src} alt={p.alt} loading="lazy" className={layout === 'grid' ? 'aspect-square w-full rounded-lg border border-line object-cover' : 'h-auto w-full rounded-lg border border-line'} />
        </li>
      ))}
    </ul>
  ) : (
    <Gallery
      aria-label={photos.length === 1 ? 'Photo' : `${photos.length} photos`}
      layout={layout}
      className="my-5"
      // A photo with no description is still a photo to open: say which one it is
      images={photos.map((p, i) => ({ src: p.src, alt: p.alt || `Photo ${i + 1} of ${photos.length}`, caption: p.caption || undefined }))}
    />
  )
