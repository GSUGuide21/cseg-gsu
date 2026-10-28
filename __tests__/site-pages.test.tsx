import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'

import { parseSections } from '@/lib/dashboard/validate'
import { GROUP_CHATS, RESOURCE_GROUPS } from '@/lib/data/resources'
import { PageSections } from '@/lib/richtext'
import { pageHref } from '@/lib/sitePages'
import type { PageRow } from '@/lib/supabase/types'

import { SITE_PAGE_SEEDS } from '../scripts/site-pages'

// What Supabase has published, per test (the routes ask before showing their own version)
const published: Record<string, PageRow | null> = {}
jest.mock('../app/lib/dashboard/public', () => ({ getPublishedPage: jest.fn(async (slug: string) => published[slug] ?? null) }))

import AboutPage from '../app/(page)/about/page'
import CustomPage from '../app/(page)/pages/[slug]/page'

const seed = (slug: string) => SITE_PAGE_SEEDS.find((p) => p.slug === slug)!

describe('the site’s pages, as dashboard pages', () => {
  it('passes each one through the same checks a save does, unchanged', () => {
    for (const page of SITE_PAGE_SEEDS) expect(parseSections(JSON.stringify(page.sections))).toEqual(page.sections)
  })

  it('makes About’s questions an FAQ that the header’s #faq link still reaches', () => {
    const { container } = render(<PageSections sections={seed('about').sections} />)
    const faq = container.querySelector('section#faq')!
    expect(within(faq as HTMLElement).getByRole('heading', { name: 'Common questions' })).toBeInTheDocument()
    expect(faq.querySelectorAll('details')).toHaveLength(4)
    expect(within(faq as HTMLElement).getByRole('link', { name: 'Join' })).toHaveAttribute('href', '/join')
    expect(screen.getByRole('link', { name: 'Join CSEG' })).toHaveAttribute('href', '/join')
  })

  it('keeps every resource link, and each group’s #link', () => {
    const { container } = render(<PageSections sections={seed('resources').sections} />)
    for (const g of RESOURCE_GROUPS) expect(container.querySelector(`section#${g.id}`)).toBeInTheDocument()
    expect(container.querySelector('section#chats')).toBeInTheDocument()
    const hrefs = [...container.querySelectorAll('article a')].map((a) => a.getAttribute('href'))
    for (const l of [...RESOURCE_GROUPS.flatMap((g) => g.links), ...GROUP_CHATS]) expect(hrefs).toContain(l.href)
  })

  it('shows the code’s page until one is published, then the published one', async () => {
    published.about = null
    render(await AboutPage())
    expect(screen.getByRole('heading', { level: 1, name: 'About CSEG' })).toBeInTheDocument()
    expect(screen.getByText('Mission')).toBeInTheDocument()

    published.about = {
      ...seed('about'),
      title: 'About us (from the dashboard)',
      id: 'p1',
      layout: 'sections',
      body: '',
      status: 'published',
      updated_by: null,
      created_at: '',
      updated_at: '',
    }
    render(await AboutPage())
    expect(screen.getByRole('heading', { level: 1, name: 'About us (from the dashboard)' })).toBeInTheDocument()
  })

  it('sends a site page’s /pages address to its own', async () => {
    expect(pageHref('about')).toBe('/about')
    expect(pageHref('guide')).toBe('/pages/guide')
    await expect(CustomPage({ params: Promise.resolve({ slug: 'about' }) })).rejects.toThrow(/NEXT_REDIRECT/)
  })
})
