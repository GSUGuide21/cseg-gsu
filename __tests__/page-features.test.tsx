import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'

import { ManagedPage, managedPageMetadata } from '@/globals/Page/ManagedPage'
import { SiteContentProvider } from '@/globals/SiteContent'
import { parseDocument } from '@/lib/dashboard/validate'
import type { ClubEvent } from '@/lib/data/events'
import { NO_SITE_CONTENT } from '@/lib/references'
import { plainText, RichContent } from '@/lib/richtext'
import { hasLiveBlock, parseEventCount, parsePlaceId, parseScheduleItems, parseStats, parseTestimonials } from '@/lib/richtext/blocks'

// ManagedPage pulls in the server's data helpers; these tests only draw pages without live blocks
jest.mock('../app/lib/dashboard/public', () => ({ getSiteContent: jest.fn() }))

const form = (fields: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries({ title: 'Guide', slug: 'guide', status: 'published', ...fields })) f.set(k, v)
  return f
}

describe('page settings', () => {
  it('reads the label, share image, what shows under the title, and the schedule', () => {
    const parsed = parseDocument(
      form({ eyebrow: 'Welcome Week', share_image_url: 'https://example.com/a.png', show_toc: 'on', publish_at: '2026-11-02T14:00:00.000Z', unpublish_at: '2026-11-09T14:00:00.000Z' })
    )
    expect(parsed.ok && parsed.data).toMatchObject({
      eyebrow: 'Welcome Week',
      share_image_url: 'https://example.com/a.png',
      show_toc: true,
      show_updated: false,
      publish_at: '2026-11-02T14:00:00.000Z',
      unpublish_at: '2026-11-09T14:00:00.000Z',
    })
  })

  it('turns away a share image off https, a label too long, and a page taken down before it goes up', () => {
    const parsed = parseDocument(form({ eyebrow: 'x'.repeat(41), share_image_url: 'http://example.com/a.png', publish_at: '2026-11-09T14:00:00Z', unpublish_at: '2026-11-02T14:00:00Z' }))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(Object.keys(parsed.errors).sort()).toEqual(['eyebrow', 'share_image_url', 'unpublish_at'])
  })

  it('puts the share image in link previews', () => {
    const meta = managedPageMetadata({ title: 'Guide', description: null, share_image_url: 'https://example.com/a.png' }, 'Fallback')
    expect(meta.description).toBe('Fallback')
    expect(meta.openGraph).toMatchObject({ title: 'Guide', images: [{ url: 'https://example.com/a.png' }] })
  })
})

describe('managed pages', () => {
  const sections = [
    { id: 's1', title: 'Getting started', subtitle: '', anchor: '', body: '' },
    { id: 's2', title: 'Finding help', subtitle: '', anchor: '', body: '' },
  ]
  const page = { title: 'Guide', subtitle: null, description: null, layout: 'sections' as const, sections, body: '', updated_at: '2026-10-29T15:00:00Z' }

  it('lists the sections on this page, with a label and the date it was updated', () => {
    render(<ManagedPage page={{ ...page, eyebrow: 'Welcome Week', show_toc: true, show_updated: true }} />)
    const nav = screen.getByRole('navigation', { name: 'On this page' })
    expect(within(nav).getByRole('link', { name: 'Finding help' })).toHaveAttribute('href', '#finding-help')
    expect(screen.getByText('Welcome Week')).toBeInTheDocument()
    expect(screen.getByText(/Updated/)).toHaveTextContent('Updated Oct 29, 2026')
  })

  it('leaves them out unless asked', () => {
    render(<ManagedPage page={page} eyebrow="About" />)
    expect(screen.queryByRole('navigation', { name: 'On this page' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
  })
})

describe('new blocks', () => {
  const doc = (...children: ({ type: string } & Record<string, unknown>)[]) => ({ type: 'root', children })

  it('reads only complete entries', () => {
    expect(parseStats([{ value: '120+', label: 'members' }, { value: '5' }])).toEqual([{ value: '120+', label: 'members' }])
    expect(parseScheduleItems([{ time: '5 PM', title: 'Doors' }, { time: '6 PM' }])).toEqual([{ time: '5 PM', title: 'Doors', text: '' }])
    expect(parseTestimonials([{ quote: 'Great club', name: 'Jo' }, { name: 'No quote' }])).toEqual([{ quote: 'Great club', name: 'Jo', role: '' }])
    expect(parsePlaceId('student-center-west')).toBe('student-center-west')
    expect(parsePlaceId('<script>')).toBe('')
    expect(parseEventCount(99)).toBe(2)
  })

  it('draws stats, a schedule, and a testimonial, and counts their words', () => {
    const root = doc(
      { type: 'stats', items: [{ value: '120+', label: 'members' }] },
      { type: 'schedule', items: [{ time: '5:00 PM', title: 'Doors open', text: 'Snacks' }] },
      { type: 'testimonial', items: [{ quote: 'CSEG is how I found my people.', name: 'Jordan Lee', role: 'Sophomore' }] }
    )
    render(<RichContent root={root} />)
    expect(screen.getByText('120+')).toBeInTheDocument()
    expect(screen.getByText('Doors open')).toBeInTheDocument()
    expect(screen.getByText('Jordan Lee')).toBeInTheDocument()
    expect(plainText(JSON.stringify({ root }))).toContain('120+ members')
  })

  it('shows the next events, or a line when none are scheduled', () => {
    const events: ClubEvent[] = [{ id: 'e1', name: 'Game Night', start: '2026-11-05T22:00:00Z', end: '2026-11-06T00:00:00Z', description: 'Board games.' }]
    const root = doc({ type: 'events', count: 2, whenNone: 'note' })
    const { unmount } = render(
      <SiteContentProvider content={{ ...NO_SITE_CONTENT, events }}>
        <RichContent root={root} />
      </SiteContentProvider>
    )
    expect(screen.getByText('Game Night')).toBeInTheDocument()
    unmount()
    render(
      <SiteContentProvider content={NO_SITE_CONTENT}>
        <RichContent root={root} />
      </SiteContentProvider>
    )
    expect(screen.getByText(/Nothing’s scheduled right now/)).toBeInTheDocument()
  })

  it('pins a map place, with links to the map and directions', () => {
    render(
      <SiteContentProvider content={NO_SITE_CONTENT}>
        <RichContent root={doc({ type: 'place', placeId: 'student-center-west', note: 'Room 259' })} />
      </SiteContentProvider>
    )
    expect(screen.getByRole('heading', { name: 'Student Center West' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open on the campus map' })).toHaveAttribute('href', '/map?place=student-center-west')
    expect(screen.getByRole('link', { name: /Walking directions/ })).toHaveAttribute('href', '/map?to=student-center-west')
  })

  it('marks events and map places as live, so the page gets what they draw from', () => {
    expect(hasLiveBlock('{"type":"events","count":2}')).toBe(true)
    expect(hasLiveBlock('{"type":"place","placeId":"x"}')).toBe(true)
    expect(hasLiveBlock('{"type":"stats"}')).toBe(false)
  })
})
