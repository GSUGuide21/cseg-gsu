'use client'
import React, {
  useEffect,
  useRef
} from 'react'
import clsx from 'clsx'

import { useSliderContext } from './Context'
import type { SliderTrackProps } from './types'
import { SliderMarkers } from './Markers'

export const SliderTrack: React.FC<SliderTrackProps> = ({
  className,
  useCanvas = false,
  renderCanvas,
  ...props
}) => {
  const { min, max, step, disabled, percentage, orientation } = useSliderContext()
  const property = orientation === 'horizontal' ? 'width' : 'height'
  const propertyValue = percentage === 100 ? '100%' :
    (percentage <= 0 ? '0' : `${percentage}%`)

  const canvasWidth = orientation === 'horizontal' ? 100 : 10
  const canvasHeight = orientation === 'horizontal' ? 10 : 100

  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!useCanvas || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set the fill style based on the orientation
    renderCanvas?.({ context: ctx, percentage, orientation, disabled, min, max, step })
    
    return () => ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [percentage, orientation, useCanvas, disabled, renderCanvas, min, max, step])

  return (
    <div
      {...props}
      className={clsx('slider-track', className, {
        'slider-track--disabled': disabled,
        'slider-track--active': !disabled,
        'slider-track--horizontal': orientation === 'horizontal',
        'slider-track--vertical': orientation === 'vertical'
      })}>
      <div className='slider-track__progress'>
        {useCanvas ?
          <canvas
            ref={canvasRef}
            className='slider-track__progress-inner slider-track__canvas'
            width={canvasWidth}
            height={canvasHeight} /> :
          <div 
            className='slider-track__progress-inner slider-track__bar'
            style={{ [property]: propertyValue }}></div>}
      </div>
      <div className='slider-track__markers'>
        <SliderMarkers />
      </div>
    </div>
  )
}
