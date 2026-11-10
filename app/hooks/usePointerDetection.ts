import React, { 
  useState, 
  useEffect,
  useCallback
} from 'react'

type PointerDetectionPosition = 
  | 'top' 
  | 'bottom' 
  | 'left' 
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

interface PointerDetectionOptions {
  threshold?: number // Threshold for the window edge zone
  buffer?: number // Buffer zone around the element for easier detection
  position?: PointerDetectionPosition // Position of the window edge zone
  onHover?: (isHovered: boolean) => void // Callback when the pointer is hovered
  onHoverChange?: (isHovered: boolean) => void // Callback when the pointer changes hovered state
  preventDetection?: boolean | ((e: PointerEvent) => boolean) // Function to prevent detection
}

export const usePointerDetection = <T extends Element>(ref: React.RefObject<T | null>, options: PointerDetectionOptions = {}) => {
  const { 
    threshold = 20, 
    buffer = 10,
    position = 'top',
    onHover, 
    onHoverChange,
    preventDetection
  } = options

  const [isHovered, setIsHovered] = useState(false)

  const shouldPreventDetection = useCallback((e: PointerEvent) => {
    if (typeof preventDetection === 'function') return preventDetection(e)
    return preventDetection === true
  }, [preventDetection])

  const detectPositionFromWindow = useCallback((e: PointerEvent) => {
    if (typeof window === 'undefined') return false
    
    const detectionPrevented = shouldPreventDetection(e)
    if (detectionPrevented) return false

    const { innerWidth, innerHeight } = window
    const safeThreshold = Math.min(threshold, Math.min(innerWidth, innerHeight) / 2)

    const positions = new Map<PointerDetectionPosition, boolean>([
      ['top', e.clientY >= 0 && e.clientY <= safeThreshold],
      ['bottom', e.clientY >= innerHeight - safeThreshold && e.clientY <= innerHeight],
      ['left', e.clientX >= 0 && e.clientX <= safeThreshold],
      ['right', e.clientX >= innerWidth - safeThreshold && e.clientX <= innerWidth],
      ['top-left', (e.clientX >= 0 && e.clientX <= safeThreshold) && (e.clientY >= 0 && e.clientY <= safeThreshold)],
      ['top-right', (e.clientX >= innerWidth - safeThreshold && e.clientX <= innerWidth) && (e.clientY >= 0 && e.clientY <= safeThreshold)],
      ['bottom-left', (e.clientX >= 0 && e.clientX <= safeThreshold) && (e.clientY >= innerHeight - safeThreshold && e.clientY <= innerHeight)],
      ['bottom-right', (e.clientX >= innerWidth - safeThreshold && e.clientX <= innerWidth) && (e.clientY >= innerHeight - safeThreshold && e.clientY <= innerHeight)]
    ])

    return positions.get(position) ?? false
  }, [threshold, position, shouldPreventDetection])

  const detectPositionFromElement = useCallback((e: PointerEvent) => {
    if (!ref.current) return false

    const detectionPrevented = shouldPreventDetection(e)
    if (detectionPrevented) return false

    const rect = ref.current.getBoundingClientRect()

    const isOverElement = 
      e.clientX >= rect.left - buffer &&
      e.clientX <= rect.right + buffer &&
      e.clientY >= rect.top - buffer &&
      e.clientY <= rect.bottom + buffer

    return isOverElement
  }, [ref, shouldPreventDetection, buffer])

  const detectPosition = useCallback((e: PointerEvent) => {
    const inWindowZone = detectPositionFromWindow(e)
    const overElement = ref.current ? detectPositionFromElement(e) : false

    return isHovered ? overElement : inWindowZone
  }, [detectPositionFromWindow, detectPositionFromElement, ref, isHovered])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const inBounds = detectPosition(e)
    setIsHovered(inBounds)
    onHover?.(inBounds)
    onHoverChange?.(inBounds)
  }, [detectPosition, onHover, onHoverChange])
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [handlePointerMove])

  return { isHovered }
}