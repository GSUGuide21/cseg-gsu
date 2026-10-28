import { CONNECTIONS } from '../app/lib/data/connections'
import { ENTRANCES } from '../app/lib/data/entrances'
import { getPlace } from '../app/lib/data/places'
import { MARTA_LINES, MARTA_STATIONS, stationsOn, type MartaLine } from '../app/lib/data/transit'
import graph from '../app/lib/data/walk-graph.json'
import { Router, type WalkGraph } from '../app/lib/wayfinding'

const router = new Router(graph as WalkGraph, ENTRANCES, CONNECTIONS)

/** The line's stop with the shortest walk to a place */
const bestStop = (line: MartaLine, placeId: string) =>
  stationsOn(line)
    .map((s) => ({ id: s.placeId, meters: router.route({ placeId: s.placeId }, { placeId })!.meters }))
    .sort((a, b) => a.meters - b.meters)[0].id

describe('MARTA', () => {
  it('points every station at a real place', () => {
    expect(MARTA_STATIONS.filter((s) => !getPlace(s.placeId))).toEqual([])
  })

  it('serves every line from at least one station', () => {
    for (const line of Object.keys(MARTA_LINES) as MartaLine[]) expect(stationsOn(line).length).toBeGreaterThan(0)
  })

  it('picks the right Blue Line stop for each side of campus', () => {
    expect(bestStop('blue', 'student-center-east')).toBe('marta-georgia-state')
    expect(bestStop('blue', 'petit-science-center')).toBe('marta-georgia-state')
    expect(bestStop('blue', 'robinson-college-of-business')).toBe('marta-five-points')
    expect(bestStop('blue', 'aderhold-learning-center')).toBe('marta-five-points')
  })
})
