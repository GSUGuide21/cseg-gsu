/** Control heights shared by every text-like form control */
export type ControlSize = 'sm' | 'md' | 'lg'

/** One choice in a Select, RadioGroup, or CheckboxGroup built from data */
export interface Option<V extends string = string> {
  readonly value: V
  readonly label: string
  /** Second line under the label */
  readonly description?: string
  readonly disabled?: boolean
}

/** Options shown together under a heading */
export interface OptionGroup<V extends string = string> {
  readonly label: string
  readonly options: readonly Option<V>[]
}

/** How a group's choices are laid out */
export type Orientation = 'vertical' | 'horizontal'
