import type { ControlSize } from '../types'

/** What an availability check found: free, taken, or a reason it can't be used */
export type SlugCheck = { ok: true } | { ok: false; message: string }

export interface SlugInputProps {
  /** The slug (controlled); leave out to let it manage itself */
  value?: string
  defaultValue?: string
  onValueChange?: (slug: string) => void
  /**
   * Text to make the slug from, usually the title. The slug follows it until someone edits
   * the slug by hand; "Use the title" puts it back in step.
   */
  source?: string
  /** Shown before the slug: "/posts/", or "cseg.org/events/" */
  prefix?: string
  /**
   * Asks whether a slug is free (a quick server lookup). Runs a moment after typing stops;
   * the answer shows under the field.
   */
  checkAvailability?: (slug: string) => Promise<SlugCheck>
  /**
   * It's already live, so changing it breaks links people have. Editing still works, after
   * a press of "Change", with a warning.
   */
  locked?: boolean
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
