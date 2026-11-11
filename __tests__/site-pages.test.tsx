import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { parseSections } from '@/lib/dashboard/validate'
import { SiteContentProvider } from '@/globals/SiteContent'
import { BUILT_IN_AREAS } from '@/lib/eateries'
import { BUILT_IN_RESOURCE_GROUPS, BUILT_IN_RESOURCES } from '@/lib/resources'
import { PageSections } from '@/lib/richtext'
import { parseRankings } from '@/lib/richtext/blocks'
import { pageHref } from '@/lib/sitePages'
import { clubDetailsFrom, type ClubDetails } from '@/lib/clubDetails'
import type { PageRow } from '@/lib/supabase/types'

import { SITE_PAGE_SEEDS, STARTER_PAGE_SEEDS } from '../scripts/site-pages'

// What Supabase has published, per test (the routes ask before showing their own version)
const published: Record<string, PageRow | null> = {}
// And the details officers saved in Settings
const club: ClubDetails = clubDetailsFrom({ tagline: 'A line', meeting_info: 'Thursdays at 5 p.m., Student Center West', contact_email: 'officers@gsu.edu', instagram_url: 'https://www.instagram.com/panthers_cseg/' })
jest.mock('../app/lib/dashboard/public', () => ({
  getPublishedPage: jest.fn(async (slug: string) => published[slug] ?? null),
  getClubDetails: jest.fn(async () => club),
  // No questions from the dashboard: About keeps its own
  getFaqs: jest.fn(async () => []),
  getPageAt: jest.fn(async () => null),
  getPageRedirect: jest.fn(async () => null),
}))

// The Contact page's form sends through a server action
const sendContactMessage = jest.fn<Promise<{ ok: boolean; error?: string; errors?: Record<string, string> }>, [FormData]>(async () => ({ ok: true }))
jest.mock('../app/lib/dashboard/actions', () => ({ sendContactMessage: (form: FormData) => sendContactMessage(form) }))

import AboutPage from '../app/(page)/about/page'
import ContactPage from '../app/(page)/contact/page'
import CustomPage from '../app/(page)/pages/[slug]/page'

const seed = (slug: string) => SITE_PAGE_SEEDS.find((p) => p.slug === slug)!

