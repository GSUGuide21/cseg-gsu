import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Page from '../app/(page)/page'

describe('Page', () => {
  it('renders the hero heading', async () => {
    render(await Page())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Survive. Engage. Graduate.')
  })

  it('links to the Join page', async () => {
    render(await Page())
    const link = screen.getByRole('link', { name: /Join CSEG/i })
    expect(link).toHaveAttribute('href', '/join')
  })

  it('has a link to the About page', async () => {
    render(await Page())
    const link = screen.getByRole('link', { name: /About CSEG/i })
    expect(link).toHaveAttribute('href', '/about')
  })
})
