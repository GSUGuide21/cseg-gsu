import {
  useState,
  useEffect,
  useRef
} from 'react'

export const useThrottle = <T>(value: T, delay: number = 500): T => {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastRan = useRef<number>(Date.now())

  useEffect(() => {
    const now = Date.now()

    if (now - lastRan.current >= delay) {
      lastRan.current = now
      setThrottledValue(value)
    } else {
      const timeout = setTimeout(() => {
        lastRan.current = Date.now()
        setThrottledValue(value)
      }, delay - (now - lastRan.current))

      return () => clearTimeout(timeout)
    }
  }, [value, delay])

  return throttledValue
}
