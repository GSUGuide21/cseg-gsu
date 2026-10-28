import {
  useEffect,
  useCallback,
  useRef
} from 'react'

/**
 * A custom hook that returns a debounced version of the provided callback function.
 * The debounced function will delay the execution of the callback until after
 * the specified delay time has passed since the last time it was invoked.
 *
 * @param callback - The callback function to debounce.
 * @param dependencies - An array of dependencies that will trigger a re-creation of the debounced function.
 * @param delay - The delay time in milliseconds before invoking the callback.
 * @returns A debounced version of the provided callback function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useDebouncedCallback = <T extends (...args: any[]) => void>(callback: T, dependencies: unknown[] = [], delay: number): T => {
  const callbackRef = useRef<T>(callback)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      callbackRef.current(...args)
      timerRef.current = null
    }, delay)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...dependencies])

  return debouncedCallback as T
}