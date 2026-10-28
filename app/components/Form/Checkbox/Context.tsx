'use client'

import { createContext, useContext } from 'react'

import type { CheckboxGroupContextValue } from './types'

export const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null)

/** The CheckboxGroup around a Checkbox, if any */
export const useCheckboxGroup = () => useContext(CheckboxGroupContext)
