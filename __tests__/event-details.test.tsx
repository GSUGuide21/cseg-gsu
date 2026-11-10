import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { ClubDetailsProvider } from '@/globals/ClubDetails'
import { clubDetailsFrom } from '@/lib/clubDetails'
import { ConnectGrid } from '@/globals/ConnectGrid'
import { EventCard } from '@/globals/Events'
import { TableOfContents } from '@/globals/Page/TableOfContents'
import { parseEvent } from '@/lib/dashboard/validate'
import type { ClubEvent } from '@/lib/data/events'
import { eventFromRow, eventState, eventToRow } from '@/lib/events'
import type { ClubEventRow } from '@/lib/supabase/types'

const form = (fields: Record<string, string | string[]>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) for (const one of [v].flat()) f.append(k, one)
  return f
}

const sessions = (...list: { start: string; end: string; location?: string }[]) => JSON.stringify(list)

const base: ClubEvent = { id: 'hub', name: 'The Hub', start: '2026-04-23T18:00:00.000Z', end: '2026-04-23T19:30:00.000Z', description: '' }

describe('an event’s sessions', () => {
  it('keep every time and place, soonest first, spanning first start to last end', () => {
    const parsed = parseEvent(
      form({
        name: 'Workshop series',
        sessions: sessions(
          { start: '2026-04-30T14:00', end: '2026-04-30T15:00', location: 'Student Center West 460' },
          { start: '2026-04-23T14:00', end: '2026-04-23T15:00', location: 'Student Center West 258' }
        ),
      }),
      null
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data.slug).toBe('workshop-series-2026-04-23')
    expect(parsed.data.starts_at).toBe('2026-04-23T18:00:00.000Z')
    expect(parsed.data.ends_at).toBe('2026-04-30T19:00:00.000Z')
    expect(parsed.data.location).toBe('Student Center West 258')
    expect(parsed.data.sessions.map((s) => s.location)).toEqual(['Student Center West 258', 'Student Center West 460'])
  })

  it('keep none besides the event’s own times when it meets once', () => {
    const parsed = parseEvent(form({ name: 'Vibez Talk', sessions: sessions({ start: '2026-04-09T13:00', end: '2026-04-09T15:00', location: '' }) }), null)
    expect(parsed.ok && parsed.data).toEqual(expect.objectContaining({ sessions: [], location: null, ends_at: '2026-04-09T19:00:00.000Z' }))
  })

  it('point out the one that’s wrong', () => {
    const parsed = parseEvent(
      form({ name: 'Series', sessions: sessions({ start: '2026-04-23T14:00', end: '2026-04-23T15:00' }, { start: '2026-04-30T14:00', end: '2026-04-30T13:00' }, { start: '', end: '' }) }),
      null
    )
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(Object.keys(parsed.errors).sort()).toEqual(['sessions.1.end', 'sessions.2.end', 'sessions.2.start'])
  })
})

describe('an event’s other details', () => {
  const when = sessions({ start: '2026-04-23T14:00', end: '2026-04-23T15:30' })

  it('keep its tags (once each, lowercase), status, online link, and picture’s words', () => {
    const parsed = parseEvent(
      form({ name: 'The Hub', sessions: when, status: 'cancelled', tags: ['Music', 'music', 'Free food'], online_url: 'https://teams.microsoft.com/l/x', image_url: 'https://x.co/a.png', image_alt: 'Flyer: The Hub' }),
      null
    )
    expect(parsed.ok && parsed.data).toEqual(expect.objectContaining({ status: 'cancelled', tags: ['music', 'free food'], online_url: 'https://teams.microsoft.com/l/x', image_alt: 'Flyer: The Hub' }))
  })

  it('drop the picture’s words when there’s no picture, and turn away a bad link or status', () => {
    expect(parseEvent(form({ name: 'The Hub', sessions: when, image_alt: 'Flyer' }), null)).toEqual(expect.objectContaining({ ok: true, data: expect.objectContaining({ image_alt: null }) }))
    const bad = parseEvent(form({ name: 'The Hub', sessions: when, online_url: 'zoom.us/j/1', status: 'maybe' }), null)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(['online_url', 'status'])
  })

  it('go into the table and back unchanged', () => {
    const event: ClubEvent = {
      ...base,
      cancelled: true,
      tags: ['music'],
      onlineUrl: 'https://x.co/live',
      imageAlt: 'Flyer',
      sessions: [
        { start: '2026-04-23T18:00:00.000Z', end: '2026-04-23T19:00:00.000Z', location: 'Student Center West 460' },
        { start: '2026-04-30T18:00:00.000Z', end: '2026-04-30T19:30:00.000Z' },
      ],
    }
    const row = { ...eventToRow(event), created_at: '', updated_at: '' } as ClubEventRow
    // With no PIN page, it takes its RSVPs on the site
    expect(eventFromRow(row)).toEqual({ ...event, rsvp: true })
  })
})

