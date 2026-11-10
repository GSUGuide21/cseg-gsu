import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

import { atlantaToIso, isoToAtlanta } from '@/lib/dashboard/format'
import { parseEvent, parseExecutive } from '@/lib/dashboard/validate'
import type { ClubEvent } from '@/lib/data/events'
import { BUILT_IN_EVENTS, eventFromRow, eventSlug, eventToRow, splitEvents } from '@/lib/events'
import { executiveFromRow, parseService, serviceText, sortExecutives } from '@/lib/executives'
import type { ClubEventRow, ExecutiveRow } from '@/lib/supabase/types'

const shown: { executives: ReturnType<typeof executiveFromRow>[] } = { executives: [] }
jest.mock('../app/lib/dashboard/public', () => ({ getExecutives: jest.fn(async () => shown.executives) }))

import ExecutivesPage from '../app/(page)/executives/page'

const form = (fields: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}

const event = (id: string, start: string, end: string, href?: string): ClubEvent => ({ id, name: id, start, end, description: '', href })

const executive = (over: Partial<ExecutiveRow>): ExecutiveRow => ({
  id: 'x',
  first_name: 'Ada',
  last_name: 'Lovelace',
  role: 'Secretary',
  bio: '',
  is_founder: false,
  avatar_url: null,
  service: [{ startYear: 2025, endYear: null }],
  contact: {},
  published: true,
  created_at: '',
  updated_at: '',
  ...over,
})

describe('Atlanta’s clock', () => {
  it('turns a typed time into the moment it is there, in summer and in winter', () => {
    expect(atlantaToIso('2026-04-23T14:00')).toBe('2026-04-23T18:00:00.000Z')
    expect(atlantaToIso('2025-12-04T15:00')).toBe('2025-12-04T20:00:00.000Z')
    // The morning the clocks go back: 1:30 happens twice; either is a fair reading
    expect(['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z']).toContain(atlantaToIso('2026-11-01T01:30'))
    expect(atlantaToIso('tomorrow')).toBeNull()
  })

  it('reads a moment back as the field shows it', () => {
    for (const e of BUILT_IN_EVENTS) expect(atlantaToIso(isoToAtlanta(e.start))).toBe(new Date(e.start).toISOString())
    expect(isoToAtlanta('2026-04-23T14:00:00-04:00')).toBe('2026-04-23T14:00')
  })
})

describe('the club’s events', () => {
  it('make their id from the name and the day in Atlanta', () => {
    // 11 p.m. in Atlanta is the next day in UTC; the id keeps Atlanta's day
    expect(eventSlug('Vibez Talk!', '2026-04-10T03:00:00Z')).toBe('vibez-talk-2026-04-09')
    expect(eventSlug('!!!', '2026-04-10T03:00:00Z')).toBe('')
  })

  it('go into the table and back unchanged, ids and all', () => {
    for (const e of BUILT_IN_EVENTS) {
      const row = { ...eventToRow(e), created_at: '', updated_at: '' } as ClubEventRow
      // One with no PIN page takes its RSVPs on the site
      expect(eventFromRow(row)).toEqual({ ...e, location: e.location, href: e.href, imageSrc: e.imageSrc, rsvp: e.href ? undefined : true })
    }
  })

  it('split into upcoming, soonest first, and past, newest first, showing one PIN has once', () => {
    const now = Date.parse('2026-05-01T12:00:00Z')
    const own = [
      event('old', '2026-01-01T15:00:00Z', '2026-01-01T16:00:00Z'),
      event('older', '2025-01-01T15:00:00Z', '2025-01-01T16:00:00Z'),
      event('soon', '2026-05-10T15:00:00Z', '2026-05-10T16:00:00Z'),
      event('also-on-pin', '2026-05-03T15:00:00Z', '2026-05-03T16:00:00Z', 'https://pin.gsu.edu/event/1'),
    ]
    const pin = [event('pin-1', '2026-05-03T15:00:00Z', '2026-05-03T16:00:00Z', 'https://pin.gsu.edu/event/1')]
    const { upcoming, past } = splitEvents(own, pin, now)
    expect(upcoming.map((e) => e.id)).toEqual(['pin-1', 'soon'])
    expect(past.map((e) => e.id)).toEqual(['old', 'older'])
  })

  it('need a name, and an end after the start', () => {
    const bad = parseEvent(form({ name: '', starts_at: '2026-04-23T14:00', ends_at: '2026-04-23T13:00', href: 'pin.gsu.edu', image_url: 'http://x.png' }), null)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(['ends_at', 'href', 'image_url', 'name'])

    const good = parseEvent(form({ name: 'The Hub', starts_at: '2026-04-23T14:00', ends_at: '2026-04-23T15:30', published: 'on' }), null)
    expect(good).toEqual({
      ok: true,
      data: expect.objectContaining({ slug: 'the-hub-2026-04-23', starts_at: '2026-04-23T18:00:00.000Z', ends_at: '2026-04-23T19:30:00.000Z', location: null, href: null, published: true }),
    })
  })

  it('keep their id when renamed or moved', () => {
    const moved = parseEvent(form({ name: 'The Hub: Encore', starts_at: '2026-04-30T14:00', ends_at: '2026-04-30T15:30' }), 'the-hub-2026-04')
    expect(moved.ok && moved.data.slug).toBe('the-hub-2026-04')
  })
})

