import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'

import { AccommodationsNote } from '@/globals/Events'
import { Wordmark } from '@/globals/Logo'
import { affiliateFromRow, affiliateToRow } from '@/lib/affiliates'
import { AFFILIATES, affiliateHref, type Affiliate } from '@/lib/data/affiliates'
import type { AffiliateRow, SponsorRow } from '@/lib/supabase/types'
import { PAST_EVENTS } from '@/lib/data/events'

// What the site reads: the built-in list until a test swaps in the dashboard's
let shown: readonly Affiliate[] = AFFILIATES
// The sponsors shown today; none unless a test adds some
let sponsors: SponsorRow[] = []
jest.mock('../app/lib/dashboard/public', () => ({
  pageMetadata: jest.fn(async () => ({ title: 'Affiliates', description: '' })),
  getAffiliates: jest.fn(async () => shown),
  getSponsors: jest.fn(async () => sponsors),
  getAffiliate: jest.fn(async (slug: string) => shown.find((a) => a.slug === slug)),
}))

import AffiliatesPage from '../app/(affiliate)/affiliates/page'
import AffiliatePage, { generateMetadata, generateStaticParams } from '../app/(affiliate)/affiliates/[affiliate]/page'

const params = (affiliate: string) => ({ params: Promise.resolve({ affiliate }) })

const row: AffiliateRow = {
  id: 'a1',
  slug: 'chess-club',
  name: 'Chess Club at Georgia State',
  short_name: 'Chess Club',
  wordmark_top: 'Chess',
  wordmark_bottom: 'Club',
  summary: null,
  description: 'We play chess.\n\nAll levels welcome.',
  instagram: 'gsuchess',
  pin_key: null,
  logo_url: 'https://example.supabase.co/storage/v1/object/public/media/chess.png',
  discord_url: null,
  sort: 10,
  published: true,
  created_at: '',
  updated_at: '',
}

describe('affiliates', () => {
  afterEach(() => {
    shown = AFFILIATES
    sponsors = []
  })

  it('lists sponsors under the affiliates once there are any, and not before', async () => {
    const { unmount } = render(await AffiliatesPage())
    expect(screen.queryByRole('heading', { name: 'Our sponsors' })).not.toBeInTheDocument()
    unmount()
    sponsors = [
      { id: 's1', name: 'Panther Pizza', href: 'https://pantherpizza.example', logo_url: null, tier: 'presenting', blurb: 'Feeds every meeting.', starts_on: null, ends_on: null, sort: 10, published: true, created_at: '', updated_at: '' },
    ]
    render(await AffiliatesPage())
    expect(screen.getByRole('heading', { name: 'Our sponsors' })).toBeInTheDocument()
    expect(screen.getByText('Presenting sponsor')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Visit Panther Pizza/ })).toHaveAttribute('href', 'https://pantherpizza.example')
  })

  it('lists each one with its wordmark and a link to its page', async () => {
    render(await AffiliatesPage())
    for (const a of AFFILIATES) {
      expect(screen.getByRole('img', { name: a.name })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: `About ${a.shortName}` })).toHaveAttribute('href', affiliateHref(a))
    }
  })

  it('builds a page for each, and none for anything else', async () => {
    expect(await generateStaticParams()).toEqual(AFFILIATES.map((a) => ({ affiliate: a.slug })))
    await expect(AffiliatePage(params('nobody'))).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/)
  })

  it('shows the dashboard’s affiliates once it has any, paragraphs and uploaded logo included', async () => {
    shown = [affiliateFromRow(row)]
    render(await AffiliatesPage())
    expect(screen.getByRole('link', { name: 'About Chess Club' })).toHaveAttribute('href', '/affiliates/chess-club')
    expect(screen.queryByRole('link', { name: /About Serve@State/ })).not.toBeInTheDocument()

    render(await AffiliatePage(params('chess-club')))
    expect(screen.getByRole('heading', { level: 1, name: 'Chess Club' })).toBeInTheDocument()
    expect(screen.getByText('We play chess.')).toBeInTheDocument()
    expect(screen.getByText('All levels welcome.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '@gsuchess' })).toHaveAttribute('href', 'https://www.instagram.com/gsuchess/')
  })

  it('round-trips the built-in list through the table unchanged', () => {
    for (const [i, a] of AFFILIATES.entries()) {
      const saved = affiliateToRow(a, i)
      expect(affiliateFromRow({ ...saved, id: 'x', created_at: '', updated_at: '' } as AffiliateRow)).toEqual(JSON.parse(JSON.stringify(a)))
    }
  })

  it('shows an affiliate’s own words and where to find it', async () => {
    render(await AffiliatePage(params('serve-at-state')))
    expect(screen.getByRole('heading', { level: 1, name: 'Serve@State' })).toBeInTheDocument()
    expect(screen.getByText(/maximize|leadership experiences, service projects/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Serve@State on PIN/ })).toHaveAttribute('href', 'https://pin.gsu.edu/organization/serve')
    expect(screen.getByRole('link', { name: '@serveatstate.gsu' })).toHaveAttribute('href', 'https://www.instagram.com/serveatstate.gsu/')
    expect((await generateMetadata(params('serve-at-state'))).title).toBe('Serve@State')
  })

  it('gives one with no PIN page just its Instagram, and its initials for a seal', async () => {
    render(await AffiliatePage(params('outspoken')))
    expect(screen.getByRole('heading', { level: 1, name: 'Outspoken@GSU' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /on PIN/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: /About/ })).not.toBeInTheDocument()
    expect(screen.getByText('OG')).toBeInTheDocument()
  })
})

describe('the wordmark', () => {
  it('is CSEG’s, linking home, unless it’s given another organization’s', () => {
    render(<Wordmark />)
    expect(screen.getByRole('link', { name: 'Campus Survival and Engagement Group home' })).toHaveAttribute('href', '/')
    render(<Wordmark brand={{ name: 'Lead Team', top: 'Lead', bottom: 'Team' }} href="/affiliates/lead-team" />)
    const lead = screen.getByRole('link', { name: 'Lead Team' })
    expect(lead).toHaveAttribute('href', '/affiliates/lead-team')
    expect(within(lead).getByText('LT')).toBeInTheDocument()
  })
})

describe('past events', () => {
  it('are newest first, each with its own id, ending after it starts', () => {
    const starts = PAST_EVENTS.map((e) => Date.parse(e.start))
    expect(starts).toEqual([...starts].sort((a, b) => b - a))
    expect(new Set(PAST_EVENTS.map((e) => e.id)).size).toBe(PAST_EVENTS.length)
    for (const e of PAST_EVENTS) expect(Date.parse(e.end)).toBeGreaterThan(Date.parse(e.start))
  })

  it('say how to ask for an accommodation', () => {
    render(<AccommodationsNote />)
    const note = screen.getByRole('complementary', { name: 'Accommodations' })
    expect(within(note).getByRole('link', { name: 'access@gsu.edu' })).toHaveAttribute('href', 'mailto:access@gsu.edu')
    expect(within(note).getByRole('link', { name: '(404) 413-1560' })).toHaveAttribute('href', 'tel:4044131560')
  })
})
