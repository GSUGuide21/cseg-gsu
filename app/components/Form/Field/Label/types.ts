import type { ComponentProps } from 'react'

/**
 * Where a field's label sits: above the control ("normal"), beside it on wider screens
 * ("inline"), or inside it, moving up once there's a value or focus ("floating"). Floating
 * labels suit text-like controls (Input, TextArea, Number) without a leading icon.
 */
export type LabelType =
    | "normal"
    | "inline"
    | "floating"

export interface LabelProps extends ComponentProps<'label'> {
  /** Adds an asterisk; the control itself carries `required` for screen readers */
  required?: boolean
  /** Positioned inside the control (see LabelType) */
  floating?: boolean
}
