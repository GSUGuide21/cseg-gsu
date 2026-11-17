import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'

import { Sortable, SortableHandle } from '../app/components/Form'

type Item = { key: string; label: string }

/** A list whose keys come from a counter, as the dashboard's menus do: different on the server and in the browser */
const List = ({ from }: { from: number }) => {
  const [items, setItems] = useState<Item[]>(() => ['Home', 'About', 'Events'].map((label, i) => ({ key: `item-${from + i}`, label })))
  return (
    <Sortable
      aria-label="Links"
      items={items}
      onItemsChange={setItems}
      getKey={(item) => item.key}
      getLabel={(item) => item.label}
      renderItem={(item, { handleProps }) => (
        <span>
          <SortableHandle {...handleProps} />
          <span>{item.label}</span>
        </span>
      )}
    />
  )
}

const handle = (label: string) => screen.getByRole('button', { name: `Reorder ${label}` })
const press = (label: string, key: string) => fireEvent.keyDown(handle(label), { key })

describe('Sortable, on a page the server rendered', () => {
  it('keeps focus on the moved item’s grip when its keys differ between the server and the browser', () => {
    // The page as the server sent it, made with one set of keys...
    const first = render(<List from={145} />)
    const html = first.container.innerHTML
    first.unmount()
    // ...which aren't written into it, so the browser's own can't disagree with them
    expect(html).not.toContain('item-145')
    const container = document.body.appendChild(document.createElement('div'))
    container.innerHTML = html
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {})
    let root: Root
    act(() => {
      root = hydrateRoot(container, <List from={1} />)
    })
    quiet.mockRestore()

    // Pick up Events, move it up twice, put it down: focus stays with it all the way
    act(() => handle('Events').focus())
    press('Events', ' ')
    press('Events', 'ArrowUp')
    expect(handle('Events')).toHaveFocus()
    press('Events', 'ArrowUp')
    expect(handle('Events')).toHaveFocus()
    press('Events', ' ')
    expect(screen.getAllByRole('button', { name: /^Reorder / }).map((b) => b.getAttribute('aria-label'))).toEqual(['Reorder Events', 'Reorder Home', 'Reorder About'])
    act(() => root.unmount())
    container.remove()
  })
})
