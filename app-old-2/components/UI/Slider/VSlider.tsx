'use client'
import React, { useCallback } from 'react'
import clsx from 'clsx'
import { clamp } from '@/app-old-2/lib/util'
import { SliderTrack } from './Track'
import { SliderThumb } from './Thumb'

import { useSliderContext } from './Context'
import { VSliderProps } from './types'

export const VSlider: React.FC<VSliderProps> = ({
  className,
  trackClassName,
  thumbClassName,
  renderCanvas,
  useCanvas = false,
  ...props
}) => {
  const { 
    value,
    min,
    max,
    step,
    sliderRef,
    focused,
    disabled,
    dragging, 
    handleChange,
    handleChangeComplete,
    handlePointerDown: contextHandlePointerDown,
    handlePointerUp: contextHandlePointerUp,
    handlePointerMove: contextHandlePointerMove,
    handlePointerLeave: contextHandlePointerLeave,
    handleKeyDown,
    handleFocus,
    handleBlur
  } = useSliderContext()

  const updateValue = useCallback((event: React.PointerEvent) => {
    if (!sliderRef?.current || disabled) return value

    const rect = sliderRef.current.getBoundingClientRect()
    const offset = event.clientX - rect.left
    
    const newPercentage = clamp(offset / rect.width, 0, 1)
    const newValue = Math.round(min + (newPercentage * (max - min)) / step) * step
    const clampedValue = clamp(newValue, min, max)

    handleChange?.(clampedValue)
    return clampedValue
  }, [sliderRef, handleChange, value, min, max, step, disabled])

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (disabled) return
    const newValue = updateValue(event)
    contextHandlePointerDown?.(newValue)
  }, [disabled, updateValue, contextHandlePointerDown])

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!dragging) return
    const newValue = updateValue(event)
    contextHandlePointerMove?.(newValue)
  }, [dragging, updateValue, contextHandlePointerMove])

  const handlePointerUp = useCallback(() => {
    if (!dragging) return
    contextHandlePointerUp?.(value)
    handleChangeComplete?.(value)
  }, [dragging, contextHandlePointerUp, value, handleChangeComplete])

  const handlePointerLeave = useCallback(() => {
    if (dragging) contextHandlePointerLeave?.(value)
  }, [dragging, contextHandlePointerLeave, value])

  return (
    <section
      {...props}
      ref={sliderRef}
      className={clsx('slider-container slider--horizontal', className, {
        'slider--disabled': disabled,
        'slider--focused': focused,
        'slider--dragging': dragging,
      })}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onFocus={handleFocus}>
      <SliderTrack
        className={trackClassName}
        useCanvas={useCanvas}
        renderCanvas={renderCanvas} />
      <SliderThumb className={thumbClassName} />
    </section>
  )
}