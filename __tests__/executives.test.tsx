import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'

import { ExecutiveDirectory } from '@/(page)/executives/components/ExecutiveDirectory'
import { serviceLine } from '@/(page)/executives/components/helpers'
import type { Executive } from '@/(page)/executives/components/types'
import ExecutivesPage from '@/(page)/executives/page'

// Nobody in the dashboard yet, and none built in
jest.mock('../app/lib/dashboard/public', () => ({ getExecutives: jest.fn(async () => []) }))

const person = (firstName: string, extra: Partial<Executive> = {}): Executive => ({
  firstName,
  lastName: 'Sample',
  role: 'President',
  bio: `${firstName} leads things.`,
  isFounder: false,
  serviceIntervals: [{ startYear: 2025 }],
  ...extra,
})

describe('the executives page', () => {
  it('renders, with a way to reach the officers while there’s nobody listed', async () => {
    render(await ExecutivesPage())
    expect(screen.getByRole('heading', { level: 1, name: 'Executives' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact')
  })

  it('separates those serving now from those who have served', () => {
    render(<ExecutiveDirectory executives={[person('Past', { serviceIntervals: [{ startYear: 2022, endYear: 2024 }] }), person('Now', { serviceIntervals: [{ startYear: 2022, endYear: 2023 }, { startYear: 2025, endYear: null }] })]} />)
    const [current, past] = screen.getAllByRole('list')
    expect(within(current).getByRole('heading', { name: 'Now Sample' })).toBeInTheDocument()
    expect(within(past).getByRole('heading', { name: 'Past Sample' })).toBeInTheDocument()
    expect(screen.queryByText('Meet the team soon')).not.toBeInTheDocument()
  })

  it('groups those serving now by what they do, in the constitution’s order, leaving out empty groups', () => {
    render(
      <ExecutiveDirectory
        executives={[
          person('Pat', { role: 'Marketing Manager' }),
          person('Sam', { role: 'Treasurer' }),
          person('Ed', { role: 'Executive Director' }),
          person('Kit', { role: 'Mascot' }),
          person('Old', { role: 'Secretary', serviceIntervals: [{ startYear: 2022, endYear: 2024 }] }),
        ]}
      />
    )
    const groups = screen.getAllByRole('heading', { level: 3 }).map((h) => h.getAttribute('aria-label') ?? h.textContent)
    expect(groups).toEqual(['Leadership', 'Operations', 'Communications', 'More officers', 'Old Sample'])
    const operations = screen.getByRole('heading', { level: 3, name: 'Operations' }).parentElement!
    expect(within(operations).getByRole('heading', { level: 4, name: 'Sam Sample' })).toBeInTheDocument()
    // The past ones aren't grouped
    expect(screen.queryByRole('heading', { level: 4, name: 'Old Sample' })).not.toBeInTheDocument()
  })

  it('leaves out a section with nobody in it', () => {
    render(<ExecutiveDirectory executives={[person('Now')]} />)
    expect(screen.queryByRole('heading', { name: 'Past executives' })).not.toBeInTheDocument()
  })
})

describe('an executive’s card', () => {
  it('shows who they are, when they served, and how to reach them', () => {
    render(
      <ExecutiveDirectory
        executives={[
          person('Alex', {
            isFounder: true,
            serviceIntervals: [{ startYear: 2025 }, { startYear: 2022, endYear: 2023 }],
            contact: { email: 'alex@example.com', phone: '(404) 555-0100', linkedIn: 'https://example.com/alex', twitter: 'https://example.com/x' },
          }),
        ]}
      />
    )
    expect(screen.getByRole('heading', { name: 'Alex Sample' })).toBeInTheDocument()
    expect(screen.getByText('President')).toBeInTheDocument()
    expect(screen.getByText('Founder')).toBeInTheDocument()
    expect(screen.getByText('Alex leads things.')).toBeInTheDocument()
    expect(screen.getByText('2022 – 2023, 2025 – Present')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'alex@example.com' })).toHaveAttribute('href', 'mailto:alex@example.com')
    expect(screen.getByRole('link', { name: '(404) 555-0100' })).toHaveAttribute('href', 'tel:4045550100')
    expect(screen.getByRole('link', { name: 'Alex Sample on LinkedIn' })).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'Alex Sample on X' })).toHaveAttribute('href', 'https://example.com/x')
  })

  it('falls back to initials, and shows no contact row without any', () => {
    render(<ExecutiveDirectory executives={[person('Alex')]} />)
    expect(screen.getByText('AS')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText('Founder')).not.toBeInTheDocument()
  })
})

it('sorts service years without reordering what it was given', () => {
  const intervals = [{ startYear: 2025 }, { startYear: 2022, endYear: 2023 }]
  expect(serviceLine(intervals)).toBe('2022 – 2023, 2025 – Present')
  expect(intervals[0].startYear).toBe(2025)
})