describe('executives', () => {
  it('say when they served as it’s typed', () => {
    expect(parseService('2022–2024, 2025-present')).toEqual({ ok: true, spans: [{ startYear: 2022, endYear: 2024 }, { startYear: 2025, endYear: null }] })
    expect(parseService('2023')).toEqual({ ok: true, spans: [{ startYear: 2023, endYear: 2023 }] })
    expect(parseService('2025 to now')).toEqual({ ok: true, spans: [{ startYear: 2025, endYear: null }] })
    expect(parseService('2024–2022').ok).toBe(false)
    expect(parseService('last year').ok).toBe(false)
    expect(parseService('2022–, 2025–').ok).toBe(false)
    expect(serviceText([{ startYear: 2022, endYear: 2024 }, { startYear: 2023, endYear: 2023 }, { startYear: 2025, endYear: null }])).toBe('2022–2024, 2023, 2025–present')
  })

  it('share only contact details that look right', () => {
    const bad = parseExecutive(form({ first_name: 'Ada', last_name: 'Lovelace', role: 'Secretary', service: '2025–present', 'contact.email': 'ada', 'contact.phone': '555', 'contact.linkedIn': 'linkedin.com/in/ada' }))
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(['contact.email', 'contact.linkedIn', 'contact.phone'])

    const good = parseExecutive(form({ first_name: 'Ada', last_name: 'Lovelace', role: 'Secretary', service: '2025–present', 'contact.email': 'Ada@GSU.edu', 'contact.website': '', published: 'on' }))
    expect(good.ok && good.data.contact).toEqual({ email: 'ada@gsu.edu' })
    expect(parseExecutive(form({ first_name: 'Ada', last_name: 'Lovelace', role: 'Secretary', service: '' })).ok).toBe(false)
  })

  it('are listed serving first, then by office as the constitution orders them', () => {
    const list = [
      executive({ id: 'past', first_name: 'Past', role: 'Executive Director', service: [{ startYear: 2022, endYear: 2024 }] }),
      executive({ id: 'sec', first_name: 'Sec', role: 'Secretary' }),
      executive({ id: 'ed', first_name: 'Ed', role: 'Executive Director' }),
    ].map((r) => ({ ...executiveFromRow(r), id: r.id }))
    expect(sortExecutives(list).map((e) => e.id)).toEqual(['ed', 'sec', 'past'])
  })

  it('show on the page, current and past, from the dashboard', async () => {
    shown.executives = [
      executiveFromRow(executive({ first_name: 'Ada', last_name: 'Lovelace', role: 'Executive Director', avatar_url: 'https://example.com/ada.jpg' })),
      executiveFromRow(executive({ first_name: 'Grace', last_name: 'Hopper', role: 'Director', service: [{ startYear: 2022, endYear: 2024 }] })),
    ]
    render(await ExecutivesPage())
    expect(screen.getByRole('heading', { level: 2, name: 'Current executives' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Past executives' })).toBeInTheDocument()
    // Current ones under what they do; past ones in a list of their own
    expect(screen.getByRole('heading', { level: 3, name: 'Leadership' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Ada Lovelace' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Grace Hopper' })).toBeInTheDocument()
    expect(screen.getByText('2022 – 2024')).toBeInTheDocument()
  })
})
