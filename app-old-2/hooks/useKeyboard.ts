import {
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from 'react'

export type KeyCombination = {
  /**
   * Modifiers plus one key, e.g. ['ctrl', 'k'], ['mod', 'Enter'] (⌘ on Mac, Ctrl elsewhere),
   * ['shift', 'ArrowUp'], or ['?']. Modifiers: ctrl/control, shift, alt/option, meta/cmd,
   * mod. Keys match KeyboardEvent.key case-insensitively, or KeyboardEvent.code ('KeyK').
   */
  keys: string[]
  handler: (event: KeyboardEvent) => void
  /** Fire while typing in a text field too. Default: only when Ctrl, Alt, or ⌘ is held. */
  allowInInputs?: boolean
  /** Fire again while the key is held down. Default false. */
  allowRepeat?: boolean
}

export type UseKeyboardOptions = {
  combinations?: KeyCombination[]
  enabled?: boolean
  /** Stop the browser's own action for a matched combination (e.g. ⌘K focusing the address bar). Default true. */
  preventDefault?: boolean
}

type Modifier = 'ctrl' | 'shift' | 'alt' | 'meta'

const MODIFIERS: Record<string, Modifier | 'mod'> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  shift: 'shift',
  alt: 'alt',
  option: 'alt',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  mod: 'mod',
}

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** Whether the event happened in a place someone types: a text field, a select, or contenteditable */
const isTyping = (event: KeyboardEvent) => {
  const el = event.target as HTMLElement | null
  if (!el || !('tagName' in el)) return false
  if (el.isContentEditable) return true
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  return el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes((el as HTMLInputElement).type)
}

export const matchesCombination = (event: KeyboardEvent, keys: string[]) => {
  const wanted = new Set<Modifier>()
  const rest: string[] = []
  for (const k of keys) {
    const mod = MODIFIERS[k.toLowerCase()]
    if (mod === 'mod') wanted.add(isMac() ? 'meta' : 'ctrl')
    else if (mod) wanted.add(mod)
    else rest.push(k)
  }
  if (rest.length !== 1) return false
  const [key] = rest
  const keyMatches = event.key.toLowerCase() === key.toLowerCase() || event.code === key
  if (!keyMatches) return false
  // A symbol like "?" already needs Shift to type, so Shift only counts when it's asked for
  const shiftOptional = key.length === 1 && !/[a-z]/i.test(key) && !wanted.has('shift')
  const pressed: Record<Modifier, boolean> = { ctrl: event.ctrlKey, shift: event.shiftKey, alt: event.altKey, meta: event.metaKey }
  return (Object.keys(pressed) as Modifier[]).every((m) => (m === 'shift' && shiftOptional) || pressed[m] === wanted.has(m))
}

/**
 * Runs handlers for keyboard shortcuts, on an element (pass its ref) or the whole window
 * (pass nothing). Modifiers must match exactly, so ['ctrl', 'k'] doesn't fire for
 * Ctrl+Shift+K. Plain keys are ignored while someone types in a text field.
 *
 *   useKeyboard(undefined, { combinations: [{ keys: ['mod', 'k'], handler: openSearch }] })
 *
 * The element is read when the hook mounts (or `enabled` turns on), so the ref should be
 * attached by then.
 */
export const useKeyboard = (ref?: RefObject<HTMLElement | null> | null, options: UseKeyboardOptions = {}) => {
  const { combinations = [], enabled = true, preventDefault = true } = options
  // Always the latest handlers, without re-adding the listener on every render
  const latest = useRef({ combinations, preventDefault })

  useLayoutEffect(() => {
    latest.current = { combinations, preventDefault }
  })

  useEffect(() => {
    if (!enabled) return
    const target: HTMLElement | Window = ref?.current ?? window
    const controller = new AbortController()
    const onKeyDown = (event: Event) => {
      const e = event as KeyboardEvent
      // Keys pressed mid-composition (Japanese, Chinese, …) belong to the IME
      if (e.isComposing) return
      for (const combo of latest.current.combinations) {
        if (e.repeat && !combo.allowRepeat) continue
        if (!matchesCombination(e, combo.keys)) continue
        if (isTyping(e) && !combo.allowInInputs && !(e.ctrlKey || e.metaKey || e.altKey)) continue
        if (latest.current.preventDefault) e.preventDefault()
        combo.handler(e)
      }
    }
    target.addEventListener('keydown', onKeyDown, { signal: controller.signal })
    return () => controller.abort()
  }, [ref, enabled])
}
