'use client'
import React, { useMemo } from 'react'
import clsx from 'clsx'

import { SliderMarker } from './Marker'
import { useSliderContext } from './Context'
import { SliderMarkersProps } from './types'

export const SliderMarkers: React.FC<SliderMarkersProps> = ({
  className,
  ...props
}) => {
  const { 
    min, 
    max, 
    markerLength = 10, 
    showMarkers 
  } = useSliderContext()

  const markerValues = useMemo(
    () => 
      Array.from(
        { length: markerLength },
        (_, index) => index
      )
      .filter(index => index !== 0 && index !== markerLength - 1)
      .map(index => (min + (index * (max - min) / (markerLength - 1)))),
    [markerLength, min, max]
  )

  const markers = useMemo(
    () => markerValues.map((markerValue, index) => (
      <SliderMarker
        key={`slider-marker-${index}`}
        value={markerValue}
        className="slider-marker" />
    )),
    [markerValues]
  )

  return showMarkers && (
    <nav
      {...props}
      role="presentation"
      className={clsx('slider-markers', className)}>
      {markers}
    </nav>
  )
}