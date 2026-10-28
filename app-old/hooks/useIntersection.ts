import React, { useEffect, useState } from 'react'

export const useIntersection = <T extends HTMLElement | null>(
  ref: React.RefObject<T>,
  options: IntersectionObserverInit = {}
): boolean => {
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsIntersecting(entry.isIntersecting), options)
    const element = ref.current
    if (element) observer.observe(element)
    return () => {
      if (element) observer.unobserve(element)
    }
  }, [ref, options])

  return isIntersecting
}