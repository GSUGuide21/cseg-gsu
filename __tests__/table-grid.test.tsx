import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { Table, type TableColumn } from '@/components'

interface Flight {
  id: string
  airline: string
  to: string
  status: string | null
}

const FLIGHTS: Flight[] = [
  { id: '1', airline: 'Air Berlin', to: 'Munich', status: 'Late' },
  { id: '2', airline: 'Air Canada', to: 'Toronto', status: 'On time' },
  { id: '3', airline: 'Air Berlin', to: 'Berlin', status: 'On time' },
  { id: '4', airline: 'Air Iceland', to: 'Aberdeen', status: null },
]
const COLUMNS: TableColumn<Flight>[] = [
  { key: 'airline', header: 'Airline', sortable: true, groupable: true },
  { key: 'to', header: 'To', sortable: true },
  { key: 'status', header: 'Status', sortable: true, groupable: true },
]

const show = (props: Partial<Parameters<typeof Table<Flight>>[0]> = {}) =>
  render(<Table caption="Departures" rows={FLIGHTS} columns={COLUMNS} getRowId={(f) => f.id} stackOnNarrow={false} columnMenu {...props} />)

/** Each row's first cell, top to bottom */
const firstCells = () => screen.getAllByRole('rowheader').filter((h) => h.getAttribute('scope') === 'row').map((h) => h.textContent)
const headers = () => screen.getAllByRole('columnheader').map((h) => within(h).queryByRole('button')?.textContent)

