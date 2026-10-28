import { CONNECTIONS } from '../app/lib/data/connections'
import { ENTRANCES } from '../app/lib/data/entrances'
import { PLACES, getPlace } from '../app/lib/data/places'
import graph from '../app/lib/data/walk-graph.json'
import { distanceMeters } from '../app/lib/geo'
import { describe as describeSteps, EDGE, Router, type WalkGraph } from '../app/lib/wayfinding'

const router = new Router(graph as WalkGraph, ENTRANCES, CONNECTIONS)
const FROM = { placeId: 'student-center-east' }

describe('walk graph', () => {
  it('reaches every place on the map', () => {
    const unreachable = PLACES.filter((p) => !router.route(FROM, { placeId: p.id })).map((p) => p.id)
    expect(unreachable).toEqual([])
  })

  it('keeps campus routes close to the straight-line distance', () => {
    const origin = getPlace('student-center-east')!
    const detours = PLACES.filter((p) => distanceMeters(origin, p) > 150 && distanceMeters(origin, p) < 1500)
      .map((p) => ({ id: p.id, ratio: router.route(FROM, { placeId: p.id })!.meters / distanceMeters(origin, p) }))
      .filter((r) => r.ratio > 2.2)
    expect(detours).toEqual([])
  })

  it('avoids stairs when asked', () => {
    for (const p of PLACES.slice(0, 40)) {
      const route = router.route(FROM, { placeId: p.id }, { avoidStairs: true })
      if (route) expect(route.usesStairs).toBe(false)
    }
  })

  it('points every connection and entrance at a real place', () => {
    const ids = [...CONNECTIONS.flatMap((c) => c.ends ?? []), ...Object.keys(ENTRANCES)]
    expect(ids.filter((id) => !getPlace(id))).toEqual([])
  })

  it('crosses between the libraries on The Link', () => {
    for (const [a, b] of [
      ['library-north', 'library-south'],
      ['library-south', 'library-north'],
    ]) {
      const route = router.route({ placeId: a }, { placeId: b })!
      expect(route.connections).toContain('the-link')
      expect(route.minutes).toBeLessThanOrEqual(2)
    }
  })

  it('enters Library North by its front entrance on the Greenway', () => {
    const route = router.route(FROM, { placeId: 'library-north' })!
    expect(route.to).toBe('entrance')
    expect(route.connections).toContain('gsu-greenway')
  })

  it('leaves Student Center West from its 3rd floor onto raised Courtland Street', () => {
    const route = router.route({ placeId: 'student-center-west' }, { placeId: 'library-north' })!
    expect(route.from).toBe('entrance')
    expect(route.steps[0].label).toBe('Courtland Street SE')
  })

  it('snaps a door onto its own stretch of sidewalk, not the nearest corner', () => {
    const door = ENTRANCES['student-center-west']![0]
    const node = router.snap(door)
    expect(distanceMeters(door, router.point(node))).toBeLessThan(5)
  })

  it('takes the Greenway across the middle of campus', () => {
    for (const [a, b] of [
      ['student-center-east', 'langdale-hall'],
      ['langdale-hall', 'student-center-west'],
      ['arts-humanities', 'university-bookstore'],
    ]) {
      expect(router.route({ placeId: a }, { placeId: b })!.connections).toContain('gsu-greenway')
    }
  })

  it('names the Decatur Street bridge in directions', () => {
    const route = router.route({ placeId: 'urban-life' }, { placeId: 'sports-arena' })!
    expect(route.steps.map((s) => s.label)).toContain('Decatur Street pedestrian bridge')
  })

  it('finds a step-free way in when a building’s close sides are all up stairs', () => {
    const route = router.route({ placeId: 'student-center-west' }, { placeId: 'classroom-south' }, { avoidStairs: true })
    expect(route?.usesStairs).toBe(false)
  })

  it('never claims a skybridge the route only passes under', () => {
    const route = router.route({ placeId: 'student-center-west' }, { placeId: 'classroom-south' }, { avoidStairs: true })!
    expect(route.connections).not.toContain('classroom-south-bridge')
  })

  it('starts from a location off the network', () => {
    const route = router.route({ point: { lat: 33.7531, lng: -84.3858 } }, { placeId: 'langdale-hall' })
    expect(route?.path[0]).toEqual({ lat: 33.7531, lng: -84.3858 })
  })
})

describe('route steps', () => {
  const arc = (meters: number, label: string, flags = 0) => ({ to: 0, meters, cost: meters, flags, label })

  it('groups a street and folds short unnamed bits into it', () => {
    const steps = describeSteps([arc(40, 'Courtland Street'), arc(4, ''), arc(60, 'Courtland Street'), arc(8, '', EDGE.STAIRS)])
    expect(steps).toEqual([
      { label: 'Courtland Street', meters: 104, kind: 'path' },
      { label: 'Stairs', meters: 8, kind: 'stairs' },
    ])
  })
})
