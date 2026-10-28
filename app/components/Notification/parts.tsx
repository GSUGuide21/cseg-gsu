'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useRef, type FC } from 'react'

import { cn } from '@/lib/cn'

import { TONE_ICONS, TONE_NAMES } from '../Alert'
import { Button } from '../Button'
import { toneSurface, toneText, type Tone } from '../tones'
import type { AlertDialogProps, BannerProps, NotificationVariant, ToastOptions } from './types'

/** The color each variant uses ("error" is the danger tone) */
export const VARIANT_TONE: Record<NotificationVariant, Exclude<Tone, 'brand' | 'neutral'>> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'danger',
}

const dismissButton = 'grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft transition-colors hover:bg-black/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand dark:hover:bg-white/10'

/**
 * A message across the top of a page or section: an outage, a deadline, a change. For a
 * message tied to one part of a page, use Alert.
 */
export const Banner: FC<BannerProps> = ({ variant = 'info', title, children, action, onDismiss, live = false, className }) => {
  const tone = VARIANT_TONE[variant]
  const Icon = TONE_ICONS[tone]
  return (
    <div
      role={live ? (variant === 'error' || variant === 'warning' ? 'alert' : 'status') : undefined}
      className={toneSurface({ tone, className: cn('flex w-full items-center gap-3 border-y px-4 py-2.5 text-[0.9rem]', className) })}
    >
      <Icon size={18} aria-hidden className={cn('shrink-0', toneText[tone])} />
      <p className="m-0 min-w-0 flex-1 leading-snug">
        <span className="sr-only">{TONE_NAMES[tone]}: </span>
        {title ? <strong className="font-bold text-ink">{title} </strong> : null}
        <span className="text-ink-soft">{children}</span>
      </p>
      {action ? (
        <Button size="sm" variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className={dismissButton}>
          <X size={16} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

/** One toast card. The provider stacks, times, and announces these. */
export const Toast: FC<ToastOptions & { onDismiss?: () => void; className?: string }> = ({ variant = 'info', title, message, action, onDismiss, className }) => {
  const tone = VARIANT_TONE[variant]
  const Icon = TONE_ICONS[tone]
  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-[0_12px_32px_rgb(0_0_0/0.16)]',
        'border-l-4',
        { info: 'border-l-brand', success: 'border-l-success', warning: 'border-l-warning', danger: 'border-l-danger' }[tone],
        className
      )}
    >
      <Icon size={19} aria-hidden className={cn('mt-px shrink-0', toneText[tone])} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="m-0 font-bold leading-snug text-ink">{title}</p>
        {message ? <p className="m-0 text-[0.88rem] leading-snug text-ink-soft">{message}</p> : null}
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-1 self-start cursor-pointer rounded text-[0.85rem] font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            {action.label}
          </button>
        ) : null}
      </div>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label={`Dismiss: ${title}`} className={cn(dismissButton, '-mt-1 -mr-1.5 size-7')}>
          <X size={15} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

/**
 * A question that needs an answer before going on, in a modal (role "alertdialog"): Delete
 * this event? Focus starts on Cancel, the safe choice; Escape cancels.
 */
export const AlertDialog: FC<AlertDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel,
}) => {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const messageId = useId()
  const tone = VARIANT_TONE[variant]
  const Icon = TONE_ICONS[tone]

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
      cancelRef.current?.focus()
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close()
      else dialog.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      className={cn(
        'm-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-[0_24px_60px_rgb(0_0_0/0.3)]',
        'backdrop:bg-black/45',
        'opacity-0 scale-95 open:opacity-100 open:scale-100 starting:open:opacity-0 starting:open:scale-95',
        'transition-[opacity,scale,overlay,display] duration-200 transition-discrete motion-reduce:transition-none'
      )}
    >
      <div className="flex gap-3.5 p-5">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', toneSurface({ tone }), toneText[tone])}>
          <Icon size={20} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5 pt-1">
          <h2 id={titleId} className="m-0 text-[1.05rem] font-bold leading-snug">
            {title}
          </h2>
          {message ? (
            <div id={messageId} className="text-[0.92rem] leading-relaxed text-ink-soft">
              {message}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-fill px-5 py-3.5">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg border-2 border-line bg-surface px-4 py-2 text-[0.9rem] font-semibold text-ink transition-colors hover:border-brand/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {cancelLabel}
        </button>
        <Button variant={variant === 'error' ? 'danger' : 'primary'} size="sm" onClick={onConfirm} className="px-4 py-2">
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
