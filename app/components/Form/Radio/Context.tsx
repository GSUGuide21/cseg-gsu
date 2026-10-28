'use client'

import { createContext, useContext } from 'react'

import type { RadioGroupContextValue } from './types'

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

/** The RadioGroup around a Radio; every Radio needs one */
export const useRadioGroup = () => {
  const context = useContext(RadioGroupContext)
  if (!context) throw new Error('Radio must be used inside a RadioGroup')
  return context
}
