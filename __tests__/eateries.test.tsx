import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'

import { SiteContentProvider } from '@/globals/SiteContent'
import { toCsv } from '@/lib/csv'
import { parseClosure, parseEatery, parseGroups, parseResource } from '@/lib/dashboard/validate'
import { EATERIES } from '@/lib/data/eats'
import { getPlace, placesWithEateries } from '@/lib/data/places'
import { applyClosures, BUILT_IN_AREAS, eateryFromRow, eateryToRow, parseSchedule, type Eatery } from '@/lib/eateries'
import { DocumentBody, plainText } from '@/lib/richtext'
import { hasLiveBlock } from '@/lib/richtext/blocks'

const saved = (...children: object[]) => JSON.stringify({ root: { type: 'root', version: 1, children } })

const form = (fields: Record<string, string | string[]>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) for (const one of [v].flat()) f.append(k, one)
  return f
}

const tacos: Eatery = {
  id: 'taco-spot',
  name: 'Taco Spot',
  area: 'park-place',
  address: '1 Park Place',
  description: 'Tacos.',
  schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], open: '00:00', close: '24:00' }],
  lat: 33.754,
  lng: -84.386,
}
const hall: Eatery = { id: 'big-hall', name: 'Big Hall', area: 'campus', diningHall: true, address: '', description: 'All you can eat.', placeId: 'piedmont-central' }

describe('References to an area’s eateries', () => {
  const block = (area: string, kind = 'all') => saved({ type: 'reference', version: 1, items: [{ kind: 'eateries', ref: kind === 'all' ? area : `${area}:${kind}` }] })

  it('shows an area’s eateries live, with their Open now badge and map link', () => {
    render(
      <SiteContentProvider content={{ eateries: [tacos, hall], areas: BUILT_IN_AREAS, resources: [], resourceGroups: [], posts: [], pages: [] }}>
        <DocumentBody source={block('park-place')} />
      </SiteContentProvider>
    )
    const card = screen.getByRole('heading', { name: 'Taco Spot' }).closest('article')!
    expect(within(card).getByText('Open 24/7')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'Show on map' })).toHaveAttribute('href', '/map?place=taco-spot')
    expect(screen.queryByText('Big Hall')).not.toBeInTheDocument()
  })

  it('shows only dining halls, or only the rest, when asked', () => {
    const { rerender } = render(
      <SiteContentProvider content={{ eateries: [tacos, hall, { ...tacos, id: 'cafe', name: 'Campus Café', area: 'campus' }], areas: BUILT_IN_AREAS, resources: [], resourceGroups: [], posts: [], pages: [] }}>
        <DocumentBody source={block('campus', 'dining-halls')} />
      </SiteContentProvider>
    )
    expect(screen.getByText('Big Hall')).toBeInTheDocument()
    expect(screen.queryByText('Campus Café')).not.toBeInTheDocument()
    rerender(
      <SiteContentProvider content={{ eateries: [tacos, hall, { ...tacos, id: 'cafe', name: 'Campus Café', area: 'campus' }], areas: BUILT_IN_AREAS, resources: [], resourceGroups: [], posts: [], pages: [] }}>
        <DocumentBody source={block('campus', 'others')} />
      </SiteContentProvider>
    )
    expect(screen.queryByText('Big Hall')).not.toBeInTheDocument()
    expect(screen.getByText('Campus Café')).toBeInTheDocument()
  })

  it('shows nothing for an unknown area, or without the list, and adds no words', () => {
    const { container } = render(<DocumentBody source={saved({ type: 'eateries', version: 1, area: 'mars' }, { type: 'eateries', version: 1, area: 'campus' })} />)
    expect(container.querySelector('article')).toBeNull()
    expect(plainText(block('campus'))).toBe('')
  })

  it('is found in saved writing, so a page knows to load the list', () => {
    expect(hasLiveBlock('', block('campus'))).toBe(true)
    expect(hasLiveBlock(saved({ type: 'cards', version: 1, items: [] }))).toBe(false)
  })
})

