import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

import {
  ActionMenu,
  Avatar,
  AvatarGroup,
  BarChart,
  FilterBar,
  initials,
  Kbd,
  niceTicks,
  relativeTime,
  Skeleton,
  Stat,
  Stepper,
  Table,
  Tabs,
  Timeline,
} from '@/components'

describe('Tabs', () => {
  const items = [
    { id: 'a', label: 'Overview', content: 'Overview panel' },
    { id: 'b', label: 'Members', count: 3, content: 'Members panel' },
    { id: 'c', label: 'Locked', content: 'Locked panel', disabled: true },
  ]

  it('opens a tab as the arrow keys reach it, skipping disabled ones', () => {
    render(<Tabs aria-label="Dashboard" items={items} />)
    const overview = screen.getByRole('tab', { name: 'Overview' })
    expect(overview).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Overview panel')
    fireEvent.keyDown(overview, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Members 3' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Members 3' }), { key: 'ArrowRight' })
    // Wraps past the disabled tab
    expect(overview).toHaveAttribute('aria-selected', 'true')
  })

  it('waits for Enter in manual mode', () => {
    render(<Tabs aria-label="Dashboard" items={items} activation="manual" />)
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Overview' }), { key: 'End' })
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('ActionMenu', () => {
  it('opens from the keyboard, moves by letter, runs an item, and returns focus', () => {
    const remove = jest.fn()
    render(
      <ActionMenu
        label="Actions for Jordan"
        items={[{ label: 'Edit', onSelect: jest.fn() }, { label: 'Copy email' }, 'separator', { label: 'Remove', danger: true, onSelect: remove }]}
      />
    )
    const button = screen.getByRole('button', { name: 'Actions for Jordan' })
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
    fireEvent.keyDown(button, { key: 'ArrowDown' })
    const menu = screen.getByRole('menu', { name: 'Actions for Jordan' })
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(3)
    fireEvent.keyDown(menu, { key: 'r' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove' }))
    expect(remove).toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('closes on Escape', () => {
    render(<ActionMenu items={[{ label: 'Edit' }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})

describe('Table', () => {
  const rows = [
    { id: '1', name: 'Sam', events: 3 },
    { id: '2', name: 'Avery', events: 10 },
    { id: '3', name: 'Jordan', events: 1 },
  ]
  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'events', header: 'Events', sortable: true, align: 'end' as const },
  ]
  const names = () => screen.getAllByRole('rowheader').map((c) => c.textContent)

  it('sorts by a column, both ways, and marks it', () => {
    render(<Table caption="Members" rows={rows} columns={columns} getRowId={(r) => r.id} stackOnNarrow={false} />)
    expect(screen.getByRole('table', { name: 'Members' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Events' }))
    expect(names()).toEqual(['Jordan', 'Sam', 'Avery'])
    expect(screen.getByRole('columnheader', { name: 'Events' })).toHaveAttribute('aria-sort', 'ascending')
    fireEvent.click(screen.getByRole('button', { name: 'Events' }))
    expect(names()).toEqual(['Avery', 'Sam', 'Jordan'])
  })

  it('selects rows and offers bulk actions', () => {
    const onSelected = jest.fn()
    render(
      <Table
        caption="Members"
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        selectable
        onSelectedChange={onSelected}
        bulkActions={(ids) => <button type="button">Export {ids.length}</button>}
      />
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Avery' }))
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export 1' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }))
    expect(onSelected).toHaveBeenLastCalledWith(['2', '1', '3'])
  })

  it('says when there are no rows', () => {
    render(<Table caption="Members" rows={[]} columns={columns} getRowId={(r: (typeof rows)[number]) => r.id} empty="No members yet" />)
    expect(screen.getByText('No members yet')).toBeInTheDocument()
  })
})

describe('Stat', () => {
  it('shortens big numbers and says the change in words, colored by whether it is good', () => {
    render(<Stat label="No-shows" value={12900} delta={{ value: 3, period: 'vs last event', goodWhen: 'down' }} trend={[1, 4, 2]} />)
    expect(screen.getByText('12.9K')).toBeInTheDocument()
    expect(screen.getByText('Up 3%')).toBeInTheDocument()
    expect(screen.getByText('Up 3%').parentElement).toHaveClass('text-danger')
    expect(screen.getByText(/Trend: from 1 to 2, low 1, high 4/)).toBeInTheDocument()
  })
})

describe('BarChart', () => {
  it('has a table of the same numbers', () => {
    render(<BarChart title="RSVPs by event" x="event" series={[{ key: 'n', name: 'RSVPs' }]} data={[{ event: 'Social', n: 40 }, { event: 'Tour', n: 12 }]} />)
    expect(screen.getByRole('heading', { name: 'RSVPs by event' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show table' }))
    const table = screen.getByRole('table', { name: 'RSVPs by event' })
    expect(within(table).getByRole('rowheader', { name: 'Social' })).toBeInTheDocument()
    expect(within(table).getByText('40')).toBeInTheDocument()
  })

  it('picks round axis ticks', () => {
    expect(niceTicks(0, 104, 5)).toEqual([0, 25, 50, 75, 100, 125])
    expect(niceTicks(0, 0.3, 3)).toEqual([0, 0.1, 0.2, 0.3])
  })
})

describe('Avatar', () => {
  it('shows initials when there is no photo, named by the person', () => {
    render(<Avatar name="Jordan Lee" status="online" />)
    expect(screen.getByRole('img', { name: 'Jordan Lee' })).toHaveAccessibleDescription('Online')
    expect(initials('cher')).toBe('C')
    expect(initials('Mary Ann Smith')).toBe('MS')
  })

  it('groups the rest as +N', () => {
    render(<AvatarGroup aria-label="Going" max={3} people={['A B', 'C D', 'E F', 'G H', 'I J'].map((name) => ({ name }))} />)
    expect(screen.getAllByRole('img')).toHaveLength(2)
    expect(screen.getByText('and 3 more')).toBeInTheDocument()
  })
})

describe('Kbd', () => {
  it('writes a combination as keycaps, naming symbols', () => {
    const { container } = render(<Kbd keys={['shift', 'enter']} />)
    expect(container.querySelectorAll('kbd kbd')).toHaveLength(2)
    expect(screen.getByText('Enter')).toHaveClass('sr-only')
  })
})

describe('Skeleton', () => {
  it('is hidden from screen readers', () => {
    const { container } = render(<Skeleton shape="text" lines={3} />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('span span')).toHaveLength(3)
  })
})

describe('Stepper', () => {
  it('marks the current step and lets people go back to finished ones', () => {
    const onStep = jest.fn()
    render(<Stepper aria-label="Create an event" current={1} onStepChange={onStep} steps={[{ label: 'Details' }, { label: 'Date' }, { label: 'Review' }]} />)
    const steps = within(screen.getByRole('list', { name: 'Create an event' })).getAllByRole('listitem')
    expect(steps[1]).toHaveAttribute('aria-current', 'step')
    fireEvent.click(screen.getByRole('button', { name: /Completed: Details/ }))
    expect(onStep).toHaveBeenCalledWith(0)
    // Upcoming steps aren't buttons by default
    expect(screen.queryByRole('button', { name: /Review/ })).not.toBeInTheDocument()
  })
})

describe('Timeline', () => {
  it('lists events with machine-readable times', () => {
    render(<Timeline aria-label="Activity" items={[{ id: '1', title: 'Event published', time: '2026-10-27T10:00:00Z' }]} />)
    expect(screen.getByRole('list', { name: 'Activity' })).toBeInTheDocument()
    expect(document.querySelector('time')).toHaveAttribute('dateTime', '2026-10-27T10:00:00.000Z')
    const now = new Date('2026-10-27T12:00:00Z').getTime()
    expect(relativeTime(new Date('2026-10-27T10:00:00Z'), now)).toBe('2 hours ago')
    expect(relativeTime(new Date('2026-10-26T12:00:00Z'), now)).toBe('yesterday')
  })
})

describe('FilterBar', () => {
  it('shows picks as removable chips and clears them', () => {
    const onChange = jest.fn()
    render(
      <FilterBar
        filters={[{ id: 'status', label: 'Status', options: [{ value: 'open', label: 'Open' }, { value: 'full', label: 'Full' }] }]}
        defaultValue={{ status: ['open'] }}
        onValueChange={onChange}
        resultCount={4}
      />
    )
    expect(screen.getByRole('button', { name: 'Status: Open' })).toBeInTheDocument()
    expect(screen.getByText('4 results')).toBeInTheDocument()
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove Status: Open' }))
    })
    expect(onChange).toHaveBeenLastCalledWith({ status: [] })
  })
})
