import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { Folder } from 'lucide-react'

import { Tree, type TreeNode } from '../app/components'

const NODES: TreeNode[] = [
  { id: 'about', label: 'About' },
  {
    id: 'guides',
    label: 'Guides',
    children: [
      { id: 'parking', label: 'Parking' },
      { id: 'food', label: 'Where to eat', disabled: true },
      { id: 'study', label: 'Study spots', children: [{ id: 'library', label: 'Library North' }] },
    ],
  },
  { id: 'events', label: 'Events', children: [{ id: 'socials', label: 'Socials', href: '/events#socials' }] },
]

const item = (name: string) => screen.getByRole('treeitem', { name })
/** Each row's name, as a screen reader gets it: its label, not the rows under it */
const names = () => screen.getAllByRole('treeitem').map((el) => el.getAttribute('aria-label') ?? document.getElementById(el.getAttribute('aria-labelledby') ?? '')?.textContent)
const press = (key: string) => fireEvent.keyDown(screen.getByRole('tree'), { key })

describe('Tree', () => {
  it('shows the top level closed, with each row’s place in it', () => {
    render(<Tree aria-label="Pages" nodes={NODES} />)
    expect(names()).toEqual(['About', 'Guides', 'Events'])
    expect(item('Guides')).toHaveAttribute('aria-expanded', 'false')
    expect(item('About')).not.toHaveAttribute('aria-expanded')
    expect(item('Guides')).toHaveAttribute('aria-level', '1')
    expect(item('Guides')).toHaveAttribute('aria-posinset', '2')
    expect(item('Guides')).toHaveAttribute('aria-setsize', '3')
    // One Tab stop: the first row
    expect(item('About')).toHaveAttribute('tabindex', '0')
    expect(item('Guides')).toHaveAttribute('tabindex', '-1')
  })

  it('opens what it’s told to at first, or everything', () => {
    const { unmount } = render(<Tree aria-label="Pages" nodes={NODES} defaultExpanded={['guides']} />)
    expect(names()).toEqual(['About', 'Guides', 'Parking', 'Where to eat', 'Study spots', 'Events'])
    expect(item('Parking')).toHaveAttribute('aria-level', '2')
    unmount()
    render(<Tree aria-label="Pages" nodes={NODES} defaultExpanded="all" />)
    expect(names()).toHaveLength(8)
  })

  it('opens and closes a branch from its arrow, and picks a row from the row', () => {
    const onSelect = jest.fn()
    render(<Tree aria-label="Pages" nodes={NODES} onSelect={onSelect} />)
    fireEvent.click(item('Guides').querySelector('[data-tree-toggle]')!)
    expect(item('Guides')).toHaveAttribute('aria-expanded', 'true')
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.click(within(item('Parking')).getByText('Parking'))
    expect(onSelect).toHaveBeenCalledWith('parking', expect.objectContaining({ id: 'parking' }))
    expect(item('Parking')).toHaveAttribute('aria-selected', 'true')
    expect(item('Guides')).toHaveAttribute('aria-selected', 'false')
    fireEvent.click(item('Guides').querySelector('[data-tree-toggle]')!)
    expect(screen.queryByRole('treeitem', { name: 'Parking' })).not.toBeInTheDocument()
  })

  it('moves with the arrow keys: Right opens then steps in, Left closes then steps out', () => {
    render(<Tree aria-label="Pages" nodes={NODES} />)
    item('About').focus()
    press('ArrowDown')
    expect(item('Guides')).toHaveFocus()
    press('ArrowRight')
    expect(item('Guides')).toHaveAttribute('aria-expanded', 'true')
    expect(item('Guides')).toHaveFocus()
    press('ArrowRight')
    expect(item('Parking')).toHaveFocus()
    // Past the disabled row
    press('ArrowDown')
    expect(item('Study spots')).toHaveFocus()
    press('ArrowLeft')
    expect(item('Guides')).toHaveFocus()
    press('ArrowLeft')
    expect(item('Guides')).toHaveAttribute('aria-expanded', 'false')
    press('End')
    expect(item('Events')).toHaveFocus()
    press('Home')
    expect(item('About')).toHaveFocus()
  })

  it('picks with Enter or Space, opens every branch with *, and jumps to a typed letter', () => {
    const onSelect = jest.fn()
    render(<Tree aria-label="Pages" nodes={NODES} onSelect={onSelect} />)
    item('About').focus()
    press('Enter')
    expect(onSelect).toHaveBeenLastCalledWith('about', expect.anything())
    press('*')
    expect(item('Guides')).toHaveAttribute('aria-expanded', 'true')
    expect(item('Events')).toHaveAttribute('aria-expanded', 'true')
    expect(item('Study spots')).toHaveAttribute('aria-expanded', 'false')
    press('s')
    expect(item('Study spots')).toHaveFocus()
    press(' ')
    expect(onSelect).toHaveBeenLastCalledWith('study', expect.anything())
    // A disabled row is never landed on or picked
    press('w')
    expect(item('Study spots')).toHaveFocus()
    fireEvent.click(within(item('Where to eat')).getByText('Where to eat'))
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('makes a row a link when it has somewhere to go', () => {
    render(<Tree aria-label="Pages" nodes={NODES} defaultExpanded={['events']} selectable={false} />)
    expect(within(item('Socials')).getByRole('link')).toHaveAttribute('href', '/events#socials')
    expect(item('Socials')).not.toHaveAttribute('aria-selected')
    // Not pickable, a branch opens from anywhere on its row
    fireEvent.click(within(item('Guides')).getByText('Guides'))
    expect(item('Guides')).toHaveAttribute('aria-expanded', 'true')
  })

  it('names a row by its label alone, and reads its extra after it', () => {
    render(
      <Tree
        aria-label="Menus"
        defaultExpanded={['main']}
        nodes={[
          { id: 'main', label: <strong>Main menu</strong>, icon: <Folder />, meta: 'Header', children: [{ id: 'home', label: 'Home' }] },
          { id: 'odd', label: <em>Shown as this</em>, textValue: 'Called this' },
        ]}
      />
    )
    // Not "Main menuHeaderHome": the open branch's children aren't part of its name
    expect(item('Main menu')).toHaveAccessibleName('Main menu')
    expect(item('Main menu')).toHaveAccessibleDescription('Header')
    expect(item('Home')).toHaveAccessibleName('Home')
    expect(item('Called this')).toBeInTheDocument()
  })

  it('follows a link row’s link on Enter, picking it once', () => {
    const onSelect = jest.fn()
    render(<Tree aria-label="Pages" nodes={NODES} defaultExpanded={['events']} onSelect={onSelect} />)
    const link = within(item('Socials')).getByRole('link')
    const followed = jest.fn((e: Event) => e.preventDefault())
    link.addEventListener('click', followed)
    act(() => item('Socials').focus())
    press('Enter')
    expect(followed).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('socials', expect.anything())
  })

  it('never puts the Tab stop on a disabled row', () => {
    render(<Tree aria-label="Pages" nodes={[{ id: 'a', label: 'Archived', disabled: true }, ...NODES]} />)
    expect(item('Archived')).toHaveAttribute('tabindex', '-1')
    expect(item('About')).toHaveAttribute('tabindex', '0')
  })

  it('still moves between rows when its ids differ between the server’s render and the browser’s', () => {
    // As the dashboard's menus are: ids made by a counter that runs separately on the server and in the browser
    const withIds = (n: number): TreeNode[] => [
      { id: `menu:main`, label: 'Main menu', children: [{ id: `link:main:item-${n}`, label: 'Home' }, { id: `link:main:item-${n + 1}`, label: 'Events' }] },
      { id: `menu:"odd" one`, label: 'Footer' },
    ]
    // The page as the server sent it, made with one set of ids...
    const first = render(<Tree aria-label="Menus" nodes={withIds(145)} defaultExpanded={['menu:main']} />)
    const html = first.container.innerHTML
    first.unmount()
    // ...none of which are written into it, so there's nothing there to disagree with the browser's
    expect(html).not.toContain('item-145')
    expect(html).not.toContain('odd')
    // ...then taken over in the browser, with another
    const container = document.body.appendChild(document.createElement('div'))
    container.innerHTML = html
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {})
    let root: Root
    act(() => {
      root = hydrateRoot(container, <Tree aria-label="Menus" nodes={withIds(1)} defaultExpanded={['menu:main']} />)
    })
    quiet.mockRestore()

    act(() => item('Main menu').focus())
    for (const [key, then] of [
      ['ArrowDown', 'Home'],
      ['ArrowDown', 'Events'],
      ['ArrowDown', 'Footer'],
      ['ArrowUp', 'Events'],
    ] as const) {
      press(key)
      expect(item(then)).toHaveFocus()
    }
    act(() => root.unmount())
    container.remove()
  })

  it('can be held from outside', () => {
    const onExpandedChange = jest.fn()
    render(<Tree aria-label="Pages" nodes={NODES} expanded={['guides']} selected="parking" onExpandedChange={onExpandedChange} />)
    expect(item('Parking')).toHaveAttribute('aria-selected', 'true')
    // The picked row is where Tab lands
    expect(item('Parking')).toHaveAttribute('tabindex', '0')
    fireEvent.click(item('Guides').querySelector('[data-tree-toggle]')!)
    expect(onExpandedChange).toHaveBeenCalledWith([])
    // It stays open until whoever holds it says otherwise
    expect(item('Guides')).toHaveAttribute('aria-expanded', 'true')
  })
})
