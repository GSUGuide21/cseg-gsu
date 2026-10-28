import type { ComponentProps, ReactNode } from 'react'

export interface FileInputProps extends Omit<ComponentProps<'input'>, 'type' | 'value' | 'defaultValue' | 'onChange' | 'children'> {
  /** Called with the full list each time a file is added or removed */
  onFilesChange?: (files: File[]) => void
  /** Largest file allowed, in bytes */
  maxSize?: number
  /** Most files allowed when `multiple` */
  maxFiles?: number
  /** Line under the drop prompt, e.g. "PDF or Word, up to 5 MB" */
  hint?: ReactNode
  invalid?: boolean
}
