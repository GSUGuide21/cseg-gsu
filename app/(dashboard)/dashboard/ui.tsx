'use client'

import { useState, useTransition, type FC, type ReactNode } from 'react'

import { useNotify } from '@/components'
import type { ActionResult, FieldErrors } from '@/lib/dashboard/validate'

/** A dashboard page's heading row: title, a line about it, and its main actions */
export const PageTitle: FC<{ title: ReactNode; description?: ReactNode; actions?: ReactNode }> = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div className="flex min-w-0 flex-col gap-1">
      <h1 className="m-0 text-[clamp(1.5rem,3vw,1.9rem)] font-extrabold tracking-tight text-ink">{title}</h1>
      {description ? <p className="m-0 max-w-2xl text-[0.92rem] text-muted">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
)

/**
 * Runs a server action from a form or button: tracks pending, keeps each field's error to
 * show in place, and toasts the outcome. `onDone` runs after a success.
 */
export function useAction() {
  const { toast } = useNotify()
  const [pending, start] = useTransition()
  const [errors, setErrors] = useState<FieldErrors>({})
  const run = (action: () => Promise<ActionResult>, onDone?: (result: Extract<ActionResult, { ok: true }>) => void) =>
    start(async () => {
      const result = await action()
      if (result.ok) {
        setErrors({})
        if (result.message) toast({ variant: 'success', title: result.message })
        onDone?.(result)
      } else {
        setErrors(result.errors ?? {})
        if (result.error) toast({ variant: 'error', title: 'Couldn’t save', message: result.error })
      }
    })
  return { pending, errors, setErrors, run }
}
