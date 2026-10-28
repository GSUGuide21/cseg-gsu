'use client'
import React from 'react'
import clsx from 'clsx'
import { SliderValueType } from '.'

export type SliderThumbProps = React.HTMLAttributes<HTMLElement> & {
  min: number // minimum value of the slider
  max: number // maximum value of the slider
  value: number // current value of the slider
  percentage: number // percentage of the slider (0-100)
  orientation?: 'horizontal' | 'vertical' // orientation of the slider (default: 'horizontal')
  disabled?: boolean // whether the slider is disabled (default: false)
  showValueType?: SliderValueType // type of value to show (default: false)
}

export const SliderThumb: React.FC<SliderThumbProps> = ({
  min,
  max,
  value,
  percentage,
  disabled = false,
  showValueType = false,
  orientation = 'horizontal',
  className,
  ...props
}) => {
  const property = orientation === 'horizontal' ? 'left' : 'top'
  const showPercentage = showValueType === 'percentage' || showValueType === true

  const propertyValue = percentage === 100 ? 
    '100%' : 
    (percentage === 0 ? '0' : `${percentage}%`)

  return (
    <span
      {...props}
      className={clsx('slider-thumb', className, {
        'slider-thumb--disabled': disabled,
        'slider-thumb--active': !disabled,
      })}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} (${percentage}%)`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      style={{
        [property]: propertyValue,
      }}>
      {showValueType && (
        <span className="slider-thumb__value">
          {showPercentage ? `${percentage.toFixed(0)}%` : value}
        </span>
      )}
    </span>
  )
}