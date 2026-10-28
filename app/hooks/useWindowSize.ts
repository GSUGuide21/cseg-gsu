import {
  useState,
  useLayoutEffect
} from 'react'

export interface Dimensions {
  width: number
  height: number
}

export const useWindowSize = () => {
  const isClient = typeof window === 'object'

  const getSize = () => ({
    width: isClient ? window.innerWidth : 0,
    height: isClient ? window.innerHeight : 0
  })

  const [size, setSize] = useState<Dimensions>(getSize())

  useLayoutEffect(() => {
    const handleResize = () => setSize({
      width: window.innerWidth,
      height: window.innerHeight
    })

    handleResize()
    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [isClient])

  return size
}