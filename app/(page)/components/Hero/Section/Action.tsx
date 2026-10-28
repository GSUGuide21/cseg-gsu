import type { FC, ReactNode } from 'react'

import { Button } from '@/components'

export interface HeroSectionActionInterface {
  href: string
  /** Default "Learn more" */
  label?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
  rel?: string
  /** Shown after the label */
  icon?: ReactNode
  onClick?: () => void
}

/** A link, or just its href (labeled "Learn more") */
export type HeroSectionActionType = HeroSectionActionInterface | string

export interface HeroSectionActionProps {
  action: HeroSectionActionType
  /** The first action is the main one; the rest are outlined */
  primary?: boolean
  /** Over a background image: a white outline in place of the brand one */
  inverted?: boolean
}

export const HeroSectionAction: FC<HeroSectionActionProps> = ({ action, primary = true, inverted = false }) => {
  const { href, label = 'Learn more', target, rel, icon, onClick } = typeof action === 'string' ? { href: action } as HeroSectionActionInterface : action
  return (
    <Button
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      external={target === '_blank' ? true : undefined}
      variant={primary ? 'primary' : 'outline'}
      size="lg"
      trailing={icon}
      className={!primary && inverted ? 'border-white text-white hover:border-white hover:bg-white hover:text-ink' : undefined}
    >
      {label}
    </Button>
  )
}
