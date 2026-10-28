'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * State that a parent may control (`value` + `onChange`) or leave to the component
 * (`defaultValue`). `undefined` means uncontrolled, so pass `null` for "controlled, empty".
 */
export function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void) {
  const [inner, setInner] = useState(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? value : inner
  // Read through a ref so the setter stays stable across renders
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const set = useCallback(
    (next: T) => {
      if (!controlled) setInner(next)
      onChangeRef.current?.(next)
    },
    [controlled]
  )
  return [current, set] as const
}
