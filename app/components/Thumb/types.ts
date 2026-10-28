export interface ThumbProps {
  /** The image to show, ideally a small file */
  src: string
  /**
   * Describes the image, when it isn't already described nearby. Usually leave empty:
   * `label` already names the button, and saying the image twice is noise.
   */
  alt?: string
  /** What pressing it does, for screen readers: "Go to slide 3: Fall social" */
  label: string
  /** The one being shown */
  active?: boolean
  onClick?: () => void
  /** Width in px; the height follows `aspect`. Default 80. */
  size?: number
  /** Width to height, e.g. "16 / 9" (default) or "1 / 1" */
  aspect?: string
  className?: string
}
