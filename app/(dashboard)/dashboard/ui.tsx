'use client'

import { useState, useTransition, type FC, type ReactNode } from 'react'

import { useNotify } from '@/components'
import { cn } from '@/lib/cn'
import { dateParts } from '@/lib/dashboard/format'
import type { ActionResult, FieldErrors } from '@/lib/dashboard/validate'

/** A dashboard page's heading row: its icon, title, a line about it, and its main actions */
export const PageTitle: FC<{ title: ReactNode; description?: ReactNode; actions?: ReactNode; icon?: ReactNode }> = ({ title, description, actions, icon }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div className="flex min-w-0 items-center gap-3.5">
      {icon ? (
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-solid to-brand-bright text-white shadow-card [&>svg]:size-5.5">
          {icon}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="m-0 text-[clamp(1.5rem,3vw,1.9rem)] font-extrabold tracking-tight text-ink">{title}</h1>
        {description ? <p className="m-0 max-w-2xl text-[0.92rem] text-muted">{description}</p> : null}
      </div>
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
)

/** A card holding one part of a page, with an optional heading and a link or button beside it */
export const Panel: FC<{ title?: ReactNode; icon?: ReactNode; action?: ReactNode; className?: string; children: ReactNode }> = ({ title, icon, action, className, children }) => (
  <section className={cn('flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-card', className)}>
    {title ? (
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 flex items-center gap-2 text-[1rem] font-bold text-ink">
          {icon ? (
            <span aria-hidden className="text-brand [&>svg]:size-4.5">
              {icon}
            </span>
          ) : null}
          {title}
        </h2>
        {action}
      </div>
    ) : null}
    {children}
  </section>
)

/** A small tear-off calendar page. Decoration: keep the date in words beside it. */
export const DateChip: FC<{ iso: string; past?: boolean }> = ({ iso, past }) => {
  const { month, day } = dateParts(iso)
  return (
    <span aria-hidden className="flex w-12 shrink-0 flex-col overflow-hidden rounded-lg border border-brand-edge bg-surface text-center">
      <span className={cn('py-0.5 text-[0.62rem] font-bold tracking-wider uppercase', past ? 'bg-fill text-muted' : 'bg-brand-solid text-white')}>{month}</span>
      <span className="py-1 text-[1.15rem] leading-none font-extrabold text-ink tabular-nums">{day}</span>
    </span>
  )
}

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
