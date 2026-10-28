'use client'
import React, { 
  useState,
  useCallback 
} from 'react'
import { Slider } from '@/app-old/components/ui/Slider'

export type PageSliderProps = React.HTMLAttributes<HTMLElement> & {
  initialValue?: number // default: 50
  onValueChange?: (value: number) => void
}

export const PageSlider: React.FC<PageSliderProps> = ({ 
  initialValue = 50,
  onValueChange
}) => {
  const [currentValue, setCurrentValue] = useState(initialValue)

  const handleValueChange = useCallback((value: number) => {
    setCurrentValue(value)
    onValueChange?.(value)
    console.log('Slider value changed:', value)
  }, [onValueChange])

  return (
    <div className="slider-container">
      <Slider
        min={0}
        max={100}
        step={1}
        value={currentValue}
        disabled={false}
        orientation="horizontal"
        showValueType="value"
        showRange={true}
        showMarkers={true}
        onChange={value => handleValueChange(value as number)}
        onChangeComplete={(value) => console.log('Change complete:', value)}
        onPointerDown={(value) => console.log('Pointer down:', value)}
        onPointerUp={(value) => console.log('Pointer up:', value)}
        onPointerMove={(value) => console.log('Pointer move:', value)}
      />
    </div>
  )
}