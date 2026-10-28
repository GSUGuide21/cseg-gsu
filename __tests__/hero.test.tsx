import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

import { HeroSection } from '@/(page)/components/Hero'

describe('HeroSection', () => {
  it('renders its title, text, actions, and image', () => {
    render(
      <HeroSection
        title="Find your way around campus"
        subtitle="Maps, eats, and study spots"
        description="Every building and room."
        action={[{ href: '/map', label: 'Open the map' }, '/about']}
        image={{ src: '/assets/quad.jpg', alt: 'Students on the quad' }}
      />
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Find your way around campus' })).toBeInTheDocument()
    expect(screen.getByText('Maps, eats, and study spots')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the map' })).toHaveAttribute('href', '/map')
    // An action given as just an href gets a default label
    expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', '/about')
    expect(screen.getByRole('img', { name: 'Students on the quad' })).toBeInTheDocument()
  })

  it('takes an h2 title and leaves out what it isn’t given', () => {
    const { container } = render(<HeroSection titleAs="h2" title="Welcome Week" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Welcome Week' })).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})
