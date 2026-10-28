'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { createContext, useContext, type FC } from 'react'

import { cn } from '@/lib/cn'

import type { NumberContextValue } from './types'

export const NumberContext = createContext<NumberContextValue | null>(null)

/** The NumberInput around this component: its value and step controls */
export const useNumberInput = () => {
  const context = useContext(NumberContext)
  if (!context) throw new Error('useNumberInput must be used inside a NumberInput')
  return context
}

/**
 * The up or down chevron, half the spinner's height. Kept out of the tab order: the input
 * already steps with the arrow keys, so keyboard users don't need two extra stops.
 */
export const NumberStep: FC<{ direction: 'down' | 'up' }> = ({ direction }) => {
  const { increment, decrement, canIncrement, canDecrement, disabled } = useNumberInput()
  const up = direction === 'up'
  const Icon = up ? ChevronUp : ChevronDown
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={up ? 'Increase' : 'Decrease'}
      disabled={disabled || !(up ? canIncrement : canDecrement)}
      onClick={up ? increment : decrement}
      className={cn(
        'grid min-h-0 w-7 flex-1 cursor-pointer place-items-center text-ink-soft transition-colors',
        'hover:bg-brand-tint hover:text-brand active:bg-brand/20',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-soft',
        up ? 'rounded-t-md' : 'rounded-b-md'
      )}
    >
      <Icon size={14} strokeWidth={2.5} aria-hidden />
    </button>
  )
}