const choose = async (column: string, item: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Options for ${column}` }))
  fireEvent.click(await screen.findByRole('menuitem', { name: item }))
}
const toggle = async (column: string, item: string | RegExp) => {
  fireEvent.click(screen.getByRole('button', { name: `Options for ${column}` }))
  fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: item }))
}

describe('Column menus', () => {
  it('stays out of the way unless asked for', () => {
    show({ columnMenu: false })
    expect(screen.queryByRole('button', { name: 'Options for To' })).not.toBeInTheDocument()
  })

  it('sorts each way from the menu', async () => {
    show()
    await choose('To', 'Sort descending')
    expect(firstCells()).toEqual(['Air Canada', 'Air Berlin', 'Air Berlin', 'Air Iceland'])
    await choose('To', 'Sort ascending')
    expect(firstCells()).toEqual(['Air Iceland', 'Air Berlin', 'Air Berlin', 'Air Canada'])
  })

  it('sorts on several columns, from the menu or with shift', async () => {
    show()
    await choose('Airline', 'Sort ascending')
    await choose('To', 'Add to sort, ascending')
    const order = () => screen.getAllByRole('cell').map((c) => c.textContent).filter((t) => ['Berlin', 'Munich', 'Toronto', 'Aberdeen'].includes(t ?? ''))
    expect(order()).toEqual(['Berlin', 'Munich', 'Toronto', 'Aberdeen'])
    fireEvent.click(screen.getByRole('button', { name: /^To/ }), { shiftKey: true })
    expect(order()).toEqual(['Munich', 'Berlin', 'Toronto', 'Aberdeen'])
    expect(screen.getAllByRole('columnheader')[1]).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('button', { name: /^To/ })).toHaveTextContent('2')
  })

  it('goes back to one sort on a plain click', async () => {
    show()
    await choose('Airline', 'Sort ascending')
    await choose('To', 'Add to sort, ascending')
    fireEvent.click(screen.getByRole('button', { name: /^Status/ }))
    expect(screen.getAllByRole('columnheader')[1]).toHaveAttribute('aria-sort', 'none')
  })

  it('clears one sort, and the next one moves up', async () => {
    show()
    await choose('Airline', 'Sort ascending')
    await choose('To', 'Add to sort, descending')
    await choose('Airline', 'Clear this sort')
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('aria-sort', 'none')
    expect(screen.getAllByRole('columnheader')[1]).toHaveAttribute('aria-sort', 'descending')
  })

  it('hides and shows columns with the menu left open', async () => {
    show()
    await toggle('Airline', 'To')
    expect(screen.queryByRole('columnheader', { name: /^To/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Toronto')).not.toBeInTheDocument()
    const again = screen.getByRole('menuitemcheckbox', { name: 'To' })
    expect(again).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(again)
    expect(screen.getByText('Toronto')).toBeInTheDocument()
  })

  it('won’t hide the last column, and names rows by whatever’s left', async () => {
    show({ defaultHiddenColumns: ['airline', 'status'] })
    expect(firstCells()).toEqual(['Munich', 'Toronto', 'Berlin', 'Aberdeen'])
    fireEvent.click(screen.getByRole('button', { name: 'Options for To' }))
    expect(await screen.findByRole('menuitemcheckbox', { name: 'To' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('offers grouping only on columns that can be', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Options for To' }))
    await screen.findByRole('menuitem', { name: 'Sort ascending' })
    expect(screen.queryByRole('menuitem', { name: 'Group by this field' })).not.toBeInTheDocument()
  })
})

describe('Grouping', () => {
  const group = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })

  it('gathers rows under a heading with a count, A to Z, and steps the column aside', async () => {
    show()
    await choose('Airline', 'Group by this field')
    expect(group('Air Berlin')).toHaveTextContent('Air Berlin2')
    expect(screen.getAllByRole('button', { expanded: true }).map((b) => b.textContent)).toEqual(['Air Berlin2', 'Air Canada1', 'Air Iceland1'])
    expect(screen.queryByRole('columnheader', { name: /^Airline/ })).not.toBeInTheDocument()
  })

  it('puts rows with no value under None', () => {
    show({ defaultGroupBy: 'status' })
    expect(group('None')).toHaveTextContent('None1')
  })

  it('keeps the column on request', async () => {
    show({ defaultGroupBy: 'airline' })
    await toggle('To', 'Show Airline in groups')
    expect(screen.getByRole('columnheader', { name: /^Airline/ })).toBeInTheDocument()
  })

  it('collapses a group', () => {
    show({ defaultGroupBy: 'airline' })
    fireEvent.click(group('Air Berlin'))
    expect(group('Air Berlin')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Munich')).not.toBeInTheDocument()
    expect(screen.getByText('Toronto')).toBeInTheDocument()
  })

  it('sorts within each group, and follows a sort on the grouped column', async () => {
    show({ defaultGroupBy: 'airline', defaultSort: { key: 'airline', direction: 'descending' } })
    expect(screen.getAllByRole('button', { expanded: true })[0]).toHaveTextContent('Air Iceland')
    await choose('To', 'Sort descending')
    expect(screen.getAllByRole('button', { expanded: true })[0]).toHaveTextContent('Air Berlin')
    const munich = screen.getByText('Munich').compareDocumentPosition(screen.getByText('Berlin'))
    expect(munich & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('ends with Stop grouping, from any column', async () => {
    show({ defaultGroupBy: 'airline' })
    await choose('To', 'Stop grouping')
    expect(screen.queryByRole('button', { expanded: true })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Airline/ })).toBeInTheDocument()
  })
})

describe('Title bar', () => {
  it('shows the caption, and still names the table once', () => {
    show({ titleBar: true })
    expect(screen.getByRole('table', { name: 'Departures' })).toBeInTheDocument()
    expect(screen.getAllByText('Departures')).toHaveLength(2)
    expect(screen.getByText('Departures', { selector: 'div' })).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Headers without a menu', () => {
  it('still work as before', () => {
    show({ columnMenu: false })
    fireEvent.click(screen.getByRole('button', { name: /^To/ }), { shiftKey: true })
    expect(screen.getAllByRole('columnheader')[1]).toHaveAttribute('aria-sort', 'ascending')
    fireEvent.click(screen.getByRole('button', { name: /^Airline/ }), { shiftKey: true })
    expect(headers()).toHaveLength(3)
    expect(screen.getAllByRole('columnheader')[1]).toHaveAttribute('aria-sort', 'none')
  })
})
