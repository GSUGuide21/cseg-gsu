'use client'

import type { FC } from 'react'

import { cn } from '@/lib/cn'

export interface PeriodGridProps {
  /** One entry per button, in order */
  items: readonly { key: number; label: string; current: boolean; disabled: boolean }[]
  onPick: (key: number) => void
  label: string
}

/**
 * The months of a year, or a span of years, as a 3 × 4 grid of buttons; picking one zooms
 * back in. The one in view is highlighted.
 */
export const PeriodGrid: FC<PeriodGridProps> = ({ items, onPick, label }) => (
  <div role="group" aria-label={label} className="grid grid-cols-3 gap-1.5 py-1">
    {items.map((item) => (
      <button
        key={item.key}
        type="button"
        onClick={() => onPick(item.key)}
        disabled={item.disabled}
        aria-current={item.current || undefined}
        className={cn(
          'h-12 cursor-pointer rounded-lg text-[0.85rem] font-semibold text-ink transition-colors',
          'hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand',
          'disabled:cursor-not-allowed disabled:text-ink-faint/60 disabled:hover:bg-transparent',
          item.current && 'bg-brand-solid text-white hover:bg-brand-solid-hover hover:text-white'
        )}
      >
        {item.label}
      </button>
    ))}
  </div>
)
