import type { ReactNode } from 'react'

import type { ControlSize, Option, OptionGroup } from '../types'

export type SelectType =
    | "combobox"
    | "dropdown"
    | "tags" // Allows multiple tags to be selected

export type SelectMode =
    | "single"
    | "multiple"

/** Options, optionally grouped under headings */
export type SelectItems = readonly (Option | OptionGroup)[]

interface BaseSelectProps {
  options: SelectItems
  placeholder?: string
  /** Sent with the form: one hidden input per selected value */
  name?: string
  size?: ControlSize
  id?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  className?: string
  /** Shown when a search matches nothing. Default "No matches". */
  emptyText?: ReactNode
  /** Accessible name when the Select isn't inside a Field */
  'aria-label'?: string
  'aria-describedby'?: string
}

interface SingleValue {
  mode?: 'single'
  /** `null` is "controlled, nothing picked"; leave out for uncontrolled */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
}

interface MultipleValue {
  mode: 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

/**
 * "dropdown" picks from a list; "combobox" adds a search box; "tags" is a search box that
 * collects several picks as removable tags (always multiple).
 */
export type SelectProps = BaseSelectProps &
  (
    | ({ type?: 'dropdown' | 'combobox' } & SingleValue)
    | ({ type?: 'dropdown' | 'combobox' } & MultipleValue)
    | ({ type: 'tags' } & Omit<MultipleValue, 'mode'> & { mode?: 'multiple' })
  )

export interface SelectContextValue {
  optionId: (value: string) => string
  activeValue: string | null
  setActiveValue: (value: string) => void
  isSelected: (value: string) => boolean
  toggle: (value: string) => void
}
