import { PLACES } from '@/lib/data/places'
import { TOURS, tourFromLink } from '@/lib/data/tour'

describe('tours', () => {
  it('have unique ids and stop at real places, each once', () => {
    expect(new Set(TOURS.map((t) => t.id)).size).toBe(TOURS.length)
    const ids = new Set(PLACES.map((p) => p.id))
    for (const tour of TOURS) {
      const stops = tour.stops.map((s) => s.placeId)
      expect(stops.filter((id) => !ids.has(id))).toEqual([])
      expect(new Set(stops).size).toBe(stops.length)
    }
  })

  it('can’t be mistaken for an old stop-number link', () => {
    expect(TOURS.filter((t) => /^\d+$/.test(t.id))).toEqual([])
  })
})

describe('tourFromLink', () => {
  it('opens a tour at a stop', () => {
    expect(tourFromLink('commuter', '2')).toEqual({ tour: TOURS[1], step: 1 })
  })

  it('starts at the first stop when none is given or it doesn’t exist', () => {
    expect(tourFromLink('commuter')?.step).toBe(0)
    expect(tourFromLink('commuter', '99')?.step).toBe(0)
    expect(tourFromLink('commuter', 'x')?.step).toBe(0)
  })

  it('keeps old ?tour=3 links on the first tour', () => {
    expect(tourFromLink('3')).toEqual({ tour: TOURS[0], step: 2 })
  })

  it('ignores missing and unknown tours', () => {
    expect(tourFromLink()).toBeUndefined()
    expect(tourFromLink('nope', '2')).toBeUndefined()
  })
})
