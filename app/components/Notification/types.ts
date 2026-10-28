import type { ReactNode } from 'react'

export type NotificationType =
    | "toast"
    | "banner"
    | "modal"

export type NotificationVariant =
    | "info"
    | "success"
    | "warning"
    | "error"

/** An action button on a toast or banner */
export interface NotificationAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  variant?: NotificationVariant
  title: string
  message?: string
  action?: NotificationAction
  /**
   * How long it shows, in ms, before going on its own (hover or focus pauses it). Default 5000;
   * errors stay until dismissed, and `Infinity` keeps any toast until then.
   */
  duration?: number
}

export interface ConfirmOptions {
  title: string
  message?: ReactNode
  /** Default "Confirm" */
  confirmLabel?: string
  /** Default "Cancel" */
  cancelLabel?: string
  /** "error" makes the confirm button red, for deleting or other things that can't be undone */
  variant?: NotificationVariant
}

export interface NotificationContextValue {
  /** Shows a toast; returns its id */
  toast: (options: ToastOptions) => string
  dismiss: (id: string) => void
  /** Asks a yes/no question in a modal; resolves true when confirmed */
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

export interface BannerProps {
  variant?: NotificationVariant
  title?: ReactNode
  children?: ReactNode
  action?: NotificationAction
  /** Shows a close button */
  onDismiss?: () => void
  /** Announce it when it appears (not for banners there on page load) */
  live?: boolean
  className?: string
}

export interface AlertDialogProps extends ConfirmOptions {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** One notification of any type, for using them directly in a page */
export type NotificationProps =
  | ({ type: 'banner' } & BannerProps)
  | ({ type: 'toast'; onDismiss?: () => void; className?: string } & ToastOptions)
  | ({ type: 'modal' } & AlertDialogProps)
