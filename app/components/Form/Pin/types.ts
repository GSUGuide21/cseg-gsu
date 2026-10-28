export interface PinInputProps {
  /** How many characters. Default 6. */
  length?: number
  /** "numeric" (default) brings up the number pad and takes only digits */
  type?: 'numeric' | 'alphanumeric'
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Called once every box is filled, with the code: a good moment to submit */
  onComplete?: (value: string) => void
  /** Dots in place of what's typed */
  mask?: boolean
  name?: string
  id?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  autoFocus?: boolean
  /** Names it when it isn't in a Field. Default "Verification code". */
  'aria-label'?: string
  'aria-describedby'?: string
  className?: string
}
