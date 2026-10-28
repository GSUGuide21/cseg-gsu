/**
 * Builds app/lib/data/walk-graph.json, the walking network the campus map's route
 * finder runs on, from OpenStreetMap (© OpenStreetMap contributors, ODbL).
 *
 *   npm run map:walk-graph               # download fresh OSM data
 *   npm run map:walk-graph -- osm.json   # or reuse a saved download
 *
 * Re-run after OSM edits (new sidewalks, entrances) or after adding places. Confirmed
 * entrances (app/lib/data/entrances.ts) and skybridges (app/lib/data/connections.ts)
 * are applied in the browser, so editing those needs no rebuild.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { PLACES } from '../app/lib/data/places'
import { distanceMeters, type LatLng } from '../app/lib/geo'
import { EDGE, GRAPH_ORIGIN, GRAPH_SCALE, type WalkGraph } from '../app/lib/wayfinding'

/** Campus plus Summerhill (athletics) and Peachtree Center; the OSM API allows 50,000 nodes per request. */
const BBOXES = [
  [-84.3935, 33.747, -84.378, 33.7615],
  [-84.3935, 33.734, -84.378, 33.747],
] as const

const OUT = join(__dirname, '..', 'app', 'lib', 'data', 'walk-graph.json')

/** Sidewalks, paths, and streets (as a fallback where sidewalks aren't mapped). No highways or ramps. */
const PATHS = new Set(['footway', 'pedestrian', 'path', 'steps', 'corridor', 'track', 'cycleway', 'elevator'])
const STREETS = new Set(['living_street', 'residential', 'service', 'unclassified', 'tertiary', 'secondary', 'primary'])

/**
 * How far a building's outline can be from a sidewalk or path and still count as reachable
 * from that side. Tight first, so a building's sides don't reach across the street. The
 * wider ring (`near`) is a fallback for buildings set back behind a plaza or lawn, or whose
 * close sides are all up or down stairs.
 */
const SIDE_REACH_METERS = 12
const NEAR_REACH_METERS = 25

type OsmNode = { type: 'node'; id: number; lat: number; lon: number; tags?: Record<string, string> }
type OsmWay = { type: 'way'; id: number; nodes: number[]; tags?: Record<string, string> }
type OsmElement = OsmNode | OsmWay | { type: 'relation' }

