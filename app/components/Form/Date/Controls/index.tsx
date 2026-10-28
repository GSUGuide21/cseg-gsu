'use client'

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { FC } from 'react'

import { cn } from '@/lib/cn'

import { controlButton } from '../../Input/variants'

export interface CalendarControlsProps {
  /** "October 2026", "2026", or "2016 – 2027" */
  label: string
  labelId: string
  /** What the arrows step by, for their names: "month", "year", or "12 years" */
  unit: string
  onPrevious: () => void
  onNext: () => void
  previousDisabled?: boolean
  nextDisabled?: boolean
  /** Clicking the label zooms out (days → months → years); left out at the widest view */
  onZoomOut?: () => void
}

/** The calendar's header: what's showing, a button to zoom out from it, and arrows either side */
export const CalendarControls: FC<CalendarControlsProps> = ({
  label,
  labelId,
  unit,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  onZoomOut,
}) => (
  <div className="flex items-center justify-between gap-2">
    {onZoomOut ? (
      <button
        type="button"
        onClick={onZoomOut}
        className="-ml-1.5 inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[0.95rem] font-bold text-ink transition-colors hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
      >
        {/* Announced as it changes, so keyboard users know where they've landed */}
        <span id={labelId} aria-live="polite">
          {label}
        </span>
        <ChevronDown size={15} aria-hidden className="text-ink-faint" />
        <span className="sr-only">, choose a different {unit === 'month' ? 'month' : 'year'}</span>
      </button>
    ) : (
      <span id={labelId} aria-live="polite" className="px-0.5 text-[0.95rem] font-bold text-ink">
        {label}
      </span>
    )}
    <span className="flex items-center gap-0.5">
      <button type="button" onClick={onPrevious} disabled={previousDisabled} aria-label={`Previous ${unit}`} className={controlButton}>
        <ChevronLeft size={18} aria-hidden />
      </button>
      <button type="button" onClick={onNext} disabled={nextDisabled} aria-label={`Next ${unit}`} className={cn(controlButton)}>
        <ChevronRight size={18} aria-hidden />
      </button>
    </span>
  </div>
)
