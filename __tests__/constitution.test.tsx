import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'

import { CONSTITUTION_ARTICLES, CONSTITUTION_GLOSSARY, itemText, toRoman, withLinks } from '@/lib/data/constitution'
import { PageSections, plainText } from '@/lib/richtext'
import { PAGE_SECTIONS_MAX } from '@/lib/supabase/types'
import type { PageRow } from '@/lib/supabase/types'

import { SITE_PAGE_SEEDS } from '../scripts/site-pages'

const published: Record<string, PageRow | null> = {}
jest.mock('../app/lib/dashboard/public', () => ({
  getPublishedPage: jest.fn(async (slug: string) => published[slug] ?? null),
}))

import ConstitutionPage from '../app/(page)/constitution/page'

const seed = SITE_PAGE_SEEDS.find((p) => p.slug === 'constitution')!

/** Every sentence-sized piece of the constitution, as the document words it */
const allWords = CONSTITUTION_ARTICLES.flatMap((a) => [...(a.blocks ?? []), ...(a.sections ?? []).flatMap((s) => s.blocks)]).flatMap((b) =>
  typeof b === 'string' ? [b] : b.items.map(itemText).flatMap((t) => t.split('\n'))
)

describe('the constitution', () => {
  it('numbers articles as the document does', () => {
    expect([1, 4, 9, 12].map(toRoman)).toEqual(['I', 'IV', 'IX', 'XII'])
  })

  it('links the web addresses in its words, keeping the full stop after one', () => {
    expect(withLinks('Visit it at https://pin.gsu.edu.')).toEqual(['Visit it at ', ['pin.gsu.edu', 'https://pin.gsu.edu'], '.'])
    expect(withLinks('No links here.')).toEqual(['No links here.'])
  })

  it('shows every article and section, with a contents list that links to each article', async () => {
    published.constitution = null
    const { container } = render(await ConstitutionPage())
    expect(screen.getByRole('heading', { level: 1, name: 'Constitution' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Article XII: Amendments' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Section 10: Resident Artist' })).toBeInTheDocument()

    const contents = screen.getByRole('navigation', { name: 'On this page' })
    CONSTITUTION_ARTICLES.forEach((_, i) => {
      const id = `article-${toRoman(i + 1).toLowerCase()}`
      expect(container.querySelector(`section#${id}`)).toBeInTheDocument()
      expect(within(contents).getAllByRole('link').map((a) => a.getAttribute('href'))).toContain(`#${id}`)
    })
    expect(container.querySelector('#article-iv-section-2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'pin.gsu.edu/organization/cseg' })).toHaveAttribute('href', 'https://pin.gsu.edu/organization/cseg')
    const terms = [...container.querySelectorAll('dt')].map((dt) => dt.textContent)
    expect(terms).toEqual(CONSTITUTION_GLOSSARY.map((g) => g.term))
  })

  it('seeds the dashboard with every word of it, an article to a section, listed under the title', () => {
    expect(seed.showToc).toBe(true)
    expect(seed.sections.length).toBeLessThanOrEqual(PAGE_SECTIONS_MAX)
    expect(seed.sections.slice(0, CONSTITUTION_ARTICLES.length).map((s) => s.anchor)).toEqual(CONSTITUTION_ARTICLES.map((_, i) => `article-${toRoman(i + 1).toLowerCase()}`))
    const seeded = seed.sections.map((s) => plainText(s.body)).join('\n')
    // A link shows its address without the https://
    for (const words of allWords) expect(seeded).toContain(words.replaceAll('https://', ''))
  })

  it('numbers a seeded list straight on past a list inside it', () => {
    // Article V, Section 2: the officers' list sits between items 2 and 3
    const article = seed.sections.find((s) => s.anchor === 'article-v')!
    const { container } = render(<PageSections sections={[article]} />)
    const item = [...container.querySelectorAll('li')].find((li) => li.textContent?.startsWith('No officer shall hold'))
    expect(item).toHaveAttribute('value', '3')
  })
})
