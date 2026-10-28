import type { ControlSize } from '../types'

export interface TagInputProps {
  /** The tags (controlled); leave out to let it manage itself */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (tags: string[]) => void
  /** At most this many */
  max?: number
  /**
   * Checks a tag before it's added: return a message to turn it away ("Not a GSU email"),
   * or nothing to accept it.
   */
  validate?: (tag: string) => string | void | undefined
  /** Tidies each tag first: (t) => t.toLowerCase(). Spaces at the ends are always trimmed. */
  transform?: (tag: string) => string
  /** Keys that add the tag being typed, besides Enter. Default [","]. */
  separators?: string[]
  /** Words suggested as you type; picking one adds it */
  suggestions?: string[]
  placeholder?: string
  /** Sent with the form: one hidden input per tag */
  name?: string
  size?: ControlSize
  id?: string
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  'aria-label'?: string
  'aria-describedby'?: string
  className?: string
}
