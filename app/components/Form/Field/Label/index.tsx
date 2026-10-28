import type { FC } from 'react'

import { cn } from '@/lib/cn'

import type { LabelProps } from './types'

/**
 * A floating label rests at text size inside the control while it's empty and unfocused,
 * and sits small at the top otherwise. Its Field wraps the control in a `group`, and an
 * empty control shows its (blank) placeholder, which is what these selectors look for.
 */
const FLOATING = [
  'pointer-events-none absolute top-1.5 left-3.5 z-1 max-w-[calc(100%-1.75rem)] truncate text-[0.7rem] font-semibold text-muted transition-all',
  '[.group:has(:placeholder-shown):not(:focus-within)_&]:top-4 [.group:has(:placeholder-shown):not(:focus-within)_&]:text-[0.95rem] [.group:has(:placeholder-shown):not(:focus-within)_&]:font-normal',
  'group-focus-within:text-brand',
  'motion-reduce:transition-none',
]

export const Label: FC<LabelProps> = ({ required, floating, className, children, ...props }) => (
  <label {...props} className={cn(floating ? FLOATING : 'text-[0.85rem] leading-snug font-semibold text-ink', className)}>
    {children}
    {required ? (
      <span aria-hidden className="ml-0.5 text-danger">
        *
      </span>
    ) : null}
  </label>
)
