import { CONNECTIONS } from '../app/lib/data/connections'
import { ENTRANCES } from '../app/lib/data/entrances'
import { PANTHER_EXPRESS } from '../app/lib/data/transit'
import graph from '../app/lib/data/walk-graph.json'
import { locatedStops, planShuttle, shuttleShape } from '../app/lib/shuttle'
import { Router, type WalkGraph } from '../app/lib/wayfinding'

const router = new Router(graph as WalkGraph, ENTRANCES, CONNECTIONS)

const plan = (from: string, to: string) => {
  const walk = router.route({ placeId: from }, { placeId: to })!
  return { walk, plan: planShuttle(router, { placeId: from }, { placeId: to }, walk) }
}

describe('Panther Express', () => {
  it('has a line and located stops for every route', () => {
    for (const route of PANTHER_EXPRESS) {
      expect(shuttleShape(route.id).length).toBeGreaterThan(10)
      expect(locatedStops(route).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('suggests the Red Route between the Convocation Center and Langdale Hall', () => {
    const { plan: p } = plan('convocation-center', 'langdale-hall')
    expect(p?.route.id).toBe('red')
    expect(p?.board.name).toBe('Convocation Center Deck')
    expect(p!.saved).toBeGreaterThanOrEqual(5)
  })

  it('stays quiet for a short walk', () => {
    expect(plan('student-center-east', 'student-center-west').plan).toBeUndefined()
  })

  it('never boards and gets off at the same stop', () => {
    const { plan: p } = plan('patton-hall', 'aderhold-learning-center')
    if (p) expect(p.board.passioId).not.toBe(p.alight.passioId)
  })
})
