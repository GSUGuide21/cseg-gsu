'use client'
import React, { 
  createContext, 
  useContext, 
  useState,
  useEffect 
} from 'react'
import { useMedia } from '../hooks'

import {
  MIN_DESKTOP_WIDTH,
  MIN_TABLET_WIDTH,
  MAX_TABLET_WIDTH,
  MAX_MOBILE_WIDTH,
} from '../lib'

export type Breakpoint = 'desktop' | 'tablet' | 'mobile'

export type BreakpointContextType = {
  isDesktop: boolean
  isTablet: boolean
  isMobile: boolean
  breakpoint: Breakpoint
}

export const BreakpointContext = createContext<BreakpointContextType | undefined>(void 0)

export const useBreakpoint = () => {
  const context = useContext(BreakpointContext)
  if (!context) throw new Error('useBreakpoint must be used within a BreakpointProvider')
  return context
}

export type BreakpointProviderProps = React.HTMLProps<HTMLElement>

export const BreakpointProvider: React.FC<BreakpointProviderProps> = ({
  children,
  ...props
}) => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop')
  const isMobile = useMedia(`(width <= ${MAX_MOBILE_WIDTH}px)`)
  const isTablet = useMedia(`(width >= ${MIN_TABLET_WIDTH}px) and (width <= ${MAX_TABLET_WIDTH}px)`)
  const isDesktop = useMedia(`(width >= ${MIN_DESKTOP_WIDTH}px)`)

  useEffect(() => {
    if (isMobile) setBreakpoint('mobile')
    else if (isTablet) setBreakpoint('tablet')
    else setBreakpoint('desktop')
  }, [isMobile, isTablet, isDesktop])

  return (
    <BreakpointContext.Provider
      {...props}
      value={{
        isDesktop,
        isTablet,
        isMobile,
        breakpoint,
      }}>
      {children}
    </BreakpointContext.Provider>
  )
}