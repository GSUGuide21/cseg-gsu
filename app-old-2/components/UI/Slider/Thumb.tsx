'use client'
import React from 'react'
import clsx from 'clsx'

import { useSliderContext } from './Context'
import type { SliderThumbProps } from './types'

export const SliderThumb: React.FC<SliderThumbProps> = ({
  className,
  ...props
}) => {
  const { min, max, value, disabled, orientation, showValueType, percentage } = useSliderContext()

  const property = orientation === 'horizontal' ? 'left' : 'top'
  const showPercentage = showValueType === 'percentage' || showValueType === true

  const propertyValue = percentage === 100 ?
    '100%' :
    (percentage === 0 ? '0' : `${percentage}%`)

  return (
    <div
      {...props}
      className={clsx('slider-thumb', className, {
        'slider-thumb--disabled': disabled,
        'slider-thumb--active': !disabled,
        'slider-thumb--horizontal': orientation === 'horizontal',
        'slider-thumb--vertical': orientation === 'vertical',
      })}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} (${percentage.toFixed(2)})%`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      style={{
        [property]: propertyValue,
      }}>
      {showValueType && (
        <span className="slider-thumb__value">
          {showPercentage ? `${percentage.toFixed(2)}%` : value}
        </span>
      )}
    </div>
  )
}