import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import type { FC } from 'react'

import { cn } from '@/lib/cn'

import { toneSurface, toneText } from '../tones'
import type { AlertProps, AlertTone } from './types'

export const TONE_ICONS: Record<AlertTone, FC<{ size?: number; className?: string; 'aria-hidden'?: boolean }>> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
}

/** What the tone is, said before the title, since color alone can't say it */
export const TONE_NAMES: Record<AlertTone, string> = {
  neutral: 'Note',
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  danger: 'Error',
}

/**
 * A message in the page: a heads-up, a success, a warning, or an error.
 *
 *   <Alert tone="warning" title="Registration closes Friday">Sign up by 5 p.m.</Alert>
 *   <Alert tone="danger" live title="Couldn’t save" onDismiss={clear}>Check your connection.</Alert>
 */
export const Alert: FC<AlertProps> = ({ tone = 'info', title, children, icon, actions, onDismiss, live = false, className }) => {
  const Icon = TONE_ICONS[tone]
  const urgent = tone === 'warning' || tone === 'danger'
  return (
    <div
      role={live ? (urgent ? 'alert' : 'status') : undefined}
      className={toneSurface({ tone, className: cn('flex items-start gap-3 rounded-xl border px-4 py-3.5', className) })}
    >
      {icon === false ? null : <span className={cn('mt-0.5 shrink-0', toneText[tone])}>{icon ?? <Icon size={19} aria-hidden />}</span>}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? (
          <p className="m-0 font-bold leading-snug text-ink">
            <span className="sr-only">{TONE_NAMES[tone]}: </span>
            {title}
          </p>
        ) : (
          <span className="sr-only">{TONE_NAMES[tone]}: </span>
        )}
        {children ? <div className="text-[0.92rem] leading-relaxed text-ink-soft">{children}</div> : null}
        {actions ? <div className="mt-1.5 flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mt-0.5 -mr-1.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-black/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand dark:hover:bg-white/10"
        >
          <X size={17} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
