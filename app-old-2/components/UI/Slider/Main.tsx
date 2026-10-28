'use client'
import React from 'react'
import clsx from 'clsx'
import { SliderProvider } from './Context'
import { SliderProps } from './types'

export const Slider: React.FC<SliderProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <SliderProvider {...props}>
      <div className={clsx("slider", className)}>
        {children}
      </div>
    </SliderProvider>
  )
}