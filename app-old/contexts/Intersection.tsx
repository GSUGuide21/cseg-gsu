'use client'
import React, {
  createContext, 
  useContext, 
  useState,
  useEffect,
  useRef
} from 'react'

import { useIntersection } from '../hooks'

export type IntersectionContextType = {
  isIntersecting: boolean
  hasHero: boolean
  hasHeader: boolean
  setHasHero: React.Dispatch<React.SetStateAction<boolean>>
  setHasHeader: React.Dispatch<React.SetStateAction<boolean>>
  navRef?: React.RefObject<HTMLElement | null>
  heroRef?: React.RefObject<HTMLElement | null>
  headerRef?: React.RefObject<HTMLElement | null>
}

export const IntersectionContext = createContext<IntersectionContextType | undefined>(void 0)
export const useIntersectionContext = () => useContext(IntersectionContext) as IntersectionContextType

export type IntersectionProviderProps = React.HTMLProps<HTMLElement> & {
  threshold?: number
  rootMargin?: string
}

export const IntersectionProvider: React.FC<IntersectionProviderProps> = ({
  children,
  threshold = 0.5,
  rootMargin = '0px',
  ...props
}) => {
  const [hasHero, setHasHero] = useState<boolean>(false)
  const [hasHeader, setHasHeader] = useState<boolean>(false)
  const navRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  const isIntersecting = useIntersection(heroRef, {
    threshold,
    rootMargin,
  })

  useEffect(() => {
    setHasHero(heroRef.current !== null || heroRef.current !== undefined)
    setHasHeader(headerRef.current !== null || headerRef.current !== undefined)

    return () => {
      setHasHero(false)
      setHasHeader(false)
    }
  }, [heroRef, headerRef])

  return (
    <IntersectionContext.Provider
      {...props}
      value={{
        isIntersecting,
        hasHero,
        hasHeader,
        setHasHero,
        setHasHeader,
        navRef,
        heroRef,
        headerRef,
      }}>
      {children}
    </IntersectionContext.Provider>
  )
}