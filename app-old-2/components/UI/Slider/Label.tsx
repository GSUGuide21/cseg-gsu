'use client'
import React, { useCallback } from 'react'
import clsx from 'clsx'
import { clamp } from '@/app-old-2/lib/util'
import { useSliderContext } from './Context'
import { SliderLabelProps } from './types'

export const SliderLabel: React.FC<SliderLabelProps> = ({
  value = 0,
  className,
  children,
  ...props
}) => {
  const { 
    min, 
    max, 
    handleChange,
    showValueType,
    disabled
  } = useSliderContext()

  const handleLabelClick = useCallback(() => {
    if (disabled || value === null) return

    let newValue = value

    switch (showValueType) {
      case 'percentage':
        newValue = (value / 100) * (max - min) + min
        break
      case 'value':
        newValue = Math.round(value)
        break
      default:
        console.warn(`Unsupported value type: ${showValueType}. Defaulting to raw value.`)
        newValue = value // Fallback to raw value
        break
    }

    const clampedValue = clamp(newValue, min, max)
    handleChange?.(clampedValue)
  }, [disabled, min, max, handleChange, showValueType, value])
  
  return (
    <div
      {...props}
      className={clsx('slider-label', className)}
      onClick={handleLabelClick}
      role="button"
      aria-disabled={disabled}
      aria-label={`Set slider value to ${value}`}>
      <span className="slider-label__text">{children || value}</span>
    </div>
  )
}