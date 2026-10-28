'use client'

import { Check } from 'lucide-react'
import type { FC } from 'react'

import { cn } from '@/lib/cn'

import type { Option } from '../../types'
import { useSelect } from '../Context'

/**
 * One option in the menu. Focus never moves here: the trigger keeps it and points at the
 * highlighted option with aria-activedescendant, so pressing down on an option mustn't
 * steal focus either.
 */
export const SelectOption: FC<{ option: Option }> = ({ option }) => {
  const select = useSelect()
  const selected = select.isSelected(option.value)
  const active = select.activeValue === option.value
  return (
    <div
      role="option"
      id={select.optionId(option.value)}
      aria-selected={selected}
      aria-disabled={option.disabled || undefined}
      data-active={active || undefined}
      onMouseDown={(e) => e.preventDefault()}
      onPointerMove={() => {
        if (!option.disabled && !active) select.setActiveValue(option.value)
      }}
      onClick={() => {
        if (!option.disabled) select.toggle(option.value)
      }}
      className="flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 text-[0.9rem] leading-snug text-ink data-active:bg-brand-tint aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
    >
      <Check size={16} aria-hidden className={cn('mt-px shrink-0 text-brand', !selected && 'invisible')} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn(selected && 'font-semibold')}>{option.label}</span>
        {option.description ? <span className="text-[0.8rem] text-muted">{option.description}</span> : null}
      </span>
    </div>
  )
}
