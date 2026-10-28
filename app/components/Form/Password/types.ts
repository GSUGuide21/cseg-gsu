import type { InputProps } from '../Input/types'

export interface PasswordRequirement {
  /** What's asked for: "At least 12 characters" */
  label: string
  test: (password: string) => boolean
}

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'trailing'> {
  /** Shows how strong the password is, under it, as it's typed (for new passwords) */
  strength?: boolean
  /** A checklist under it that ticks off as each is met (for new passwords) */
  requirements?: PasswordRequirement[]
}
