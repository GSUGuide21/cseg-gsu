import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { ContextMenu } from '@/components'

describe('ContextMenu', () => {
  it('opens on right-click with items made then, runs one, and closes', async () => {
    const rename = jest.fn()
    const items = jest.fn((target: EventTarget | null) => [
      { label: `Rename ${(target as HTMLElement).textContent}`, onSelect: rename },
      'separator' as const,
      { label: 'Delete', danger: true },
    ])
    render(
      <ContextMenu items={items} label="File">
        <button type="button">notes.txt</button>
      </ContextMenu>
    )
    fireEvent.contextMenu(screen.getByRole('button', { name: 'notes.txt' }), { clientX: 40, clientY: 60 })
    const menu = screen.getByRole('menu', { name: 'File' })
    expect(items).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('menuitem', { name: 'Rename notes.txt' })).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: 'Rename notes.txt' })))
    expect(rename).toHaveBeenCalled()
    expect(menu).not.toBeInTheDocument()
  })

  it('leaves the browser’s menu for Shift+right-click, and opens from the keyboard', () => {
    render(
      <ContextMenu items={[{ label: 'Copy' }]}>
        <p tabIndex={0}>Some text</p>
      </ContextMenu>
    )
    const text = screen.getByText('Some text')
    const shifted = fireEvent.contextMenu(text, { shiftKey: true })
    // Not prevented: the browser's own menu shows
    expect(shifted).toBe(true)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    text.focus()
    fireEvent.keyDown(text, { key: 'F10', shiftKey: true })
    expect(screen.getByRole('menu', { name: 'Context menu' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    // Back where it was
    expect(text).toHaveFocus()
  })
})
