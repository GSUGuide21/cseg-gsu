import type { ComponentProps, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'subtle' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface SharedButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Icon before the label */
  leading?: ReactNode
  /** Icon after the label */
  trailing?: ReactNode
  /** Fills its container's width */
  block?: boolean
  /**
   * Just an icon (pass it as children), square. `aria-label` is required then, since
   * there's no visible text to name it.
   */
  iconOnly?: boolean
  className?: string
  children?: ReactNode
}

export interface ButtonAsButtonProps extends SharedButtonProps, Omit<ComponentProps<'button'>, keyof SharedButtonProps> {
  href?: undefined
  /** Shows a spinner, keeps its width, and ignores clicks until done */
  loading?: boolean
}

export interface ButtonAsLinkProps extends SharedButtonProps, Omit<ComponentProps<'a'>, keyof SharedButtonProps | 'href'> {
  /** Renders a link styled as a button: a Next.js Link for paths, a plain link for other sites */
  href: string
  /** Opens in a new tab (default for links to other sites) */
  external?: boolean
  /** A link that can't be followed right now; it stays in place but isn't clickable */
  disabled?: boolean
  loading?: undefined
}

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps
