export interface RatingProps {
  /** 0 is "not rated"; leave out for uncontrolled */
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** How many stars. Default 5. */
  max?: number
  /** A word for each value, shown beside the stars: ["Poor", "Fair", "Good", "Great", "Loved it"] */
  labels?: string[]
  /** Shows a rating without taking one, with halves (4.5 of 5); read as "4.5 out of 5 stars" */
  readOnly?: boolean
  /** Picking the current rating again clears it. Default true. */
  clearable?: boolean
  size?: 'sm' | 'md' | 'lg'
  name?: string
  disabled?: boolean
  /** Names it when it isn't in a Field. Default "Rating". */
  'aria-label'?: string
  className?: string
}
