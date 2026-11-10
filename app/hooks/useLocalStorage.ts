import {
  useSyncExternalStore,
  useCallback,
  useMemo
} from 'react'

const dispatchStorageEvent = (key: string, newValue: string | null) => {
  const event = new StorageEvent('storage', {
    key,
    newValue,
    storageArea: localStorage
  })
  window.dispatchEvent(event)
}

const setLocalStorageItem = <T>(key: string, value: T): void => {
  const stringifiedValue = JSON.stringify(value)
  window.localStorage.setItem(key, stringifiedValue)
  dispatchStorageEvent(key, stringifiedValue)
}

const removeLocalStorageItem = (key: string): void => {
  window.localStorage.removeItem(key)
  dispatchStorageEvent(key, null)
}

const getLocalStorageItem = (key: string) => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Storage blocked (private mode, site data off): as if nothing's saved
    return null
  }
}

const useLocalStorageSubscribe = (callback: (e: StorageEvent) => void) => {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

/** The server has no storage: it renders the initial value, and the browser catches up after */
const getLocalStorageServerSnapshot = () => null

/**
 * A value kept in localStorage as JSON, shared by every component (and tab) using the same
 * key. Gives back the parsed value, or `initialValue` when nothing's saved (or it isn't
 * JSON); setting null or undefined removes it.
 */
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  // The saved text itself, so the snapshot only changes when what's saved does
  const raw = useSyncExternalStore(
    useLocalStorageSubscribe,
    () => getLocalStorageItem(key),
    getLocalStorageServerSnapshot
  )

  const value = useMemo<T>(() => {
    if (raw === null) return initialValue
    try {
      return JSON.parse(raw) as T
    } catch {
      return initialValue
    }
    // initialValue is only the fallback; a new object each render shouldn't re-read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw])

  const setState = useCallback((v: T | ((current: T) => T)) => {
    try {
      const next = typeof v === 'function' ? (v as (current: T) => T)(value) : v

      if (next === void 0 || next === null) removeLocalStorageItem(key)
      else setLocalStorageItem(key, next)
    } catch (error) {
      console.warn('useLocalStorage: Failed to set item in localStorage', error)
    }
  }, [key, value])

  return [value, setState] as const
}
