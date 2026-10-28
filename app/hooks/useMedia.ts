import {
  useState,
  useLayoutEffect,
  useEffect
} from 'react'

export interface UseMediaOptions {
  defaultValue?: boolean
  initializedWithValue?: boolean
}

const isServer = typeof window === 'undefined'
const useIsomorphicLayoutEffect = isServer ? useEffect : useLayoutEffect

export const useMedia = (query: string, {
  defaultValue = false,
  initializedWithValue = false
}: UseMediaOptions = {}): boolean => {
  const getMatches = (q: string): boolean => isServer ? defaultValue : window.matchMedia(q).matches
  const [matches, setMatches] = useState<boolean>(() => initializedWithValue ? getMatches(query) : defaultValue)
  const handleChange = (): void => setMatches(getMatches(query))

  useIsomorphicLayoutEffect(() => {
    const matchMedia = window.matchMedia(query)
    handleChange()

    matchMedia.addEventListener('change', handleChange)
    return () => matchMedia.removeEventListener('change', handleChange)
  }, [query])

  return matches
}