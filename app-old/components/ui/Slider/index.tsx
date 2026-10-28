'use client'
import React, {
  useState,
  useEffect,
  useRef,
  useCallback
} from 'react'
import clsx from 'clsx'
import { clamp } from '@/app-old/lib/util'
import { SliderMain } from './Main'
import './index.scss'

export type SliderOrientation = 'horizontal' | 'vertical'
export type SliderValueType = 'percentage' | 'value' | boolean

export type SliderProps = React.HTMLAttributes<HTMLElement> & {
  min?: number // default: 0
  max?: number // default: 100
  step?: number // default: 1
  markerStepPercent?: number // default: 10
  showMarkers?: boolean // default: false
  value?: number // default: 0
  disabled?: boolean // default: false
  orientation?: SliderOrientation // default: 'horizontal'
  showRange?: boolean // default: false 
  showValueType?: SliderValueType // default: false
  onChange?: (value: number) => void
  onChangeComplete?: (value: number) => void
  onPointerDown?: (value: number) => void
  onPointerUp?: (value: number) => void
  onPointerMove?: (value: number) => void
  onPointerLeave?: (value: number) => void
}

export const Slider: React.FC<SliderProps> = ({
  min = 0,
  max = 100,
  step = 1,
  value = 0,
  disabled = false,
  orientation = 'horizontal',
  showRange = false,
  showValueType = false,
  markerStepPercent = 10,
  showMarkers = false,
  onChange,
  onChangeComplete,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  onPointerLeave,
  className,
  ...props
}) => {
  const [focused, setFocused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [currentValue, setCurrentValue] = useState(value)
  const sliderRef = useRef<HTMLElement>(null)

  const getPercentage = useCallback((value: number) => {
    return ((value - min) / (max - min)) * 100
  }, [min, max])

  const handleRangeClick = useCallback((event: React.MouseEvent) => {
    if (disabled) return
    const range = event.currentTarget
    if (!range) return
    const rangeValue = parseInt(range.textContent || '0')
    console.log('Range value:', rangeValue)
    const isPercent = showValueType === 'percentage'
    const newValue = isPercent ? 
      (rangeValue / 100) * (max - min) + min : 
      rangeValue
    setCurrentValue(newValue)
    if (onChange) onChange(newValue)
  }, [disabled, min, max, onChange, showValueType])

  useEffect(() => {
    if (disabled) setDragging(false)
  }, [disabled])

  const percentage = getPercentage(currentValue)
  const clampedPercentage = clamp(percentage, 0, 100)

  return (
    <div
      {...props}
      className={clsx('field-container slider', {
        'slider--focused': focused,
        'slider--is-percent': showValueType === 'percentage',
        'slider--active': dragging,
        'slider--disabled': disabled,
        'slider--horizontal': orientation === 'horizontal',
        'slider--vertical': orientation === 'vertical',
      }, className)}
      tabIndex={disabled ? -1 : 0}>
      {showRange && (
        <div 
          className="slider-range slider-min"
          onClick={handleRangeClick}>
          <span className="slider-range__label">{min}</span>
        </div>)}
      <SliderMain
        ref={sliderRef as React.RefObject<HTMLElement>}
        min={min}
        max={max}
        step={step}
        focused={focused}
        setFocused={setFocused}
        dragging={dragging}
        setDragging={setDragging}
        value={currentValue}
        setValue={setCurrentValue}
        percentage={clampedPercentage}
        disabled={disabled}
        orientation={orientation}
        showMarkers={showMarkers}
        showValueType={showValueType}
        markerStepPercent={markerStepPercent}
        onChange={onChange}
        onChangeComplete={onChangeComplete}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave} />
      {showRange && (
        <div
          className="slider-range slider-max"
          onClick={handleRangeClick}>
          <span className="slider-range__label">{max}</span>
        </div>)}
    </div>
  )
}

export { SliderThumb } from './Thumb'
export { SliderTrack } from './Track'
export { SliderMain }