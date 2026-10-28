'use client'

import { useSyncExternalStore, type FC, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const noop = () => () => {}

/** True in the browser after hydration; false on the server and in the first client render */
export const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false
  )

/**
 * Renders its children at the end of <body>, out of any container that would clip or
 * stack them (overflow: hidden, transforms, z-index). Renders nothing on the server.
 */
export const Portal: FC<{ children: ReactNode }> = ({ children }) => (useHydrated() ? createPortal(children, document.body) : null)
