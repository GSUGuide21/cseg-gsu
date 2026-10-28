import Image from 'next/image'
import type { FC } from 'react'

import { cn } from '@/lib/cn'

export type LogoMarkProps = {
  /** Rendered size in px */
  size?: number
  className?: string
  priority?: boolean
  alt?: string
}

/** Round CSEG seal. Clipped to a circle so the square image's light backing doesn't show in dark mode. */
export const LogoMark: FC<LogoMarkProps> = ({ size = 44, className, priority, alt = '' }) => (
  <Image
    src="/assets/logos/cseg-pin.png"
    alt={alt}
    width={size}
    height={size}
    priority={priority}
    className={cn('block shrink-0 rounded-full bg-white ring-1 ring-line', className)}
  />
)
