import type { ReactElement, ReactNode } from 'react'

import type { Tone } from '../tones'

interface SharedBadgeProps {
  tone?: Tone
  /** "soft" is a tinted label; "solid" is filled, for counts and emphasis. Default "soft". */
  appearance?: 'soft' | 'solid' | 'outline'
  size?: 'sm' | 'md'
  /** A small dot in the tone's color before the label, e.g. for a status */
  dot?: boolean
  /** Shows a remove button (for a filter or tag); `children` should be text, which names it */
  onRemove?: () => void
  className?: string
}

interface TextBadgeProps extends SharedBadgeProps {
  /** An icon before the label */
  icon?: ReactNode
  /** Names the badge in place of its text, for screen readers (and as its hover title) */
  label?: string
  children: ReactNode
}

interface IconBadgeProps extends SharedBadgeProps {
  /** The badge is just this icon, in a circle */
  icon: ReactNode
  /** What the icon means ("Verified", "Members only"); required, since there's no text to say it */
  label: string
  children?: undefined
}

export type BadgeProps = TextBadgeProps | IconBadgeProps

export interface IndicatorBadgeProps {
  /** The element the badge sits on: an icon, an avatar, an icon button */
  children: ReactElement<{ 'aria-describedby'?: string }>
  /** A number to show; hidden at 0 unless `showZero` */
  count?: number
  /** Counts above this show as "99+". Default 99. */
  max?: number
  showZero?: boolean
  /** Just a dot, no number ("something new") */
  dot?: boolean
  /** An icon in the badge in place of a number, e.g. a check on an avatar */
  icon?: ReactNode
  /**
   * What the badge means, in words ("3 unread messages", "Online"). It's attached to the
   * element as its description, so a button reads "Notifications, 3 unread messages".
   */
  label: string
  /** Default "danger" for counts and dots, "success" for icons */
  tone?: Tone
  /** Which corner it sits on. Default "top-end". */
  placement?: 'top-end' | 'bottom-end' | 'top-start' | 'bottom-start'
  /** "circle" pulls the badge in to sit on the rim of a round element (an avatar). Default "rect". */
  overlap?: 'rect' | 'circle'
  className?: string
}
