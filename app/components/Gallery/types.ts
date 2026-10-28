export interface GalleryImage {
  src: string
  /** What the image shows (required: it's the image's only description) */
  alt: string
  caption?: string
  /** A smaller file for the grid and thumbnails; defaults to `src` */
  thumbnail?: string
  /**
   * The image's size in px (any units work, only the ratio matters). In a masonry gallery
   * it reserves the image's space before it loads, so the columns don't jump.
   */
  width?: number
  height?: number
}

/**
 * "grid": even square tiles, cropped to fit (default).
 * "masonry": each image at its own shape, stacked in columns, like a pinboard.
 */
export type GalleryLayout = 'grid' | 'masonry'

export interface GalleryProps {
  images: readonly GalleryImage[]
  /** What the gallery is, e.g. "Fall social photos" */
  'aria-label': string
  layout?: GalleryLayout
  /** Narrowest a column gets; there are as many columns as fit. Default "10rem" (grid), "14rem" (masonry). */
  minColumnWidth?: string
  className?: string
}
