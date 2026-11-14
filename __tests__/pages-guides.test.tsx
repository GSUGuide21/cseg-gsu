import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'

import { EateryCard } from '@/globals/Eateries'
import { PastEvents } from '@/globals/Events'
import { GuidePicks } from '@/globals/GuidePicks'
import { footerWithPages, NAV_LINKS, navWithPages } from '@/globals/config/nav'
import { GUIDE_KINDS, parseDocument, parseGuidePick, parsePlace, PICK_LIMITS, TIP_MAX } from '@/lib/dashboard/validate'
import type { ClubEvent } from '@/lib/data/events'
import type { Place } from '@/lib/data/places'
import type { Eatery } from '@/lib/eateries'
import { eventTerm, groupByTerm } from '@/lib/events'
import { pickChoices, picksFor, PICK_ITEMS_SHOWN } from '@/lib/guidePicks'
import type { Resource } from '@/lib/resources'
import { isReservedSlug, isSitePage, pageHref } from '@/lib/sitePages'

const form = (fields: Record<string, string | string[]>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) for (const value of [v].flat()) f.append(k, value)
  return f
}

const event = (id: string, start: string, over: Partial<ClubEvent> = {}): ClubEvent => ({ id, name: `Event ${id}`, start, end: start.replace('T13', 'T14'), description: '', ...over })

describe('past events, by term', () => {
  it('names the term an event fell in, on Atlanta’s calendar', () => {
    expect(eventTerm('2026-04-23T14:00:00-04:00')).toBe('Spring 2026')
    expect(eventTerm('2026-06-10T14:00:00-04:00')).toBe('Summer 2026')
    expect(eventTerm('2025-10-22T15:00:00-04:00')).toBe('Fall 2025')
    // New Year's Eve in Atlanta is already January in UTC
    expect(eventTerm('2026-01-01T03:00:00Z')).toBe('Fall 2025')
  })

  it('groups them in the order given, a term at a time', () => {
    const groups = groupByTerm([event('a', '2026-04-09T13:00:00-04:00'), event('b', '2026-02-26T13:00:00-05:00'), event('c', '2025-12-04T13:00:00-05:00')])
    expect(groups.map((g) => [g.term, g.events.map((e) => e.id)])).toEqual([
      ['Spring 2026', ['a', 'b']],
      ['Fall 2025', ['c']],
    ])
  })

  it('opens the latest term and folds the rest under their names and counts', () => {
    render(
      <PastEvents
        events={[
          event('a', '2026-04-09T13:00:00-04:00', { location: 'Student Center West 460', href: 'https://pin.gsu.edu/event/1' }),
          event('b', '2026-02-26T13:00:00-05:00'),
          event('c', '2025-12-04T13:00:00-05:00'),
        ]}
      />
    )
    const [spring, fall] = screen.getAllByRole('group')
    expect(spring).toHaveAttribute('open')
    expect(fall).not.toHaveAttribute('open')
    expect(within(spring).getByText('2 events')).toBeInTheDocument()
    expect(within(fall).getByText('1 event')).toBeInTheDocument()
    expect(within(spring).getByRole('link', { name: /View on PIN/ })).toHaveAttribute('href', 'https://pin.gsu.edu/event/1')
  })

  it('says so when there’s nothing yet', () => {
    render(<PastEvents events={[]} />)
    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument()
  })
})

