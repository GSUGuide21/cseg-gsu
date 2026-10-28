import React, {
  type Dispatch,
  type SetStateAction,
  type ReactNode
} from 'react'

export interface SwitchContextType {
  activeLabel: ReactNode
  inactiveLabel: ReactNode
  name: string
  checked: boolean
  setChecked: Dispatch<SetStateAction<boolean>>
  focused: boolean
  setFocused: Dispatch<SetStateAction<boolean>>
  dirty: boolean
  setDirty: Dispatch<SetStateAction<boolean>>
  disabled: boolean
  showLabels: boolean
  handleChange: (value: boolean) => void
  handleFocus: () => void
  handleBlur: () => void
  handleKeyDown: (event: React.KeyboardEvent) => void
}

export interface SwitchProviderProps {
  name: string // default: ''
  activeLabel?: ReactNode // default: 'On'
  inactiveLabel?: ReactNode // default: 'Off'
  checked?: boolean // default: false
  disabled?: boolean // default: false
  showLabels?: boolean // default: true
  onChange?: (value: boolean) => void
  onInput?: (value: boolean) => void
  onFocus?: (value: boolean) => void
  onBlur?: (value: boolean) => void
  onKeyDown?: (value: boolean) => void
  children?: ReactNode
}

export type SwitchProps = SwitchProviderProps & React.HTMLAttributes<HTMLElement> & {
  label?: ReactNode // default: ''
  error?: string // default: ''
  helperText?: string // default: ''
}

export type SwitchContainerProps = Pick<SwitchProps, 'label' | 'error' | 'helperText'> & 
  React.HTMLAttributes<HTMLDivElement>

export type SwitchIndicatorProps = React.HTMLAttributes<HTMLDivElement>

export type SwitchOptionProps = React.HTMLAttributes<HTMLButtonElement> & {
  label: ReactNode // default: ''
  value: boolean // default: false
}

export type SwitchTrackProps = React.HTMLAttributes<HTMLDivElement>
/* export type SwitchProps = React.HTMLAttributes<HTMLElement> & {
  label: string // default: ''
  name: string // default: ''
  error: string // default: ''
  helperText?: string // default: ''
  activeLabel?: React.ReactNode // default: 'On'
  inactiveLabel?: React.ReactNode // default: 'Off'
  checked?: boolean // default: false
  disabled?: boolean // default: false
  onChange?: (value: boolean) => void
  onInput?: (value: boolean) => void
  onFocus?: (value: boolean) => void
  onBlur?: (value: boolean) => void
  onKeyDown?: (value: boolean) => void
}

export type SwitchIndicatorProps = React.HTMLAttributes<HTMLDivElement> & {
  checked: boolean
  focused: boolean
  dirty: boolean
  disabled: boolean
  activeLabel?: React.ReactNode // default: 'On'
  inactiveLabel?: React.ReactNode // default: 'Off'
}

export type SwitchOptionsProps = React.HTMLAttributes<HTMLDivElement> & {
  activeLabel?: React.ReactNode // default: 'On'
  inactiveLabel?: React.ReactNode // default: 'Off'
  checked: boolean
  focused: boolean
  dirty: boolean
  disabled: boolean
}

export type SwitchOptionProps = React.HTMLAttributes<HTMLDivElement> & {
  checked: boolean
  focused: boolean
  dirty: boolean
  disabled: boolean
  value: boolean
  onClick?: () => void
  onFocus?: () => void
  onBlur?: () => void
} */