describe('the site’s pages, as dashboard pages', () => {
  it('passes each one through the same checks a save does, unchanged', () => {
    for (const page of [...SITE_PAGE_SEEDS, ...STARTER_PAGE_SEEDS]) expect(parseSections(JSON.stringify(page.sections))).toEqual(page.sections)
  })

  it('seeds Panther Picks with rankings from the site’s own places, none cut short by a save', () => {
    const picks = STARTER_PAGE_SEEDS.find((p) => p.slug === 'panther-picks')!
    const rankings = picks.sections.flatMap((s) => JSON.parse(s.body).root.children).filter((b: { type: string }) => b.type === 'ranking')
    expect(rankings).toHaveLength(3)
    // What a save keeps is exactly what was seeded: no pick dropped, no field trimmed
    for (const r of rankings) expect(parseRankings(r.items)).toEqual(r.items)

    render(<PageSections sections={picks.sections} />)
    const late = within(document.querySelector('section#late-night') as HTMLElement)
    expect(late.getByRole('heading', { name: 'Number 1: Piedmont Central Dining Hall' })).toBeInTheDocument()
    expect(late.getAllByRole('link', { name: 'Show on map' })[0]).toHaveAttribute('href', '/map?place=piedmont-central')
  })

  it('makes About’s questions an FAQ that the header’s #faq link still reaches', () => {
    const { container } = render(<PageSections sections={seed('about').sections} />)
    const faq = container.querySelector('section#faq')!
    expect(within(faq as HTMLElement).getByRole('heading', { name: 'Common questions' })).toBeInTheDocument()
    expect(faq.querySelectorAll('details')).toHaveLength(4)
    expect(within(faq as HTMLElement).getByRole('link', { name: 'Join' })).toHaveAttribute('href', '/join')
    expect(screen.getByRole('link', { name: 'Join CSEG' })).toHaveAttribute('href', '/join')
  })

  it('keeps every resource link, live from the resources, and each group’s #link', () => {
    const { container } = render(
      <SiteContentProvider content={{ eateries: [], areas: BUILT_IN_AREAS, resources: BUILT_IN_RESOURCES, resourceGroups: BUILT_IN_RESOURCE_GROUPS, posts: [], pages: [] }}>
        <PageSections sections={seed('resources').sections} />
      </SiteContentProvider>
    )
    for (const g of BUILT_IN_RESOURCE_GROUPS) expect(container.querySelector(`section#${g.slug}`)).toBeInTheDocument()
    expect(container.querySelector('section#chats')).toBeInTheDocument()
    const hrefs = [...container.querySelectorAll('article a')].map((a) => a.getAttribute('href'))
    for (const r of BUILT_IN_RESOURCES) expect(hrefs).toContain(r.href)
  })

  it('shows the details officers saved on the Contact page', async () => {
    published.contact = null
    render(await ContactPage())
    expect(screen.getByRole('link', { name: /Email the officers/ })).toHaveAttribute('href', 'mailto:officers@gsu.edu')
    expect(screen.getByText('Thursdays at 5 p.m., Student Center West')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /@panthers_cseg/ })).toHaveAttribute('href', 'https://www.instagram.com/panthers_cseg/')
  })

  it('takes a message on the Contact page, and thanks them once it’s sent', async () => {
    published.contact = null
    render(await ContactPage())
    fireEvent.change(screen.getByRole('textbox', { name: /Your name/ }), { target: { value: 'Jordan Lee' } })
    fireEvent.change(screen.getByRole('textbox', { name: /Your email/ }), { target: { value: 'jlee@student.gsu.edu' } })
    fireEvent.change(screen.getByRole('textbox', { name: /^Message/ }), { target: { value: 'When is the next meeting?' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    })
    const sent = sendContactMessage.mock.calls.at(-1)![0]
    expect(Object.fromEntries(sent)).toMatchObject({ name: 'Jordan Lee', email: 'jlee@student.gsu.edu', body: 'When is the next meeting?', website: '' })
    expect(screen.getByRole('status')).toHaveTextContent('An officer will reply to jlee@student.gsu.edu')
  })

  it('says why a message didn’t send, and offers email instead', async () => {
    published.contact = null
    sendContactMessage.mockResolvedValueOnce({ ok: false, error: 'Too many messages from this address; try again in a few minutes.', errors: { body: 'Write your message.' } })
    render(await ContactPage())
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Too many messages')
    expect(within(screen.getByRole('alert')).getByRole('link', { name: 'officers@gsu.edu' })).toHaveAttribute('href', 'mailto:officers@gsu.edu')
    expect(screen.getByText('Write your message.')).toBeInTheDocument()
  })

  it('keeps the form under a Contact page officers published', async () => {
    published.contact = { ...seed('contact'), id: 'c1', status: 'published', layout: 'sections', body: '' } as unknown as PageRow
    render(await ContactPage())
    expect(screen.getByRole('heading', { name: 'Send us a message' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument()
    published.contact = null
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
      eyebrow: null,
      share_image_url: null,
      show_toc: false,
      show_updated: false,
      publish_at: null,
      review_requested: false,
      review_note: null,
      parent_id: null,
      nav_placement: 'none',
      nav_label: null,
      nav_sort: 0,
      unpublish_at: null,
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
    // A page officers wrote is at its own address, or under its parent's
    expect(pageHref('guide')).toBe('/guide')
    expect(pageHref('parking', 'guide')).toBe('/guide/parking')
    expect(pageHref('history', 'about')).toBe('/about/history')
    expect(pageHref('about', 'guide')).toBe('/about')
    await expect(CustomPage({ params: Promise.resolve({ slug: 'about' }) })).rejects.toThrow(/NEXT_REDIRECT/)
  })
})
