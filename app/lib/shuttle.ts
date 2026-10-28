/**
 * "Take the Panther Express?" for the route finder: the shuttle ride that saves the most
 * walking between two places. GSU doesn't publish headways, so plans compare walking
 * only and point riders to Passio GO for live arrivals.
 */
import shuttleData from './data/panther-express.json'
import { PANTHER_EXPRESS, type ShuttleRoute, type ShuttleStop } from './data/transit'
import type { LatLng } from './geo'
import type { Endpoint, Route, RouteOptions, Router } from './wayfinding'

/** Only suggest the shuttle for walks at least this long… */
const MIN_WALK_MINUTES = 10
/** …and when it saves at least this much walking */
const MIN_SAVED_MINUTES = 5

type Located = ShuttleStop & { at: LatLng; index: number }

export type ShuttlePlan = {
  route: ShuttleRoute
  board: Located
  alight: Located
  /** Stops ridden, counting the one you get off at */
  stops: number
  walkTo: Route
  walkFrom: Route
  /** Walking minutes saved compared with walking the whole way */
  saved: number
}

const stopLocations = shuttleData.stops as Record<string, { name: string; lat: number; lng: number }>

/** A route's stops that have a location on the live map, with their place in riding order */
export const locatedStops = (route: ShuttleRoute): Located[] =>
  route.stops.flatMap((s, index) => {
    const loc = s.passioId ? stopLocations[s.passioId] : undefined
    return loc ? [{ ...s, index, at: { lat: loc.lat, lng: loc.lng } }] : []
  })

/** Each route's line on the map, as [lat, lng] pairs */
export const shuttleShape = (id: ShuttleRoute['id']): [number, number][] =>
  ((shuttleData.shapes as Record<string, number[][]>)[id] ?? []).map(([lat, lng]) => [lat, lng])

/** The stretch of a route's loop from one stop to the next one you get off at, for drawing the ride */
export function rideBetween(id: ShuttleRoute['id'], from: LatLng, to: LatLng): [number, number][] {
  const shape = shuttleShape(id)
  if (!shape.length) return []
  const closest = (p: LatLng) =>
    shape.reduce((best, [lat, lng], i) => {
      const d = (lat - p.lat) ** 2 + (lng - p.lng) ** 2
      return d < best.d ? { i, d } : best
    }, { i: 0, d: Infinity }).i
  const a = closest(from)
  const b = closest(to)
  return b >= a ? shape.slice(a, b + 1) : [...shape.slice(a), ...shape.slice(0, b + 1)]
}

export function planShuttle(router: Router, from: Endpoint, to: Endpoint, walk: Route, opts: RouteOptions = {}) {
  if (walk.minutes < MIN_WALK_MINUTES) return undefined
  let best: ShuttlePlan | undefined
  for (const route of PANTHER_EXPRESS) {
    const stops = locatedStops(route)
    const toStop = stops.map((s) => router.route(from, { point: s.at }, opts))
    const fromStop = stops.map((s) => router.route({ point: s.at }, to, opts))
    stops.forEach((board, i) =>
      stops.forEach((alight, j) => {
        const walkTo = toStop[i]
        const walkFrom = fromStop[j]
        if (i === j || !walkTo || !walkFrom) return
        const saved = walk.minutes - walkTo.minutes - walkFrom.minutes
        if (saved < MIN_SAVED_MINUTES || (best && saved <= best.saved)) return
        // Loops: ride forward, wrapping past the last stop
        const n = route.stops.length
        best = { route, board, alight, stops: (alight.index - board.index + n) % n, walkTo, walkFrom, saved }
      })
    )
  }
  return best
}