describe('eateries in the table', () => {
  it('keeps every built-in eatery as it was through a row and back', () => {
    for (const [i, e] of EATERIES.entries()) {
      const back = eateryFromRow({ ...eateryToRow(e, i), id: 'x', created_at: '', updated_at: '' } as never)!
      expect(back.id).toBe(e.id)
      expect(back.schedule).toEqual(e.schedule)
      expect(back.locations).toEqual(e.locations?.map((l) => ({ ...l, schedule: l.schedule })))
      expect(back.placeId).toBe(e.placeId)
    }
  })

  it('drops hours that aren’t hours', () => {
    expect(parseSchedule([{ days: [1, 9, 1], open: '07:00', close: '21:00' }, { days: [], open: '07:00', close: '21:00' }, { days: [2], open: '7am', close: '9pm' }, { days: [3], open: '09:00', close: '09:00' }])).toEqual([
      { days: [1], open: '07:00', close: '21:00' },
    ])
    expect(parseSchedule(null)).toBeUndefined()
  })

  it('gives the map the dashboard’s pins and dining hours', () => {
    const places = placesWithEateries([tacos, { ...hall, schedule: [{ days: [1], open: '07:00', close: '09:00' }] }])
    expect(places.find((p) => p.id === 'taco-spot')).toMatchObject({ category: 'food', lat: 33.754 })
    // A built-in eatery that's not in the dashboard's list is off the map
    expect(places.find((p) => p.id === EATERIES.find((e) => e.lat !== undefined)!.id)).toBeUndefined()
    // The dining hall's building takes its hours
    expect(places.find((p) => p.id === 'piedmont-central')?.schedule).toEqual([{ days: [1], open: '07:00', close: '09:00' }])
    expect(getPlace('piedmont-central')?.schedule).not.toEqual([{ days: [1], open: '07:00', close: '09:00' }])
  })
})

describe('an eatery from the dashboard', () => {
  it('reads one, its slug from its name, its hours and locations from their editors', () => {
    const parsed = parseEatery(
      form({
        name: 'Taco Spot',
        area: 'park-place',
        lat: '33.754',
        lng: '-84.386',
        schedule: JSON.stringify([{ days: [5, 6], open: '11:00', close: '02:00' }]),
        locations: JSON.stringify([{ label: 'Cart', lat: 33.75, lng: -84.38, schedule: null }]),
        aliases: ['Tacos', 'tacos', 'Late night'],
        published: 'on',
      }),
      null
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.data).toMatchObject({
      slug: 'taco-spot',
      schedule: [{ days: [5, 6], open: '11:00', close: '02:00' }],
      locations: [{ id: 'taco-spot-cart', label: 'Cart', lat: 33.75, lng: -84.38, schedule: null }],
      aliases: ['tacos', 'late night'],
      dining_hall: false,
      published: true,
    })
  })

  it('keeps its slug when renamed, so map links don’t break', () => {
    const parsed = parseEatery(form({ name: 'Taco Place', area: 'park-place' }), 'taco-spot')
    expect(parsed.ok && parsed.data.slug).toBe('taco-spot')
  })

  it('turns away a missing area, one coordinate, a pin off campus, and a building’s name', () => {
    const bad = parseEatery(form({ name: 'Piedmont Central', lat: '33.75', locations: JSON.stringify([{ label: 'Paris', lat: 48.85, lng: 2.35 }]) }), null)
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(Object.keys(bad.errors).sort()).toEqual(['area', 'lat', 'locations', 'name'])
  })
})

