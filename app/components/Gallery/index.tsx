'use client'

/* eslint-disable @next/next/no-img-element -- images can come from anywhere, at any size, so next/image's domain and size config doesn't fit */
import { Expand, X } from 'lucide-react'
import { useEffect, useRef, useState, type FC } from 'react'

import { cn } from '@/lib/cn'

import { Carousel } from '../Carousel'
import type { GalleryProps } from './types'

/**
 * A gallery of images; pressing one opens it full screen in a viewer with the rest, moved
 * through with swipes, arrows, the arrow keys, or thumbnails. Escape (or the close button)
 * shuts the viewer and returns to the image that opened it.
 *
 *   <Gallery aria-label="Fall social photos" images={[{ src: '/photos/1.jpg', alt: 'Students at the welcome table' }]} />
 *   <Gallery layout="masonry" aria-label="Posters" images={posters} />
 *
 * "grid" crops every image to an even square. "masonry" keeps each image's shape in
 * columns (CSS columns), so images read, and Tab moves, down one column and then the next.
 * Give masonry images a `width` and `height` so their space is held while they load.
 */
export const Gallery: FC<GalleryProps> = ({ images, 'aria-label': ariaLabel, layout = 'grid', minColumnWidth, className }) => {
  const masonry = layout === 'masonry'
  const columnWidth = minColumnWidth ?? (masonry ? '14rem' : '10rem')
  const [viewing, setViewing] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (viewing !== null && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    } else if (viewing === null && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [viewing])

  return (
    <>
      <ul
        aria-label={ariaLabel}
        className={cn('m-0 list-none p-0', masonry ? 'gap-2' : 'grid gap-2', className)}
        style={
          masonry
            ? // As many columns as fit at this width (one, full width, on a narrow screen); images
              // flow down each in turn. column-width takes no percentages, so no min(100%, …) here.
              { columnWidth }
            : { gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${columnWidth}), 1fr))` }
        }
      >
        {images.map((image, i) => (
          <li key={image.src + i} className={masonry ? 'mb-2 break-inside-avoid' : undefined}>
            <button
              type="button"
              onClick={() => setViewing(i)}
              aria-label={`View larger: ${image.alt}`}
              // Masonry keeps the image's own shape, held by its size until it loads
              style={masonry && image.width && image.height ? { aspectRatio: `${image.width} / ${image.height}` } : undefined}
              className={cn(
                'group relative block w-full cursor-zoom-in overflow-hidden rounded-xl bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                !masonry && 'aspect-square'
              )}
            >
              <img
                src={image.thumbnail ?? image.src}
                alt=""
                width={image.width}
                height={image.height}
                loading="lazy"
                decoding="async"
                className={cn('w-full transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none', masonry ? 'h-auto' : 'h-full object-cover')}
              />
              <span aria-hidden className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Expand size={15} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={ariaLabel}
        onCancel={(e) => {
          e.preventDefault()
          setViewing(null)
        }}
        onClose={() => setViewing(null)}
        // Arrow keys anywhere in the viewer (focus starts on its close button, outside the
        // carousel); inside the carousel, it handles them itself
        onKeyDown={(e) => {
          if (viewing === null || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
          if ((e.target as Element).closest('[aria-roledescription="carousel"]')) return
          e.preventDefault()
          setViewing(Math.min(images.length - 1, Math.max(0, viewing + (e.key === 'ArrowRight' ? 1 : -1))))
        }}
        className="m-auto h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-black/90"
      >
        {viewing !== null ? (
          <div className="flex h-full flex-col gap-3 px-3 pt-3 pb-4 sm:px-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close viewer"
                className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <Carousel
              aria-label={ariaLabel}
              index={viewing}
              onIndexChange={setViewing}
              thumbnails
              className="min-h-0 flex-1 **:aria-[current]:border-white"
              viewportClassName="h-[calc(100dvh-11rem)]"
              slides={images.map((image) => ({
                label: image.alt,
                thumbnail: image.thumbnail ?? image.src,
                content: (
                  <figure className="m-0 flex h-full flex-col items-center justify-center gap-2">
                    <img src={image.src} alt={image.alt} className="max-h-full min-h-0 max-w-full rounded-lg object-contain" />
                    {image.caption ? <figcaption className="text-center text-[0.9rem] text-white/85">{image.caption}</figcaption> : null}
                  </figure>
                ),
              }))}
            />
          </div>
        ) : null}
      </dialog>
    </>
  )
}
