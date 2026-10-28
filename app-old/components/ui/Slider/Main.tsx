'use client'
import React, {
  useEffect,
  useRef,
  useCallback
} from 'react'
import clsx from 'clsx'
import { clamp } from '@/app-old/lib/util'
import { SliderTrack } from './Track'
import { SliderThumb } from './Thumb'

export type SliderOrientation = 'horizontal' | 'vertical'
export type SliderValueType = 'percentage' | 'value' | boolean

export type SliderMainProps = React.HTMLAttributes<HTMLElement> & {
  ref: React.RefObject<HTMLElement>
  min?: number // default: 0
  max?: number // default: 100
  step?: number // default: 1
  markerStepPercent?: number // default: 10
  showMarkers?: boolean // default: false
  value?: number // default: 0
  setValue: React.Dispatch<React.SetStateAction<number>>
  focused?: boolean // default: false
  setFocused: React.Dispatch<React.SetStateAction<boolean>>
  dragging?: boolean // default: false
  setDragging: React.Dispatch<React.SetStateAction<boolean>>
  percentage?: number // default: 0
  disabled?: boolean // default: false
  orientation?: SliderOrientation // default: 'horizontal'
  showValueType?: SliderValueType // default: false
  onChange?: (value: number) => void
  onChangeComplete?: (value: number) => void
  onPointerDown?: (value: number) => void
  onPointerUp?: (value: number) => void
  onPointerMove?: (value: number) => void
  onPointerLeave?: (value: number) => void
}

export const SliderMain: React.FC<SliderMainProps> = ({
  min = 0,
  max = 100,
  step = 1,
  value = 0,
  percentage = 0,
  focused = false,
  dragging = false,
  disabled = false,
  orientation = 'horizontal',
  showValueType = false,
  markerStepPercent = 10,
  showMarkers = false,
  className,
  onChange,
  onChangeComplete,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  setValue,
  setFocused,
  setDragging,
  ...props
}) => {
  const sliderRef = useRef<HTMLElement>(null)

  const clampedPercentage = Math.max(0, Math.min(100, percentage))

  const updateValue = useCallback((event: React.PointerEvent) => {
    if (!sliderRef.current || disabled) return

    const rect = sliderRef.current.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const offsetY = event.clientY - rect.top

    const pointerPosition = orientation === 'horizontal' ? offsetX : offsetY
    const divisor = orientation === 'horizontal' ? rect.width : rect.height
    const percentage = clamp(pointerPosition / divisor, 0, 1)
    console.log('percentage', percentage)
    const newValue = Math.round(min + percentage * (max - min) / step) * step
    setValue(newValue)
    if (onChange) onChange(newValue)
  }, [sliderRef, min, max, step, disabled, orientation, onChange, setValue])

  // Handle pointer events
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (disabled) return
    setDragging(true)
    updateValue(event)
    if (onPointerDown) onPointerDown(value)
  }, [disabled, setDragging, updateValue, onPointerDown, value])

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!dragging) return
    updateValue(event)
    if (onPointerMove) onPointerMove(value)
  }, [dragging, updateValue, onPointerMove, value])

  const handlePointerUp = useCallback(() => {
    if (!dragging) return
    setDragging(false)
    if (onPointerUp) onPointerUp(value)
    if (onChangeComplete) onChangeComplete(value)
  }, [dragging, setDragging, onPointerUp, onChangeComplete, value])

  const handlePointerLeave = useCallback(() => {
    if (dragging) {
      setDragging(false)
      if (onPointerUp) onPointerUp(value)
    }
  }, [dragging, setDragging, onPointerUp, value])
  
  // Handle focus and blur events
  const handleFocus = useCallback(() => {
    setFocused(true)
  }, [setFocused])

  const handleBlur = useCallback(() => {
    setFocused(false)
  }, [setFocused])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled || !focused) return
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        setValue((prev) => clamp(prev - step, min, max))
        if (onChange) onChange(value)
        break
      case 'ArrowRight':
      case 'ArrowUp':
        setValue((prev) => clamp(prev + step, min, max))
        if (onChange) onChange(value)
        break
      case 'Home':
        setValue(min)
        if (onChange) onChange(min)
        break
      case 'End':
        setValue(max)
        if (onChange) onChange(max)
        break
      case 'PageUp':
        setValue((prev) => clamp(prev + step * 10, min, max))
        if (onChange) onChange(value)
        break
      case 'PageDown':
        setValue((prev) => clamp(prev - step * 10, min, max))
        if (onChange) onChange(value)
        break
      case 'Enter':
        setDragging(false)
        if (onPointerUp) onPointerUp(value)
        if (onChangeComplete) onChangeComplete(value)
        break
      case 'Escape':
        setDragging(false)
        if (onPointerUp) onPointerUp(value)
        break
    }
  }, [disabled, setDragging, step, min, max, focused, onChange, value, onChangeComplete, onPointerUp, setValue])

  useEffect(() => {
    if (disabled) setDragging(false)
  }, [disabled, setDragging])

  return (
    <section
      {...props}
      ref={sliderRef}
      className={clsx('slider-main', className)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}>
      <SliderTrack
        min={min}
        max={max}
        step={step}
        percentage={clampedPercentage}
        disabled={disabled}
        orientation={orientation}
        showMarkers={showMarkers}
        markerStepPercent={markerStepPercent} />
      <SliderThumb
        min={min}
        max={max}
        value={value}
        percentage={clampedPercentage}
        disabled={disabled}
        showValueType={showValueType}
        orientation={orientation} />
    </section>
  )
}