'use client'
import React, { useMemo } from 'react'
import clsx from 'clsx'

import { clamp, getPercentage } from '@/app-old-2/lib/util'
import { useSliderContext } from './Context'
import { SliderLabel } from './Label'
import { SliderMarkerProps } from './types'

export const SliderMarker: React.FC<SliderMarkerProps> = ({
  className,
  value,
  ...props
}) => {
  const { 
    max, 
    min, 
    orientation, 
    markerLength = 1
  } = useSliderContext()

  const property = orientation === 'horizontal' ? 'left' : 'top'

  const markerStyle = useMemo(() => {
    const clampedValue = clamp(value, min, max)
    const clampedPercentage = getPercentage(clampedValue, min, max)

    return {
      [property]: `${clampedPercentage}%`,
      width: orientation === 'horizontal' ? `${100 / markerLength}%` : 'auto',
      height: orientation === 'vertical' ? `${100 / markerLength}%` : 'auto',
    }
  }, [value, min, max, orientation, markerLength, property])

  return (
    <div
      {...props}
      className={clsx('slider-marker', className, {
        'slider-marker--horizontal': orientation === 'horizontal',
        'slider-marker--vertical': orientation === 'vertical',
      })}
      role="presentation"
      style={markerStyle}>
      <SliderLabel
        className="slider-marker__label"
        value={clamp(value, min, max)}
        orientation={orientation} />
    </div>
  )
}