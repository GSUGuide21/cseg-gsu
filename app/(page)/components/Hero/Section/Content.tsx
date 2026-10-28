import type { FC, HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { HeroSectionTitle, type HeroSectionTitleProps } from './Title'

export interface HeroSectionContentProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Above the title: an eyebrow, a logo */
  beforeContent?: ReactNode
  title?: ReactNode
  titleAs?: HeroSectionTitleProps['as']
  /** A larger line under the title */
  subtitle?: ReactNode
  /** A paragraph under the subtitle */
  description?: ReactNode
  /** Under the text: the actions, a note */
  afterContent?: ReactNode
  /** Centered (a hero with no side image) or start-aligned. Default "center". */
  align?: 'center' | 'start'
  /** Light text, for content over a background image */
  inverted?: boolean
}

/** The hero's text: what comes before, the title, subtitle, description, then what comes after. */
export const HeroSectionContent: FC<HeroSectionContentProps> = ({
  beforeContent,
  title,
  titleAs,
  subtitle,
  description,
  afterContent,
  align = 'center',
  inverted = false,
  className,
  children,
  ...props
}) => (
  <div
    {...props}
    className={cn(
      'flex flex-col gap-5',
      align === 'center' ? 'items-center text-center' : 'items-start text-left',
      inverted ? 'text-white' : 'text-ink',
      className
    )}
  >
    {beforeContent}
    {/* Beside an image it has half the width, so a step smaller */}
    {title ? (
      <HeroSectionTitle as={titleAs} className={align === 'start' ? 'text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05]' : undefined}>
        {title}
      </HeroSectionTitle>
    ) : null}
    {subtitle ? (
      <p className={cn('text-[clamp(1.15rem,2.5vw,1.5rem)] leading-snug font-semibold text-balance', inverted ? 'text-white/90' : 'text-ink-soft')}>
        {subtitle}
      </p>
    ) : null}
    {description ? (
      <p className={cn('max-w-2xl text-[clamp(1rem,2vw,1.15rem)] leading-[1.65] text-pretty', inverted ? 'text-white/80' : 'text-muted')}>
        {description}
      </p>
    ) : null}
    {children}
    {afterContent}
  </div>
)
