import { Lightbulb } from 'lucide-react'
import type { FC } from 'react'

import { cn } from '@/lib/cn'

/** A tip in a student's voice, on a place, an eatery, or a resource: set apart, so it reads as advice and not as fact sheet */
export const InsiderTip: FC<{ tip: string; className?: string }> = ({ tip, className }) => (
  <p className={cn('flex items-start gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--warning)_12%,var(--bg))] px-2.5 py-1.5 text-[0.82rem] leading-snug text-ink-soft', className)}>
    <Lightbulb size={14} aria-hidden className="mt-0.5 shrink-0 text-warning" />
    <span>
      <span className="font-bold text-ink">Tip: </span>
      {tip}
    </span>
  </p>
)