describe('closures and areas', () => {
  const winter = { label: 'winter break', starts_on: '2026-12-15', ends_on: '2027-01-10', eateries: ['taco-spot'] }

  it('closes the eateries a closure covers, only while it’s on', () => {
    const during = applyClosures([tacos, hall], [winter], '2026-12-20')
    expect(during[0]).toMatchObject({ status: 'Closed for winter break through Jan 10' })
    expect(during[1]).toBe(hall)
    // Before and after, nothing changes; the last day is still closed
    expect(applyClosures([tacos], [winter], '2026-12-14')[0]).toBe(tacos)
    expect(applyClosures([tacos], [winter], '2027-01-11')[0]).toBe(tacos)
    expect(applyClosures([tacos], [winter], '2027-01-10')[0].status).toMatch(/^Closed/)
  })

  it('reads as closed on the map too: hours never open, the notice first', () => {
    const [closed] = applyClosures([{ ...tacos, locations: [{ id: 'cart', label: 'Cart', lat: 33.75, lng: -84.38, schedule: tacos.schedule }] }], [winter], '2026-12-20')
    expect(closed.schedule).toEqual([])
    expect(closed.locations?.[0].schedule).toEqual([])
    const pin = placesWithEateries([closed]).find((p) => p.id === 'cart')!
    expect(pin.description).toMatch(/^Closed for winter break through Jan 10\./)
  })

  it('reads a closure from its form, turning away a backwards range and no eateries', () => {
    expect(parseClosure(form({ label: 'Thanksgiving', dates: ['2026-11-25', '2026-11-29'], eateries: ['a', 'a', 'b'] }))).toEqual({
      ok: true,
      data: { label: 'Thanksgiving', starts_on: '2026-11-25', ends_on: '2026-11-29', eateries: ['a', 'b'] },
    })
    const bad = parseClosure(form({ label: '', dates: ['2026-11-29', '2026-11-25'] }))
    expect(bad.ok === false && Object.keys(bad.errors).sort()).toEqual(['dates', 'eateries', 'label'])
  })

  it('reads the areas in order, keeping slugs, making new ones from names, and refusing repeats', () => {
    const parsed = parseGroups([{ slug: 'campus', title: 'On campus (Downtown)' }, { title: 'Summerhill', description: ' Near the stadium ' }])
    expect(parsed).toEqual({
      ok: true,
      data: [
        { slug: 'campus', title: 'On campus (Downtown)', description: null, sort: 10 },
        { slug: 'summerhill', title: 'Summerhill', description: 'Near the stadium', sort: 20 },
      ],
    })
    const twice = parseGroups([{ title: 'Midtown' }, { title: 'Midtown' }, { title: ' ' }])
    expect(twice.ok === false && twice.errors).toEqual({ 'area-1': 'Another area has this name.', 'area-2': 'Give it a name.' })
  })

  it('lets References follow a renamed or added area', () => {
    const areas = [{ slug: 'park-place', title: 'Park Place & Edgewood' }, { slug: 'summerhill', title: 'Summerhill' }]
    render(
      <SiteContentProvider content={{ eateries: [tacos, { ...tacos, id: 'wings', name: 'Wing Spot', area: 'summerhill' }], areas, resources: [], resourceGroups: [], posts: [], pages: [] }}>
        <DocumentBody source={saved({ type: 'reference', version: 1, items: [{ kind: 'eateries', ref: 'summerhill' }, { kind: 'eateries', ref: 'campus' }] })} />
      </SiteContentProvider>
    )
    expect(screen.getByRole('heading', { name: 'Wing Spot' })).toBeInTheDocument()
    // An area that's gone draws nothing
    expect(screen.queryByRole('heading', { name: 'Taco Spot' })).not.toBeInTheDocument()
  })
})

describe('a resource from the dashboard', () => {
  it('reads one, its slug from its name, and turns away a link that isn’t one', () => {
    expect(parseResource(form({ label: 'Panther Pantry', group_slug: 'money', href: 'https://pantry.gsu.edu', published: 'on' }), null)).toMatchObject({
      ok: true,
      data: { slug: 'panther-pantry', group_slug: 'money', href: 'https://pantry.gsu.edu', place_id: null, published: true },
    })
    const bad = parseResource(form({ label: 'Pantry', href: 'javascript:alert(1)' }), 'panther-pantry')
    expect(bad.ok === false && Object.keys(bad.errors).sort()).toEqual(['group_slug', 'href'])
  })
})

describe('spreadsheets from the dashboard', () => {
  it('quotes every cell, and keeps formula-looking text as text', () => {
    expect(toCsv(['Name', 'Note'], [['Ana "AJ" Lee', '=HYPERLINK("x")'], ['-5', null]])).toBe('"Name","Note"\r\n"Ana ""AJ"" Lee","\'=HYPERLINK(""x"")"\r\n"\'-5",""')
  })
})
