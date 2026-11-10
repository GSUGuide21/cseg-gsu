import {
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from 'react'

interface InterceptNavigationOptions {
  /** Whether to stop navigation now, e.g. while a form has unsaved changes */
  shouldIntercept: boolean
  /** Called instead of following a link inside the element, e.g. to ask "Leave without saving?" */
  onIntercept: (destination: URL) => void
}

/** Whether a click on a link would leave this page, in this tab */
const leavesPage = (event: MouseEvent, link: HTMLAnchorElement, destination: URL) =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !(event.ctrlKey || event.shiftKey || event.metaKey || event.altKey) &&
  !(link.target && link.target !== '_self') &&
  !link.hasAttribute('download') &&
  // Only the #hash changes: a jump within the page
  !(destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search)

/**
 * Holds navigation while `shouldIntercept` is true: a click on a link inside `ref`'s element
 * calls `onIntercept` instead of following it (Next's <Link>s included, as they're stopped
 * before React sees the click), and closing or reloading the tab asks the browser's own
 * "Leave site?" first. Links that open elsewhere (a new tab, a download) or jump within the
 * page go ahead.
 */
export const useInterceptNavigation = <T extends HTMLElement>(ref: RefObject<T | null>, options: InterceptNavigationOptions) => {
  const latest = useRef(options)

  useLayoutEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const onClick = (event: MouseEvent) => {
      if (!latest.current.shouldIntercept) return
      const link = (event.target as Element | null)?.closest?.('a[href]')
      if (!(link instanceof HTMLAnchorElement)) return

      let destination: URL
      try {
        destination = new URL(link.href, window.location.href)
      } catch {
        return
      }
      if (!leavesPage(event, link, destination)) return

      event.preventDefault()
      event.stopImmediatePropagation()
      latest.current.onIntercept(destination)
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!latest.current.shouldIntercept) return
      // The browser shows its own prompt; a page can't show one of its own while unloading
      event.preventDefault()
      event.returnValue = ''
    }

    const controller = new AbortController()
    element.addEventListener('click', onClick, { signal: controller.signal })
    window.addEventListener('beforeunload', onBeforeUnload, { signal: controller.signal })
    return () => controller.abort()
  }, [ref])
}
