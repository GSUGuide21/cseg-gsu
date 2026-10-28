import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { useRef } from 'react'

import { useKeyboard, type KeyCombination } from '../app/hooks'

const press = (target: Element | Window, init: KeyboardEventInit) => fireEvent.keyDown(target, init)

describe('useKeyboard', () => {
  it('fires on the window for a matching combination', () => {
    const handler = jest.fn()
    renderHook(() => useKeyboard(undefined, { combinations: [{ keys: ['ctrl', 'k'], handler }] }))
    press(window, { key: 'k', ctrlKey: true })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('needs the modifiers to match exactly', () => {
    const handler = jest.fn()
    renderHook(() => useKeyboard(undefined, { combinations: [{ keys: ['ctrl', 'k'], handler }] }))
    press(window, { key: 'k' })
    press(window, { key: 'K', ctrlKey: true, shiftKey: true })
    press(window, { key: 'j', ctrlKey: true })
    expect(handler).not.toHaveBeenCalled()
  })

  it('reads key names in any case and accepts Shift for symbols like "?"', () => {
    const help = jest.fn()
    const save = jest.fn()
    renderHook(() =>
      useKeyboard(undefined, {
        combinations: [
          { keys: ['?'], handler: help },
          { keys: ['Control', 'S'], handler: save },
        ],
      })
    )
    press(window, { key: '?', shiftKey: true })
    press(window, { key: 's', ctrlKey: true })
    expect(help).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('stops the browser’s own action unless told not to', () => {
    renderHook(() => useKeyboard(undefined, { combinations: [{ keys: ['ctrl', 'k'], handler: () => {} }] }))
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('ignores plain keys typed into a text field, but not modifier shortcuts', () => {
    const slash = jest.fn()
    const save = jest.fn()
    render(<input aria-label="Search" />)
    renderHook(() =>
      useKeyboard(undefined, {
        combinations: [
          { keys: ['/'], handler: slash },
          { keys: ['ctrl', 's'], handler: save },
        ],
      })
    )
    const input = screen.getByRole('textbox', { name: 'Search' })
    press(input, { key: '/' })
    press(input, { key: 's', ctrlKey: true })
    expect(slash).not.toHaveBeenCalled()
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('skips held-down repeats and IME composition', () => {
    const handler = jest.fn()
    renderHook(() => useKeyboard(undefined, { combinations: [{ keys: ['Enter'], handler }] }))
    press(window, { key: 'Enter', repeat: true })
    press(window, { key: 'Enter', isComposing: true })
    expect(handler).not.toHaveBeenCalled()
  })

  it('listens only on the element when given a ref', () => {
    const handler = jest.fn()
    const Box = () => {
      const ref = useRef<HTMLDivElement>(null)
      useKeyboard(ref, { combinations: [{ keys: ['Escape'], handler }] })
      return (
        <div ref={ref} tabIndex={0} data-testid="box">
          <button type="button">Inside</button>
        </div>
      )
    }
    render(<Box />)
    press(window, { key: 'Escape' })
    expect(handler).not.toHaveBeenCalled()
    press(screen.getByRole('button', { name: 'Inside' }), { key: 'Escape' })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('can be switched off and on without breaking hook order, using the latest handler', () => {
    const first = jest.fn()
    const second = jest.fn()
    const { rerender } = renderHook(({ enabled, combinations }: { enabled: boolean; combinations: KeyCombination[] }) => useKeyboard(undefined, { enabled, combinations }), {
      initialProps: { enabled: false, combinations: [] as KeyCombination[] },
    })
    press(window, { key: 'k', ctrlKey: true })
    rerender({ enabled: true, combinations: [{ keys: ['ctrl', 'k'], handler: first }] })
    rerender({ enabled: true, combinations: [{ keys: ['ctrl', 'k'], handler: second }] })
    press(window, { key: 'k', ctrlKey: true })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    rerender({ enabled: false, combinations: [{ keys: ['ctrl', 'k'], handler: second }] })
    press(window, { key: 'k', ctrlKey: true })
    expect(second).toHaveBeenCalledTimes(1)
  })
})