describe('where a page lives', () => {
  it('takes over the site’s own pages, Events, Executives and the Map among them', () => {
    for (const slug of ['about', 'events', 'executives', 'map']) expect(isSitePage(slug)).toBe(true)
    expect(pageHref('events')).toBe('/events')
  })

  it('keeps pages off addresses the site uses for something else', () => {
    for (const slug of ['posts', 'pages', 'dashboard', 'search', 'affiliates']) expect(isReservedSlug(slug)).toBe(true)
    expect(isReservedSlug('guides')).toBe(false)
  })

  it('reads a page’s parent and its place in the menu from the form', () => {
    const parent = '11111111-1111-4111-8111-111111111111'
    const parsed = parseDocument(form({ title: 'Parking', parent_id: parent, nav_placement: 'both', nav_label: ' Parking tips ', nav_sort: '20' }))
    expect(parsed).toMatchObject({ ok: true, data: { slug: 'parking', parent_id: parent, nav_placement: 'both', nav_label: 'Parking tips', nav_sort: 20 } })
    // Left alone, a page is at the top and out of the menu
    expect(parseDocument(form({ title: 'Parking' }))).toMatchObject({ ok: true, data: { parent_id: null, nav_placement: 'none', nav_label: null, nav_sort: 0 } })
    expect(parseDocument(form({ title: 'Parking', parent_id: 'nope', nav_placement: 'sidebar' }))).toMatchObject({ ok: false, errors: { parent_id: expect.any(String), nav_placement: expect.any(String) } })
  })
})

describe('the menu, with officers’ pages', () => {
  const guide = { href: '/guide', label: 'Guide', description: 'A first-month guide.' }
  const parking = { href: '/guide/parking', label: 'Parking' }

  it('is the site’s own when there are none', () => {
    expect(navWithPages(NAV_LINKS, [])).toBe(NAV_LINKS)
    expect(footerWithPages([]).map((s) => s.title)).toEqual(['About', 'Campus', 'Resources', 'Get involved', 'Officers'])
  })

  it('gives one page its own item, and several a More menu', () => {
    expect(navWithPages(NAV_LINKS, [guide]).at(-1)).toEqual({ href: '/guide', label: 'Guide' })
    const more = navWithPages(NAV_LINKS, [guide, parking]).at(-1)
    expect(more).toMatchObject({ label: 'More', href: '/guide' })
    expect(more?.menu?.links).toEqual([guide, parking])
  })

  it('adds a More section to the footer', () => {
    expect(footerWithPages([guide]).at(-1)).toEqual({ title: 'More', links: [guide] })
  })
})

const eatery = (id: string, over: Partial<Eatery> = {}): Eatery => ({ id, name: `Eatery ${id}`, area: 'campus', address: '1 Park Place', description: '', ...over })
const resource = (id: string, over: Partial<Resource> = {}): Resource => ({ id, group: 'academics', label: `Resource ${id}`, href: `https://example.edu/${id}`, description: '', ...over })
const place = (id: string, category: Place['category'], over: Partial<Place> = {}): Place => ({ id, name: `Place ${id}`, category, lat: 33.75, lng: -84.38, description: '', ...over })

