import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'

import { AppShell, CommandPalette, DescriptionList, Dialog, Divider, EmptyState, isActive } from '@/components'

const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/dashboard/members/42',
}))

describe('Dialog', () => {
  it('is named by its title and closes on Escape and the close button', () => {
    const onClose = jest.fn()
    render(
      <Dialog open onClose={onClose} title="Edit member" description="Changes save right away">
        Body
      </Dialog>
    )
    const dialog = screen.getByRole('dialog', { name: 'Edit member' })
    expect(dialog).toHaveAccessibleDescription('Changes save right away')
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('CommandPalette', () => {
  const commands = [
    { id: 'members', label: 'Members', group: 'Go to', href: '/dashboard/members', keywords: ['people'] },
    { id: 'events', label: 'Events', group: 'Go to', href: '/dashboard/events' },
    { id: 'new', label: 'Create an event', group: 'Actions', onSelect: jest.fn() },
  ]

  it('opens on Ctrl+K, filters as you type (by keyword too), and goes there on Enter', () => {
    render(<CommandPalette commands={commands} />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const box = screen.getByRole('combobox')
    fireEvent.change(box, { target: { value: 'peo' } })
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Members'])
    expect(box).toHaveAttribute('aria-activedescendant', screen.getByRole('option').id)
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(push).toHaveBeenCalledWith('/dashboard/members')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('moves with the arrow keys and runs actions', () => {
    render(<CommandPalette commands={commands} defaultOpen trigger={false} hotkey={false} />)
    const box = screen.getByRole('combobox')
    fireEvent.keyDown(box, { key: 'ArrowUp' })
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Create an event')
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(commands[2].onSelect).toHaveBeenCalled()
  })

  it('says when nothing matches', () => {
    render(<CommandPalette commands={commands} defaultOpen trigger={false} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzz' } })
    expect(screen.getByText('No results')).toBeInTheDocument()
  })
})

describe('AppShell', () => {
  it('marks the link for the page being viewed, including pages under a section', () => {
    render(
      <AppShell
        nav={[
          {
            items: [
              { label: 'Overview', href: '/dashboard', exact: true },
              { label: 'Members', href: '/dashboard/members', count: 3 },
            ],
          },
        ]}
      >
        Page
      </AppShell>
    )
    const [desktop] = screen.getAllByRole('navigation', { name: 'Dashboard' })
    expect(desktop.querySelector('[aria-current="page"]')).toHaveTextContent('Members')
    expect(isActive({ label: 'Home', href: '/' }, '/about')).toBe(false)
    expect(isActive({ label: 'Members', href: '/members' }, '/membership')).toBe(false)
  })

  it('narrows to icons, keeping each link’s name', () => {
    render(<AppShell nav={[{ items: [{ label: 'Members', href: '/dashboard/members' }] }]}>Page</AppShell>)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByRole('link', { name: 'Members' }).length).toBeGreaterThan(0)
  })
})

describe('Small pieces', () => {
  it('EmptyState shows its title, description, and actions', () => {
    render(<EmptyState title="No events yet" description="Create one to get started" actions={<button type="button">Create</button>} headingLevel={2} />)
    expect(screen.getByRole('heading', { level: 2, name: 'No events yet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('DescriptionList pairs each term with its details', () => {
    const { container } = render(<DescriptionList items={[{ term: 'Email', details: 'a@b.edu' }]} />)
    expect(container.querySelector('dt')).toHaveTextContent('Email')
    expect(container.querySelector('dd')).toHaveTextContent('a@b.edu')
  })

  it('Divider is a separator, with or without a label', () => {
    render(
      <>
        <Divider />
        <Divider label="or" />
      </>
    )
    expect(screen.getAllByRole('separator')).toHaveLength(2)
  })
})
