import {
  useEffect,
  useRef,
  useCallback
} from 'react'

/**
 * A custom hook that returns a throttled version of the provided callback function.
 * The throttled function will limit the execution of the callback to once every specified delay time.
 *
 * @param callback - The callback function to throttle.
 * @param dependencies - An array of dependencies that will trigger a re-creation of the throttled function.
 * @param delay - The delay time in milliseconds between consecutive invocations of the callback.
 * @return A throttled version of the provided callback function.
 **/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useThrottledCallback = <T extends (...args: any[]) => void>(callback: T, dependencies: unknown[], delay: number): T => {
  const callbackRef = useRef<T>(callback)
  const lastRan = useRef<number>(Date.now())

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now()

    if (now - lastRan.current >= delay) {
      lastRan.current = now
      callbackRef.current(...args)
    } else {
      const delta = delay - (now - lastRan.current)
      const timeout = setTimeout(() => {
        lastRan.current = Date.now()
        callbackRef.current(...args)
      }, delta)

      return () => clearTimeout(timeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...dependencies])

  return throttledCallback as T
}