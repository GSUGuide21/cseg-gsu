import React, {
  type Dispatch, 
  type SetStateAction, 
  type RefObject,
  type ReactNode
} from 'react'

// Slider orientation
export type SliderOrientation = 'horizontal' | 'vertical'

// Slider value
export type SliderValueType = 'percentage' | 'value' | boolean

// Slider context properties
export interface SliderContextType {
  min: number
  max: number
  step: number
  disabled: boolean
  value: number
  setValue: Dispatch<SetStateAction<number>>
  focused: boolean
  setFocused: Dispatch<SetStateAction<boolean>>
  dragging: boolean
  setDragging: Dispatch<SetStateAction<boolean>>
  percentage: number
  showMarkers?: boolean
  markerLength?: number
  showRangeLabels?: boolean
  orientation: SliderOrientation
  showValueType: SliderValueType
  sliderRef?: RefObject<HTMLElement>
  handleChange?: (value: number) => void
  handleChangeComplete?: (value: number) => void
  handlePointerDown?: (value: number) => void
  handlePointerUp?: (value: number) => void
  handlePointerMove?: (value: number) => void
  handlePointerLeave?: (value: number) => void
  handleKeyDown?: (event: React.KeyboardEvent) => void
  handleFocus?: (event: React.FocusEvent) => void
  handleBlur?: (event: React.FocusEvent) => void
}

// Slider provider props
export interface SliderProviderProps {
  min?: number // default: 0
  max?: number // default: 100
  step?: number // default: 1
  value?: number // default: 0
  disabled?: boolean // default: false
  showMarkers?: boolean // default: false
  markerLength?: number // default: 10
  showRangeLabels?: boolean // default: false
  orientation?: SliderOrientation // default: 'horizontal'
  showValueType?: SliderValueType // default: false
  onChange?: (value: number) => void
  onChangeComplete?: (value: number) => void
  onPointerDown?: (value: number) => void
  onPointerUp?: (value: number) => void
  onPointerMove?: (value: number) => void
  onPointerLeave?: (value: number) => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  onBlur?: (event: React.FocusEvent) => void
  onFocus?: (event: React.FocusEvent) => void
  children: ReactNode
}

// Slider props
export type SliderProps = Omit<SliderProviderProps, 'children'> & React.HTMLAttributes<HTMLElement> & {
  containerClassName?: string // Additional class for the slider container
}

// Horizontal slider props
export type HSliderProps = React.HTMLAttributes<HTMLElement> & {
  trackClassName?: string // Additional class for the track
  thumbClassName?: string // Additional class for the thumb
  markersClassName?: string // Additional class for the markers
  labelClassName?: string // Additional class for the label
  useCanvas?: boolean // default: false
  renderCanvas?: (options: RenderCanvasOptions) => void // Custom canvas rendering function
}

// Vertical slider props
export type VSliderProps = React.HTMLAttributes<HTMLElement> & {
  trackClassName?: string // Additional class for the track
  thumbClassName?: string // Additional class for the thumb
  markersClassName?: string // Additional class for the markers
  labelClassName?: string // Additional class for the label
  useCanvas?: boolean // default: false
  renderCanvas?: (options: RenderCanvasOptions) => void // Custom canvas rendering function
}

// Slider label props
export interface SliderLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  percentage?: number
  showValueType?: SliderValueType
  orientation?: SliderOrientation
}

// Slider track props
export interface RenderCanvasOptions {
  context: CanvasRenderingContext2D
  percentage: number
  min: number
  max: number
  step: number
  orientation: SliderOrientation
  disabled: boolean
}

export type SliderTrackProps = React.HTMLAttributes<HTMLElement> & {
  useCanvas?: boolean // default: false
  renderCanvas?: (options: RenderCanvasOptions) => void
}


// Slider thumb props
export type SliderThumbProps = React.HTMLAttributes<HTMLElement>

// Slider markers props
export type SliderMarkersProps = React.HTMLAttributes<HTMLElement>

// Slider marker props
export type SliderMarkerProps = React.HTMLAttributes<HTMLElement> & {
  value: number
}