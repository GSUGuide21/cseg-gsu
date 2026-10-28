'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FC, type ReactNode } from 'react'

import { Portal } from '../Portal'
import { AlertDialog, Banner, Toast } from './parts'
import type { ConfirmOptions, NotificationContextValue, NotificationProps, ToastOptions } from './types'

/** How long a toast shows by default, in ms */
const TOAST_MS = 5000
/** Most toasts on screen at once; older ones go first */
const MAX_TOASTS = 4

type QueuedToast = ToastOptions & { id: string }
type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void }

const NotificationContext = createContext<NotificationContextValue | null>(null)

/**
 * Toasts and confirmations from anywhere in the app. Wrap the app (or a page) once:
 *
 *   <NotificationProvider>…</NotificationProvider>
 *
 * then, in any component:
 *
 *   const { toast, confirm } = useNotify()
 *   toast({ variant: 'success', title: 'Saved' })
 *   if (await confirm({ title: 'Delete this event?', variant: 'error', confirmLabel: 'Delete' })) remove()
 */
export const useNotify = () => {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotify must be used inside a NotificationProvider')
  return context
}

/** One toast in the stack, which times itself out unless hovered or focused */
const TimedToast: FC<{ toast: QueuedToast; paused: boolean; onDismiss: (id: string) => void }> = ({ toast, paused, onDismiss }) => {
  const duration = toast.duration ?? (toast.variant === 'error' ? Infinity : TOAST_MS)
  // Time left, kept across pauses
  const left = useRef(duration)
  useEffect(() => {
    if (paused || !Number.isFinite(left.current)) return
    const started = Date.now()
    const timer = window.setTimeout(() => onDismiss(toast.id), left.current)
    return () => {
      window.clearTimeout(timer)
      left.current -= Date.now() - started
    }
  }, [paused, toast.id, onDismiss])
  return <Toast {...toast} onDismiss={() => onDismiss(toast.id)} className="starting:translate-y-2 starting:opacity-0 transition-[opacity,translate] duration-200 motion-reduce:transition-none" />
}

export const NotificationProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<QueuedToast[]>([])
  const [paused, setPaused] = useState(false)
  // What screen readers hear: polite for most, assertive for errors and warnings
  const [said, setSaid] = useState({ polite: '', urgent: '' })
  const [pending, setPending] = useState<PendingConfirm[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: string) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const toast = useCallback((options: ToastOptions) => {
    const id = `toast-${++nextId.current}`
    setToasts((list) => [...list, { ...options, id }].slice(-MAX_TOASTS))
    const text = [options.title, options.message].filter(Boolean).join('. ')
    const urgent = options.variant === 'error' || options.variant === 'warning'
    // Cleared first so the same message twice is announced twice
    setSaid({ polite: '', urgent: '' })
    window.setTimeout(() => setSaid(urgent ? { polite: '', urgent: text } : { polite: text, urgent: '' }), 50)
    return id
  }, [])

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending((list) => [...list, { ...options, resolve }])), [])

  const answer = (ok: boolean) => {
    const [first, ...rest] = pending
    first?.resolve(ok)
    setPending(rest)
  }

  const value = useMemo(() => ({ toast, dismiss, confirm }), [toast, dismiss, confirm])
  const asking = pending[0]

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Portal>
        {/* Bottom right on wide screens, across the bottom on phones */}
        <section
          aria-label="Notifications"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false)
          }}
          className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[22rem]"
        >
          {toasts.map((t) => (
            <TimedToast key={t.id} toast={t} paused={paused} onDismiss={dismiss} />
          ))}
        </section>
        <div className="sr-only" aria-live="polite">
          {said.polite}
        </div>
        <div className="sr-only" aria-live="assertive">
          {said.urgent}
        </div>
      </Portal>
      {asking ? <AlertDialog key={pending.length} open {...asking} onConfirm={() => answer(true)} onCancel={() => answer(false)} /> : null}
    </NotificationContext.Provider>
  )
}

/**
 * One notification, used directly in a page: a banner, a toast card (outside the provider's
 * stack), or a modal confirmation.
 */
export const Notification: FC<NotificationProps> = (props) =>
  // Each part reads only its own props, so the extra `type` goes nowhere
  props.type === 'banner' ? <Banner {...props} /> : props.type === 'toast' ? <Toast {...props} /> : <AlertDialog {...props} />

export { AlertDialog, Banner, Toast } from './parts'
export type { NotificationType, NotificationVariant } from './types'
