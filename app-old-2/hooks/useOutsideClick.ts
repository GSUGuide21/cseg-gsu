import {
  useRef,
  useLayoutEffect,
  useEffect,
} from 'react'

export const useOutsideClick = <T extends HTMLElement | null>(cb: (e: MouseEvent | TouchEvent | PointerEvent) => T | null | void) => {
  const ref = useRef<T>(null)
  const refCb = useRef(cb)

  useLayoutEffect(() => {
    refCb.current = cb
  })

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent | PointerEvent) => {
      const element = ref.current
      if (element && !element.contains(e.target as Node)) refCb.current(e)
    }

    if (window.PointerEvent === void 0) {
      document.addEventListener('click', handler)
      document.addEventListener('touchstart', handler)
    } else {
      document.addEventListener('pointerdown', handler)
    }

    return () => {
      if (window.PointerEvent === void 0) {
        document.removeEventListener('click', handler)
        document.removeEventListener('touchstart', handler)
      } else {
        document.removeEventListener('pointerdown', handler)
      }
    }
  }, [])

  return ref
}