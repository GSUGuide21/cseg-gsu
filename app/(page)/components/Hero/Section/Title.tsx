import type { FC, HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export interface HeroSectionTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** The page's main heading by default; use h2 for a hero further down a page */
  as?: 'h1' | 'h2'
}

export const HeroSectionTitle: FC<HeroSectionTitleProps> = ({ as: Heading = 'h1', className, children, ...props }) => (
  <Heading
    {...props}
    className={cn('text-[clamp(2.25rem,7vw,4.25rem)] leading-[1.05] font-extrabold tracking-tight text-balance', className)}
  >
    {children}
  </Heading>
)
