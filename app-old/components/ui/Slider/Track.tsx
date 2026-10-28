'use client'
import React from 'react'
import clsx from 'clsx'

export type SliderTrackProps = React.HTMLAttributes<HTMLElement> & {
  min: number
  max: number
  step: number
  markerStepPercent?: number // default: 10
  percentage: number
  disabled?: boolean // default: false
  showMarkers?: boolean // default: false
  orientation?: 'horizontal' | 'vertical'
}

export const SliderTrack: React.FC<SliderTrackProps> = ({
  min,
  max,
  step,
  markerStepPercent = 10,
  percentage,
  disabled = false,
  showMarkers = false,
  orientation = 'vertical',
  className,
  ...props 
}) => {
  const property = orientation === 'horizontal' ? 'width' : 'height'

  // Generate markers based on the percentage
  const markers = Array.from(
    { length: Math.floor((max - min) / (step * markerStepPercent)) + 1},
    (_, i) => {
      const markerValue = min + i * (step * markerStepPercent)
      const markerPercentage = ((markerValue - min) / (max - min)) * 100
      const markerProperty = orientation === 'horizontal' ? 'left' : 'top'

      return (
        <div 
          key={i} 
          className="slider-track__marker" 
          style={{ [markerProperty]: `${markerPercentage}%` }}>
        </div>
      )
    }
  )

  // Ensure percentage is between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage))
  const propertyValue = clampedPercentage === 100 ? 
    '100%' : 
    (clampedPercentage <= 0 ? '0' : `${clampedPercentage}%`)
  

  return (
    <div
      {...props}
      className={clsx('slider-track', className, {
        'slider-track--disabled': disabled,
        'slider-track--active': !disabled,
      })}>
      <div 
        className="slider-track__progress"
        style={{ [property]: propertyValue }}></div>
      {showMarkers && <div className="slider-track__markers">
        {markers}
      </div>}
    </div>
  )
}