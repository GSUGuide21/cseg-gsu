'use client'

import { createContext, useContext } from 'react'

import type { ColorPickerContextValue } from './types'

export const ColorPickerContext = createContext<ColorPickerContextValue | null>(null)

/** The ColorPicker around a canvas, hue bar, or swatch */
export const useColorPicker = () => {
  const context = useContext(ColorPickerContext)
  if (!context) throw new Error('ColorPicker parts must be used inside a ColorPicker')
  return context
}
