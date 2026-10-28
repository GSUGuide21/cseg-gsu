import type { ControlSize } from '../types'
import type { HSV } from './color'

export type Swatch = string | { readonly color: string; readonly name: string }

export interface ColorPickerProps {
  /**
   * Any color parseColorWithAlpha reads (hex, rgb(), hsl(), a CSS name). Reported back as
   * "#rrggbb", or "#rrggbbaa" (always 8 digits) with `alpha`. Leave out for uncontrolled.
   */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /**
   * Lets the color be see-through: adds an opacity bar and an Alpha field, keeps the alpha
   * of colors typed or pasted, and reports "#rrggbbaa". Default false.
   */
  alpha?: boolean
  /**
   * Quick picks under the square: colors, or colors with names, which screen readers
   * announce and hovering shows ({ color: '#0039a6', name: 'GSU blue' }). Default: GSU blue
   * and a few site colors. Picking one keeps the current opacity.
   */
  swatches?: readonly Swatch[]
  /** Sent with the form as the value */
  name?: string
  size?: ControlSize
  id?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
}

export interface ColorPickerContextValue {
  hsv: HSV
  /** The color without its opacity, "#rrggbb" */
  hex: string
  /** 0–1, or null when the picker has no alpha */
  alpha: number | null
  setHsv: (next: HSV) => void
  /** Takes any color the picker reads; its alpha counts only when alpha is on. Returns whether it could read it. */
  setHex: (color: string) => boolean
  /** Changes the color but keeps the opacity (presets, channel fields, the eyedropper) */
  setSolid: (hex: string) => void
  setAlpha: (alpha: number) => void
}

export interface ColorPanelProps {
  /** As ColorPicker's; leave out for uncontrolled */
  value?: string
  defaultValue?: string
  /** Called as the color changes, while dragging too */
  onValueChange?: (value: string) => void
  /** Adds the opacity bar and reports "#rrggbbaa" */
  alpha?: boolean
  swatches?: readonly Swatch[]
  /** "narrow" (default) has Pick and Details tabs; "wide" shows everything at once */
  layout?: 'narrow' | 'wide'
  className?: string
}
