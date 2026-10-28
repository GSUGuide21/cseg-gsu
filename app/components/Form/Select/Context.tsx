'use client'

import { createContext, useContext } from 'react'

import type { SelectContextValue } from './types'

export const SelectContext = createContext<SelectContextValue | null>(null)

/** The Select around a menu option or group */
export const useSelect = () => {
  const context = useContext(SelectContext)
  if (!context) throw new Error('Select parts must be used inside a Select')
  return context
}
