import {
  useCallback,
  useMemo,
  useRef,
  useEffect
} from 'react'

/**
 * A custom hook that defers the execution of a callback function until the next render cycle.
 * This is useful for avoiding immediate execution of functions that may cause side effects
 * or when you want to ensure that the function runs after the current render is complete.
 * @param callback - The function to be deferred.
 * @param dependencies - An array of dependencies that will trigger a re-creation of the deferred function.
 * @returns A memoized function that, when called, will execute the original callback after the
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useDefer = <T extends (...args: any[]) => void>(callback: T, dependencies: unknown[] = []): T => {
  const callbackRef = useRef<T>(callback)

  useEffect(() => {
    callbackRef.current = callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, ...dependencies])

  const deferredCallback = useCallback((...args: Parameters<T>) => {
    requestAnimationFrame(() => {
      if (!callbackRef.current) return
      callbackRef.current(...args)
    })
  }, [callbackRef])

  return useMemo(() => deferredCallback as T, [deferredCallback])
}