'use client'
import React from 'react'
import { HSlider } from './HSlider'
import { VSlider } from './VSlider'
import { Slider as MainSlider } from './Main'
import { SliderProps } from './types'

export const Slider: React.FC<SliderProps> = ({
  orientation = 'horizontal',
  className,
  containerClassName,
  ...props
}) => {
  return (
    <MainSlider
      {...props}
      className={className}>
      {orientation === 'horizontal' ? (
        <HSlider className={containerClassName} />
      ) : (
        <VSlider className={containerClassName} />
      )}  
    </MainSlider>
  )
}

export { HSlider } from './HSlider'
export { VSlider } from './VSlider'
export { Slider as MainSlider } from './Main'
export { SliderThumb } from './Thumb'
export { SliderMarker } from './Marker'
export { SliderMarkers } from './Markers'
export { SliderLabel } from './Label'
export { SliderContext, useSliderContext } from './Context'
export type {
  SliderProps,
  SliderThumbProps,
  SliderMarkerProps,
  SliderMarkersProps,
  SliderLabelProps,
} from './types'