describe('curated picks', () => {
  const eateries = [
    eatery('hall', { diningHall: true, schedule: [{ days: [1, 2, 3, 4, 5], open: '07:00', close: '21:00' }] }),
    eatery('late', { schedule: [{ days: [5, 6], open: '11:00', close: '02:00' }] }),
    eatery('early', { schedule: [{ days: [1], open: '07:00', close: '15:00' }] }),
    eatery('shut', { status: 'Closed for break', schedule: [{ days: [1], open: '07:00', close: '23:00' }] }),
  ]

  it('starts each guide with picks drawn from what the site lists', () => {
    const eat = picksFor('eat', [], { eateries })
    expect(eat.map((p) => [p.title, p.items.map((i) => i.id)])).toEqual([
      ['All you can eat', ['hall']],
      // Past midnight counts as late; one that's closed for now doesn't
      ['Open late', ['late']],
    ])
    const map = picksFor('map', [], { places: [place('lib', 'study'), place('lounge', 'student-life', { alsoIn: ['study'] }), place('five-points', 'transit')] })
    expect(map.map((p) => [p.title, p.items.map((i) => i.id)])).toEqual([
      ['Where to study', ['lib', 'lounge']],
      ['MARTA near campus', ['five-points']],
    ])
    expect(map[0].items[0].href).toBe('/map?place=lib')
  })

  it('names the built-in resource picks only from resources that exist', () => {
    const picks = picksFor('resources', [], { resources: [resource('paws'), resource('panther-pantry'), resource('something-else')] })
    expect(picks.map((p) => [p.id, p.items.map((i) => i.id)])).toEqual([
      ['first-week', ['paws']],
      ['tight-budget', ['panther-pantry']],
    ])
    expect(picks[0].items[0]).toMatchObject({ href: 'https://example.edu/paws', external: true })
  })

  it('shows officers’ own in place of the built-in ones, in their order, leaving out what’s gone', () => {
    const rows = [
      { id: 'p1', title: 'Cheap eats', description: null, icon: 'money', items: ['early', 'gone', 'late'] },
      { id: 'p2', title: 'All gone', description: 'Nothing left', icon: 'star', items: ['gone'] },
    ]
    const picks = picksFor('eat', rows, { eateries })
    expect(picks).toHaveLength(1)
    expect(picks[0]).toMatchObject({ id: 'p1', title: 'Cheap eats', icon: 'money' })
    expect(picks[0].items.map((i) => [i.id, i.href])).toEqual([
      ['early', '/eat#early'],
      ['late', '/eat#late'],
    ])
  })

  it('keeps a pick short', () => {
    const many = Array.from({ length: 12 }, (_, i) => eatery(`e${i}`))
    const [pick] = picksFor('eat', [{ id: 'p', title: 'Everything', description: null, icon: 'star', items: many.map((e) => e.id) }], { eateries: many })
    expect(pick.items).toHaveLength(PICK_ITEMS_SHOWN)
    expect(pickChoices('eat', { eateries: many })).toHaveLength(12)
  })

  it('checks a collection before it’s saved', () => {
    expect(parseGuidePick(form({ guide: 'eat', title: ' Cheap  eats ', items: ['a', 'b', 'a'], icon: 'nope', published: 'on' }))).toEqual({
      ok: true,
      data: { guide: 'eat', title: 'Cheap eats', description: null, icon: 'star', items: ['a', 'b'], published: true },
    })
    expect(parseGuidePick(form({ guide: 'campus', title: '' }))).toMatchObject({ ok: false, errors: { guide: expect.any(String), title: expect.any(String), items: expect.any(String) } })
    const tooMany = Array.from({ length: PICK_LIMITS.items + 1 }, (_, i) => `i${i}`)
    expect(parseGuidePick(form({ guide: 'map', title: 'Big', items: tooMany }))).toMatchObject({ ok: false, errors: { items: expect.any(String) } })
    expect(Object.keys(GUIDE_KINDS).sort()).toEqual(['eat', 'map', 'resources'])
  })

  it('draws each as a card with its items as links, and nothing when there are none', () => {
    const { container, rerender } = render(<GuidePicks picks={picksFor('resources', [], { resources: [resource('paws', { label: 'PAWS' })] })} />)
    const section = screen.getByRole('region', { name: 'Curated picks' })
    expect(within(section).getByRole('heading', { level: 3, name: 'First-week essentials' })).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: /PAWS/ })).toHaveAttribute('href', 'https://example.edu/paws')
    rerender(<GuidePicks picks={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('insider tips', () => {
  it('show on an eatery’s card when it has one', () => {
    const { rerender } = render(<EateryCard eatery={eatery('hall', { tip: 'The line is shortest before 11.' })} />)
    expect(screen.getByText('The line is shortest before 11.')).toBeInTheDocument()
    rerender(<EateryCard eatery={eatery('hall')} />)
    expect(screen.queryByText(/Tip:/)).not.toBeInTheDocument()
  })

  it('are optional, and kept short', () => {
    const pin = { name: 'Library', category: 'study', lat: '33.7531', lng: '-84.3853' }
    expect(parsePlace(form(pin))).toMatchObject({ ok: true, data: { tip: null } })
    expect(parsePlace(form({ ...pin, tip: ' Fifth floor is silent. ' }))).toMatchObject({ ok: true, data: { tip: 'Fifth floor is silent.' } })
    expect(parsePlace(form({ ...pin, tip: 'x'.repeat(TIP_MAX + 1) }))).toMatchObject({ ok: false, errors: { tip: expect.any(String) } })
  })
})
