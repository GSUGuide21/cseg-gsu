'use client'
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  RefObject,
  useCallback
} from 'react'
import { clamp, getPercentage } from '@/app-old-2/lib/util'

import type {
  SliderContextType,
  SliderProviderProps
} from './types'

export const SliderContext = createContext<SliderContextType | undefined>(undefined)

export const useSliderContext = (): SliderContextType => {
  const context = useContext(SliderContext)
  if (!context) throw new Error('useSliderContext must be used within a SliderProvider')
  return context
}

export const SliderProvider: React.FC<SliderProviderProps> = ({
  min = 0,
  max = 100,
  step = 1,
  value = 0,
  disabled = false,
  orientation = 'horizontal',
  showValueType = false,
  showMarkers = false,
  markerLength = 10, // Number of markers to show
  showRangeLabels = false,
  onChange,
  onChangeComplete,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  onPointerLeave,
  onKeyDown,
  onBlur,
  onFocus,
  children
}) => {
  const [focused, setFocused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [currentValue, setCurrentValue] = useState(value)
  const sliderRef = useRef<HTMLElement>(null)

  // Handles change event
  const handleChange = useCallback((newValue: number) => {
    if (disabled) return
    setCurrentValue(newValue)
    onChange?.(newValue)
  }, [onChange, disabled])

  // Handles change complete event
  const handleChangeComplete = useCallback((newValue: number) => {
    if (disabled) return
    setCurrentValue(newValue)
    onChangeComplete?.(newValue)
  }, [onChangeComplete, disabled])

  // Handles pointer down event
  const handlePointerDown = useCallback((newValue: number) => {
    if (disabled) return
    setDragging(true)
    setFocused(true)
    onPointerDown?.(newValue)
  }, [onPointerDown, disabled])

  // Handles pointer up event
  const handlePointerUp = useCallback((newValue: number) => {
    if (disabled) return
    setDragging(false)
    setFocused(false)
    onPointerUp?.(newValue)
  }, [onPointerUp, disabled])

  // Handles pointer move event
  const handlePointerMove = useCallback((newValue: number) => {
    if (disabled || !dragging) return
    setCurrentValue(newValue)
    onPointerMove?.(newValue)
  }, [onPointerMove, dragging, disabled])

  // Handles pointer leave event
  const handlePointerLeave = useCallback((newValue: number) => {
    if (disabled || !dragging) return
    setDragging(false)
    setFocused(false)
    onPointerLeave?.(newValue)
  }, [onPointerLeave, dragging, disabled])

  // Increments the value based on step
  const incrementValueBy = useCallback((increment: number) => {
    if (disabled) return
    const newValue = currentValue + increment
    const clampedValue = clamp(newValue, min, max)
    setCurrentValue(clampedValue)
    onChange?.(clampedValue)
  }, [currentValue, min, max, onChange, disabled])

  // Decrements the value based on step
  const decrementValueBy = useCallback((decrement: number) => {
    if (disabled) return
    const newValue = currentValue - decrement
    const clampedValue = clamp(newValue, min, max)
    setCurrentValue(clampedValue)
    onChange?.(clampedValue)
  }, [currentValue, min, max, onChange, disabled])

  // Handles key down event
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        incrementValueBy(step)
        event.preventDefault()
        break
      case 'ArrowDown':
      case 'ArrowLeft':
        decrementValueBy(step)
        event.preventDefault()
        break
      case 'Home':
        setCurrentValue(min)
        if (onChange) onChange(min)
        event.preventDefault()
        break
      case 'End':
        setCurrentValue(max)
        if (onChange) onChange(max)
        event.preventDefault()
        break
      case 'PageUp':
        incrementValueBy(step * 10)
        event.preventDefault()
        break
      case 'PageDown':
        decrementValueBy(step * 10)
        event.preventDefault()
        break
      case 'Enter':
        if (onChangeComplete) onChangeComplete(currentValue)
        event.preventDefault()
        break
      case 'Escape':
        setFocused(false)
        setDragging(false)
        event.preventDefault()
        break
      case 'Tab':
        if (onKeyDown) onKeyDown(event)
        setFocused(false)
        setDragging(false)
        event.preventDefault()
        break
      case ' ':
        if (dragging) {
          setDragging(false)
          handlePointerUp(currentValue)
        } else {
          setFocused(true)
          setDragging(true)
          handlePointerDown(currentValue)
        }
        event.preventDefault()
        break
      case 'F5': // Refresh key
        event.preventDefault()
        break
      default:
        break
    }
    onKeyDown?.(event)
  }, 
  [disabled, setCurrentValue, onChange, min, max, step, incrementValueBy, currentValue, decrementValueBy, onChangeComplete, dragging, handlePointerDown, handlePointerUp, onKeyDown])

  // Handle focus and blur events
  const handleFocus = useCallback((event: React.FocusEvent) => {
    setFocused(true)
    onFocus?.(event)
  }, [onFocus])

  const handleBlur = useCallback((event: React.FocusEvent) => {
    setFocused(false)
    onBlur?.(event)
  }, [onBlur])

  // Ensure currentValue is within bounds
  useEffect(() => {
    if (currentValue < min || currentValue > max)
      setCurrentValue(clamp(currentValue, min, max))
  }, [currentValue, min, max])

  const percentage = getPercentage(currentValue, min, max)
  const clampedPercentage = clamp(percentage, 0, 100)

  useEffect(() => {
    if (!disabled) return
    setFocused(false)
    setDragging(false)
  }, [disabled])

  const contextValue = useMemo(() => ({
    min,
    max,
    step,
    disabled,
    value: currentValue,
    setValue: setCurrentValue,
    focused,
    setFocused,
    dragging,
    setDragging,
    percentage: clampedPercentage,
    orientation,
    showValueType,
    showMarkers,
    markerLength,
    showRangeLabels,
    sliderRef: sliderRef as RefObject<HTMLElement>,
    handleChange,
    handleChangeComplete,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    handlePointerLeave,
    handleKeyDown,
    handleFocus,
    handleBlur
  }), 
  [min, max, step, disabled, currentValue, focused, dragging, clampedPercentage, orientation, showValueType, showMarkers, markerLength, showRangeLabels, handleChange, handleChangeComplete, handlePointerDown, handlePointerUp, handlePointerMove, handlePointerLeave, handleKeyDown, handleFocus, handleBlur, setCurrentValue, setFocused, setDragging, sliderRef])

  return (
    <SliderContext.Provider value={contextValue}>
      {children}
    </SliderContext.Provider>
  )
}