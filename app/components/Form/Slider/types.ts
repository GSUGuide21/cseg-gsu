import type { CSSProperties } from 'react'

export type SliderType =
    | 'vertical'
    | 'horizontal'

export interface BaseSliderProps {
    min?: number
    max?: number
    step?: number
}

/** A tick on the track, optionally labeled */
export type SliderMark = number | { readonly value: number; readonly label?: string }

interface SharedSliderProps extends BaseSliderProps {
  /** Direction of the track. Default "horizontal". */
  type?: SliderType
  /** Shows the current value beside the track. Default true. */
  showValue?: boolean
  /** Shows the value above a thumb while it's hovered, focused, or dragged */
  tooltip?: boolean
  /** How a value reads, e.g. (v) => `${v}%`; also what screen readers hear */
  formatValue?: (value: number) => string
  /**
   * Ticks along the track: values, or values with labels. A label can be clicked to jump
   * there, and is what screen readers hear at that value when there's no formatValue.
   */
  marks?: readonly SliderMark[]
  /** Stop only at the marks, not every step between: for scales like Free / $5 / $10 / $20 */
  snapToMarks?: boolean
  name?: string
  id?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
  /** Accessible name when the slider isn't inside a Field */
  'aria-label'?: string
  'aria-describedby'?: string
}

export interface SliderProps extends SharedSliderProps {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
}

export interface RangeSliderProps extends SharedSliderProps {
  value?: readonly [number, number]
  defaultValue?: readonly [number, number]
  onValueChange?: (value: [number, number]) => void
  /** Smallest gap allowed between the two thumbs. Default 0. */
  minDistance?: number
  /** What each thumb is called for screen readers. Default ["Minimum", "Maximum"]. */
  thumbLabels?: readonly [string, string]
}

/** The engine under Slider, RangeSlider, and the color picker's hue bar */
export interface SliderTrackProps extends BaseSliderProps {
  values: readonly number[]
  onValuesChange: (values: number[]) => void
  type?: SliderType
  minDistance?: number
  formatValue?: (value: number) => string
  /** Each thumb's own name, read after the slider's label */
  thumbLabels?: readonly (string | undefined)[]
  /** Id of the label naming the whole slider (a Field's label) */
  labelledBy?: string
  describedBy?: string
  /** Id for the first thumb, so a Field label can point at it */
  id?: string
  disabled?: boolean
  invalid?: boolean
  marks?: readonly SliderMark[]
  snapToMarks?: boolean
  tooltip?: boolean
  /** Fill the track between the start (or the lower thumb) and the thumb. Default true. */
  fill?: boolean
  /** Paint the track yourself, e.g. the hue rainbow */
  trackStyle?: CSSProperties
  className?: string
}