describe('an event’s state', () => {
  const at = (iso: string) => Date.parse(iso)
  it('is cancelled, on now (in any of its sessions), over, or to come', () => {
    const twice: ClubEvent = { ...base, end: '2026-04-30T19:30:00.000Z', sessions: [{ start: base.start, end: base.end }, { start: '2026-04-30T18:00:00.000Z', end: '2026-04-30T19:30:00.000Z' }] }
    expect(eventState({ ...base, cancelled: true }, at('2026-04-23T18:30:00Z'))).toBe('cancelled')
    expect(eventState(base, at('2026-04-23T18:30:00Z'))).toBe('live')
    expect(eventState(twice, at('2026-04-26T12:00:00Z'))).toBe('upcoming')
    expect(eventState(twice, at('2026-04-30T18:30:00Z'))).toBe('live')
    expect(eventState(base, at('2026-05-01T00:00:00Z'))).toBe('ended')
  })
})

describe('an event’s card', () => {
  it('marks a cancelled event, and no longer offers to RSVP or join', () => {
    render(<EventCard event={{ ...base, cancelled: true, href: 'https://pin.gsu.edu/event/1', onlineUrl: 'https://x.co/live' }} now={Date.parse('2026-04-20T00:00:00Z')} />)
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Join online/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View on PIN/ })).toBeInTheDocument()
  })

  it('lists each time it meets, its tags, and its picture’s words, and offers to join online while it’s on', () => {
    const event: ClubEvent = {
      ...base,
      end: '2026-04-30T19:30:00.000Z',
      imageSrc: 'https://x.co/flyer.png',
      imageAlt: 'Flyer: The Hub, April 23 and 30',
      tags: ['music', 'free food'],
      onlineUrl: 'https://x.co/live',
      sessions: [
        { start: base.start, end: base.end, location: 'Student Center West 466/468' },
        { start: '2026-04-30T18:00:00.000Z', end: '2026-04-30T19:30:00.000Z', location: 'Student Center West 460' },
      ],
    }
    render(<EventCard event={event} now={Date.parse('2026-04-23T18:30:00Z')} />)
    expect(screen.getByText('Happening now')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Meets 2 times' })).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('img', { name: 'Flyer: The Hub, April 23 and 30' })).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Tags' })).getByText('free food')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Join online now/ })).toHaveAttribute('href', 'https://x.co/live')
  })

  it('stops offering the online link once it’s over', () => {
    render(<EventCard event={{ ...base, onlineUrl: 'https://x.co/live' }} past />)
    expect(screen.queryByRole('link', { name: /Join online/ })).not.toBeInTheDocument()
  })
})

describe('Connect', () => {
  it('has a tile for each network with a link, and for email, leaving out the ones without', () => {
    render(
      <ClubDetailsProvider details={clubDetailsFrom({ contact_email: 'officers@gsu.edu', instagram_url: 'https://www.instagram.com/panthers_cseg/' })}>
        <ConnectGrid />
      </ClubDetailsProvider>
    )
    const grid = screen.getByRole('list', { name: 'Ways to connect' })
    expect(within(grid).getByRole('link', { name: /Instagram/ })).toHaveAttribute('href', 'https://www.instagram.com/panthers_cseg/')
    expect(within(grid).getByRole('link', { name: /Email/ })).toHaveAttribute('href', 'mailto:officers@gsu.edu')
    expect(within(grid).getByRole('link', { name: /PIN/ })).toBeInTheDocument()
    expect(within(grid).queryByRole('link', { name: /GroupMe/ })).not.toBeInTheDocument()
  })
})

describe('the contents, floating', () => {
  // Tells the observer watching the list on the page (a <details>) where it's gone
  let report: ((entries: Partial<IntersectionObserverEntry>[]) => void) | null = null
  beforeEach(() => {
    report = null
    window.IntersectionObserver = class {
      constructor(private cb: (e: Partial<IntersectionObserverEntry>[]) => void) {}
      observe(el: Element) {
        if (el.tagName === 'DETAILS') report = (entries) => this.cb(entries.map((e) => ({ target: el, ...e })))
      }
      disconnect() {}
    } as unknown as typeof IntersectionObserver
  })

  it('shows a Contents button once the list on the page scrolls away, which opens it from there', () => {
    render(<TableOfContents entries={[{ id: 'article-i', marker: 'I', label: 'Name' }, { id: 'glossary', label: 'Glossary' }]} />)
    expect(screen.queryByRole('button', { name: /Contents/ })).not.toBeInTheDocument()

    act(() => report?.([{ isIntersecting: false, boundingClientRect: { top: -200 } as DOMRect }]))
    const button = screen.getByRole('button', { name: /Contents/ })
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const panel = document.getElementById('floating-contents')!
    fireEvent.click(within(panel).getByRole('link', { name: /Glossary/ }))
    expect(document.getElementById('floating-contents')).toBeNull()
  })
})
