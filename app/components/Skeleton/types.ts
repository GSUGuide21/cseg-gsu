import type { CSSProperties } from 'react'

export interface SkeletonProps {
  /** "text" is a line (or `lines` of them), "rect" a block, "circle" an avatar. Default "rect". */
  shape?: 'text' | 'rect' | 'circle'
  /** For text: how many lines; the last one is shorter, like a paragraph's */
  lines?: number
  /** Any CSS length, or a number of pixels */
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  className?: string
}
