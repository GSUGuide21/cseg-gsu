import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'

import { CORE_VALUES } from '@/globals/config/club'
import { CoreValues } from '@/globals/Page/CoreValues'
import { PageSections, plainText } from '@/lib/richtext'

import { SITE_PAGE_SEEDS } from '../scripts/site-pages'

describe('the core values', () => {
  it('spell CAMPUS, in order', () => {
    expect(CORE_VALUES.map((v) => v.title[0]).join('')).toBe('CAMPUS')
  })

  it('read as each value by name, telling a screen reader the word they spell', () => {
    render(<CoreValues />)
    expect(screen.getByText('Six values whose first letters spell CAMPUS.')).toBeInTheDocument()
    const values = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(values.map((li) => within(li).getByRole('heading', { level: 3 }).textContent)).toEqual(CORE_VALUES.map((v) => v.title))
  })

  it('are on the About page the dashboard starts from, as the Core values block, at #values', () => {
    const about = SITE_PAGE_SEEDS.find((p) => p.slug === 'about')!
    const section = about.sections.find((s) => s.anchor === 'values')!
    expect(about.sections.indexOf(section)).toBe(1)
    const { container } = render(<PageSections sections={[section]} />)
    expect(container.querySelector('section#values')).toBeInTheDocument()
    expect(screen.getByText('Six values whose first letters spell CAMPUS.')).toBeInTheDocument()
    // Its words, for search and the plain text, are the values'
    expect(plainText(section.body)).toContain('Accessibility: Everyone belongs at the table')
  })
})
