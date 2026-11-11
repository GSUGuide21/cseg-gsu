import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'

import DashboardError from '../app/(dashboard)/dashboard/error'
import SiteError from '../app/(page)/error'
import SiteNotFound from '../app/(page)/not-found'
import { errorCode } from '../app/globals/ErrorScreen'

// The pages log what broke; keep that out of the test output
let logged: jest.SpyInstance
beforeEach(() => {
  logged = jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => logged.mockRestore())

const serverError = (digest: string) => Object.assign(new Error('relation "members" does not exist'), { digest })

describe('the error page', () => {
  it('says it broke, without showing what the error said', () => {
    render(<SiteError error={serverError('abc123')} retry={() => {}} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.queryByText(/members/)).not.toBeInTheDocument()
  })

  it('tries again when asked', () => {
    const retry = jest.fn()
    render(<SiteError error={new Error('boom')} retry={retry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('shows the code to report, when the error has one', () => {
    const { rerender } = render(<SiteError error={serverError('abc123')} retry={() => {}} />)
    expect(screen.getByText('abc123')).toBeInTheDocument()
    rerender(<SiteError error="just a string" retry={() => {}} />)
    expect(screen.queryByText(/Error code/)).not.toBeInTheDocument()
  })

  it('logs what was thrown', () => {
    const error = new Error('boom')
    render(<SiteError error={error} retry={() => {}} />)
    expect(logged).toHaveBeenCalledWith(error)
  })

  it('leads home from the site and to the overview from the dashboard', () => {
    const { unmount } = render(<SiteError error={new Error('boom')} retry={() => {}} />)
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
    unmount()
    render(<DashboardError error={new Error('boom')} retry={() => {}} />)
    expect(screen.getByRole('link', { name: 'Back to overview' })).toHaveAttribute('href', '/dashboard')
  })
})

describe('errorCode', () => {
  it('reads the digest off an error and nothing off anything else', () => {
    expect(errorCode(serverError('d1'))).toBe('d1')
    expect(errorCode(new Error('no digest'))).toBeNull()
    expect(errorCode({ digest: 'not an error' })).toBeNull()
    expect(errorCode(null)).toBeNull()
  })
})

describe('the not-found page', () => {
  it('says the page is missing and offers the home page and search', () => {
    render(<SiteNotFound />)
    expect(screen.getByRole('heading', { level: 1, name: 'We couldn’t find that page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Search the site' })).toHaveAttribute('href', '/search')
  })
})
