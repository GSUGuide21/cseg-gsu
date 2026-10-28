import {
  useSyncExternalStore,
  useCallback,
  useEffect
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

const getLocalStorageItem = (key: string) => window.localStorage.getItem(key)

const useLocalStorageSubscribe = (callback: (e: StorageEvent) => void) => {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

const getLocalStorageServerSnapshot = () => {
  throw new Error('useLocalStorage: Server-side rendering is not supported. This hook is only available on the client side.')
}

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const getSnapshot = () => getLocalStorageItem(key) ?? initialValue

  const store = useSyncExternalStore(
    useLocalStorageSubscribe,
    getSnapshot,
    getLocalStorageServerSnapshot
  )

  const setState = useCallback((v: T) => {
    try {
      const next = typeof v === 'function' ? v(JSON.parse(store as string)) : v

      if (next === void 0 || next === null) removeLocalStorageItem(key)
      else setLocalStorageItem(key, next)
    } catch (error) {
      console.warn('useLocalStorage: Failed to set item in localStorage', error)
    }
  }, [key, store])

  useEffect(() => {
    if (
      getLocalStorageItem(key) === null &&
      typeof initialValue !== 'undefined'
    ) setLocalStorageItem(key, initialValue)
  }, [key, initialValue])

  return [store, setState] as const
}