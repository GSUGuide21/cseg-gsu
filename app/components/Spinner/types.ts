export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps {
  /** 16, 24, or 36 px, or any pixel size. Default "md". */
  size?: SpinnerSize | number
  /** What's loading, for screen readers. Default "Loading". */
  label?: string
  /**
   * Hide it from screen readers, when something nearby already says it's busy (a loading
   * Button sets aria-busy itself). Default false.
   */
  decorative?: boolean
  className?: string
}