async function download(): Promise<OsmElement[]> {
  const elements: OsmElement[] = []
  for (const [w, s, e, n] of BBOXES) {
    const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${w},${s},${e},${n}`
    const res = await fetch(url, { headers: { 'User-Agent': 'cseg-gsu walk-graph builder' } })
    if (!res.ok) throw new Error(`OSM API ${res.status} for ${url}`)
    elements.push(...((await res.json()) as { elements: OsmElement[] }).elements)
  }
  return elements
}

const isWalkable = (t: Record<string, string> = {}) => {
  const hw = t.highway
  if (!hw || !(PATHS.has(hw) || STREETS.has(hw))) return false
  if (t.foot === 'no' || t.area === 'yes' && hw !== 'pedestrian') return false
  // Campus paths are often access=private (GSU property) but open to students; only respect explicit "no"
  if ((t.access === 'no' || t.access === 'emergency') && t.foot !== 'yes' && t.foot !== 'designated') return false
  return true
}

const edgeFlags = (t: Record<string, string>) => {
  let f = 0
  if (t.highway === 'steps') f |= EDGE.STAIRS
  if (t.bridge && t.bridge !== 'no') f |= EDGE.BRIDGE
  if (STREETS.has(t.highway)) f |= EDGE.STREET
  if (t.footway === 'crossing' || t.highway === 'crossing') f |= EDGE.CROSSING
  if (t.indoor === 'yes' || t.highway === 'corridor' || (t.tunnel && t.tunnel !== 'no')) f |= EDGE.COVERED
  return f
}

/** "Courtland Street Southeast" → "Courtland Street SE" */
const shortName = (name: string) =>
  name.replace(/\b(North|South)(east|west)\b/g, (_, a: string, b: string) => `${a[0]}${b[0].toUpperCase()}`)

/** A sidewalk this close to a street, and running the same way, takes the street's name */
const SIDEWALK_TO_STREET_METERS = 15
/** A crossing whose middle is this close to a street crosses it */
const CROSSING_TO_STREET_METERS = 10

/** Meters on a local flat projection; plenty accurate across a campus */
const toXY = (p: LatLng): [number, number] => [p.lng * 111_320 * Math.cos((33.75 * Math.PI) / 180), p.lat * 110_574]

const segmentDistance = (p: LatLng, a: LatLng, b: LatLng) => {
  const [px, py] = toXY(p)
  const [ax, ay] = toXY(a)
  const [bx, by] = toXY(b)
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

/** Direction in degrees, folded to 0–180 so opposite directions match */
const bearing = (a: LatLng, b: LatLng) => {
  const [ax, ay] = toXY(a)
  const [bx, by] = toXY(b)
  return ((Math.atan2(by - ay, bx - ax) * 180) / Math.PI + 180) % 180
}

/** Ray-casting point-in-polygon on [lat, lng] rings */
const contains = (poly: LatLng[], p: LatLng) => {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.lng > p.lng !== b.lng > p.lng && p.lat < ((b.lat - a.lat) * (p.lng - a.lng)) / (b.lng - a.lng) + a.lat) inside = !inside
  }
  return inside
}

async function main() {
  const input = process.argv[2]
  const elements = input ? (JSON.parse(readFileSync(input, 'utf8')) as { elements: OsmElement[] }).elements : await download()

  const nodes = new Map<number, OsmNode>()
  const ways = new Map<number, OsmWay>()
  for (const el of elements) {
    if (el.type === 'node') nodes.set(el.id, el)
    else if (el.type === 'way') ways.set(el.id, el)
  }

  // 1. Walkable segments. Unnamed sidewalks and crosswalks borrow the street's name for directions.
  const at = (id: number): LatLng => ({ lat: nodes.get(id)!.lat, lng: nodes.get(id)!.lon })
  const streets = [...ways.values()]
    .filter((w) => w.tags?.name && STREETS.has(w.tags.highway ?? ''))
    .flatMap((w) =>
      w.nodes.slice(1).flatMap((id, i) => (nodes.has(id) && nodes.has(w.nodes[i]) ? [{ a: at(w.nodes[i]), b: at(id), name: w.tags!.name }] : []))
    )
  const streetBeside = (way: OsmWay, crossing: boolean) => {
    const ends = [way.nodes[0], way.nodes.at(-1)!].filter((id) => nodes.has(id)).map(at)
    if (ends.length < 2) return undefined
    const mid = { lat: (ends[0].lat + ends[1].lat) / 2, lng: (ends[0].lng + ends[1].lng) / 2 }
    const dir = bearing(ends[0], ends[1])
    let best: string | undefined
    let bestD = crossing ? CROSSING_TO_STREET_METERS : SIDEWALK_TO_STREET_METERS
    for (const s of streets) {
      const turn = Math.abs(bearing(s.a, s.b) - dir)
      const parallel = Math.min(turn, 180 - turn) < 25
      if (!crossing && !parallel) continue
      const d = segmentDistance(mid, s.a, s.b)
      if (d < bestD) {
        best = s.name
        bestD = d
      }
    }
    return best
  }

  const names: string[] = ['']
  const nameIndex = new Map<string, number>([['', 0]])
  const nameOf = (way: OsmWay) => {
    const t = way.tags!
    const crossing = t.footway === 'crossing'
    const street = !t.name && (crossing || t.footway === 'sidewalk' || PATHS.has(t.highway)) ? streetBeside(way, crossing) : undefined
    const name = t.name ? shortName(t.name) : street ? (crossing ? `Cross ${shortName(street)}` : shortName(street)) : ''
    if (!nameIndex.has(name)) {
      nameIndex.set(name, names.length)
      names.push(name)
    }
    return nameIndex.get(name)!
  }
  const adjacency = new Map<number, number[]>()
  const segments: [number, number, number, number][] = []
  for (const way of ways.values()) {
    if (!isWalkable(way.tags)) continue
    const f = edgeFlags(way.tags!)
    const name = nameOf(way)
    for (let i = 0; i < way.nodes.length - 1; i++) {
      const a = way.nodes[i]
      const b = way.nodes[i + 1]
      if (a === b || !nodes.has(a) || !nodes.has(b)) continue
      segments.push([a, b, f, name])
      adjacency.set(a, [...(adjacency.get(a) ?? []), b])
      adjacency.set(b, [...(adjacency.get(b) ?? []), a])
    }
  }

  // 2. Keep the largest connected network; islands (garage ramps, private courtyards) can't route anywhere
  const component = new Map<number, number>()
  const sizes: number[] = []
  for (const start of adjacency.keys()) {
    if (component.has(start)) continue
    const id = sizes.length
    let size = 0
    const stack = [start]
    component.set(start, id)
    while (stack.length) {
      const n = stack.pop()!
      size++
      for (const m of adjacency.get(n) ?? []) {
        if (!component.has(m)) {
          component.set(m, id)
          stack.push(m)
        }
      }
    }
    sizes.push(size)
  }
  const main = sizes.indexOf(Math.max(...sizes))

  const index = new Map<number, number>()
  const coords: number[] = []
  const pointOf = (i: number): LatLng => ({ lat: coords[i * 2] / GRAPH_SCALE + GRAPH_ORIGIN.lat, lng: coords[i * 2 + 1] / GRAPH_SCALE + GRAPH_ORIGIN.lng })
  const indexOf = (osmId: number) => {
    let i = index.get(osmId)
    if (i === undefined) {
      const n = nodes.get(osmId)!
      i = coords.length / 2
      index.set(osmId, i)
      coords.push(Math.round((n.lat - GRAPH_ORIGIN.lat) * GRAPH_SCALE), Math.round((n.lon - GRAPH_ORIGIN.lng) * GRAPH_SCALE))
    }
    return i
  }
  const edges: number[] = []
  for (const [a, b, f, name] of segments) {
    if (component.get(a) !== main) continue
    edges.push(indexOf(a), indexOf(b), f, name)
  }

  // 3. Where each place meets the network
  const nodeCount = coords.length / 2
  // Nodes on a sidewalk or path (not only on a street centerline): where a building's doors can be
  const onFoot = new Set<number>()
  for (let i = 0; i < edges.length; i += 4) {
    if (!(edges[i + 2] & EDGE.STREET)) onFoot.add(edges[i]).add(edges[i + 1])
  }
  const nearest = (p: LatLng, maxMeters = Infinity, only?: Set<number>) => {
    let best = -1
    let bestD = maxMeters
    for (let i = 0; i < nodeCount; i++) {
      if (only && !only.has(i)) continue
      const d = distanceMeters(p, pointOf(i))
      if (d < bestD) {
        best = i
        bestD = d
      }
    }
    return best
  }
  const buildings = [...ways.values()]
    .filter((w) => w.tags?.building && w.tags.building !== 'bridge' && w.nodes.length > 3 && w.nodes[0] === w.nodes.at(-1))
    .map((w) => ({ way: w, ring: w.nodes.flatMap((id) => (nodes.has(id) ? [{ lat: nodes.get(id)!.lat, lng: nodes.get(id)!.lon }] : [])) }))

  const places: WalkGraph['places'] = {}
  let withBuilding = 0
  let withEntrances = 0
  for (const place of PLACES) {
    const building = buildings.find((b) => contains(b.ring, place))
    if (!building) {
      const node = nearest(place, 400)
      if (node >= 0) places[place.id] = { node }
      continue
    }
    withBuilding++
    const entrances = building.way.nodes
      .map((id) => nodes.get(id))
      .filter((n): n is OsmNode => !!n?.tags?.entrance && n.tags.entrance !== 'no' && n.tags.access !== 'private')
      .map((n) => [+n.lat.toFixed(6), +n.lon.toFixed(6)])
    if (entrances.length) withEntrances++
    const ringNodes = (reach: number) => [...new Set(building.ring.map((p) => nearest(p, reach, onFoot)).filter((i) => i >= 0))]
    const sides = ringNodes(SIDE_REACH_METERS)
    const near = ringNodes(NEAR_REACH_METERS).filter((i) => !sides.includes(i))
    const node = nearest(place, 400)
    places[place.id] = {
      ...(node >= 0 ? { node } : {}),
      ...(sides.length ? { sides } : {}),
      ...(near.length ? { near } : {}),
      ...(entrances.length ? { entrances } : {}),
    }
  }

  const graph: WalkGraph = {
    source: `OpenStreetMap contributors (ODbL), ${new Date().toISOString().slice(0, 10)}`,
    nodes: coords,
    edges,
    names,
    places,
  }
  writeFileSync(OUT, JSON.stringify(graph))
  console.log(
    `${nodeCount} nodes, ${edges.length / 4} edges (largest of ${sizes.length} networks), ` +
      `${Object.keys(places).length}/${PLACES.length} places routable, ${withBuilding} matched to a building, ${withEntrances} with OSM entrances`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
