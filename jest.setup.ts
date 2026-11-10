import '@testing-library/jest-dom'
import { act } from 'react'

/**
 * Lexical commits its updates in a microtask, and the table tools measure in an animation
 * frame, so both land just after the act() around the event that started them, and all the
 * React state they feed warns that it wasn't wrapped. Here they run inside act() instead (not
 * while Testing Library is waiting, when it has turned the act environment off). This has to
 * be in place before Lexical loads, since it keeps its own reference to queueMicrotask.
 */
const actEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
const inAct = (task: () => void) => (actEnvironment.IS_REACT_ACT_ENVIRONMENT ? act(task) : task())

const schedule = globalThis.queueMicrotask.bind(globalThis)
globalThis.queueMicrotask = (task) => schedule(/[\\/]lexical[\\/]/.test(new Error().stack ?? '') ? () => inAct(task) : task)

// Tests of server code run without a window
if (globalThis.requestAnimationFrame) {
  const nextFrame = globalThis.requestAnimationFrame.bind(globalThis)
  globalThis.requestAnimationFrame = (task) => nextFrame((time) => inAct(() => task(time)))
}
