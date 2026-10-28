/**
 * Walking route finder for the campus map. Runs in the browser on walk-graph.json
 * (built from OpenStreetMap by scripts/build-walk-graph.ts), plus the hand-kept
 * skybridges in ./data/connections and confirmed entrances in ./data/entrances.
 */
import { distanceMeters, type LatLng } from './geo'

/** Node coordinates are stored as integer offsets from here, in millionths of a degree (~0.1 m). */
export const GRAPH_ORIGIN = { lat: 33.73, lng: -84.4 } as const
export const GRAPH_SCALE = 1_000_000

/** Edge flag bits */
export const EDGE = {
  STAIRS: 1,
  BRIDGE: 2,
  /** A street centerline, used where no separate sidewalk is mapped */
  STREET: 4,
  CROSSING: 8,
  /** Indoors or under cover */
  COVERED: 16,
  /** A hand-kept connection from ./data/connections, not an OSM path */
  ADDED: 32,
} as const

export type WalkGraph = {
  source: string
  /** Flat [lat, lng, lat, lng, …] offsets from GRAPH_ORIGIN × GRAPH_SCALE */
  nodes: number[]
  /** Flat [a, b, flags, nameIndex, …]; walkable both ways */
  edges: number[]
  /** Street and path names from OSM; index 0 is unnamed */
  names: string[]
  /** How each place meets the network: OSM entrances, nodes along its sides, or the node nearest its pin */
  places: Record<
    string,
    {
      node?: number
      /** Network nodes along the building's outline */
      sides?: number[]
      /** A wider ring, tried when no route reaches `sides` (set back, or only by stairs) */
      near?: number[]
      /** [lat, lng] pairs */
      entrances?: number[][]
    }
  >
}

export type Entrance = {
  readonly lat: number
  readonly lng: number
  /** Where it is, e.g. "Decatur Street side" */
  readonly note?: string
  /** False when the only way in is up or down steps */
  readonly stepFree?: boolean
}

export type Connection = {
  readonly id: string
  readonly name: string
  readonly kind: 'skybridge' | 'indoor' | 'shortcut'
  /** Shown on the map and in the route steps */
  readonly note: string
  /** The line drawn on the map, [lat, lng] */
  readonly path: readonly (readonly [number, number])[]
  /** Already part of OpenStreetMap's paths, so routes use it on their own; drawn for reference */
  readonly inOsm?: boolean
  /** For `inOsm`: how far either side of `path` the mapped walkway runs, in meters (default 8) */
  readonly halfWidth?: number
  /** Counts as this fraction of its length, so routes pick it over a nearly-as-short street (e.g. 0.85) */
  readonly favor?: number
  /** Place ids at each end, entered through their doors. Omit for an outdoor path whose ends meet the sidewalk. */
  readonly ends?: readonly [string, string]
  /** Only reachable by stairs */
  readonly stairs?: boolean
  /** Extra effort in meters, e.g. for going up a few floors */
  readonly penalty?: number
}

export type Endpoint = { readonly placeId: string } | { readonly point: LatLng }

/** How precisely a route meets a place */
export type AccessKind = 'entrance' | 'side' | 'point'

export type RouteStep = {
  readonly label: string
  readonly meters: number
  readonly kind: 'path' | 'street' | 'crossing' | 'stairs' | 'bridge' | 'covered' | 'connection'
}

export type Route = {
  readonly path: LatLng[]
  readonly meters: number
  readonly minutes: number
  readonly steps: RouteStep[]
  /** Hand-kept connections the route uses */
  readonly connections: string[]
  readonly from: AccessKind
  readonly to: AccessKind
  readonly usesStairs: boolean
}

/** Streets without a mapped sidewalk count a little longer, so mapped sidewalks win ties */
const STREET_COST = 1.25
/** Entrances farther than this from the network are ignored */
const SNAP_METERS = 40
/** ~4.8 km/h */
export const WALK_METERS_PER_MINUTE = 80
/** Steps shorter than this fold into their neighbor, unless they're stairs, crossings, or a connection */
const TINY_STEP_METERS = 12
/** How close a mapped edge must be to a connection's line to count as part of it */
const ON_LINE_METERS = 8

/** p, a, b in meters on a flat projection (fine at campus scale) */
function flat(p: LatLng, a: LatLng, b: LatLng) {
  const kx = 111_320 * Math.cos((p.lat * Math.PI) / 180)
  const ky = 110_574
  return [p.lng * kx, p.lat * ky, a.lng * kx, a.lat * ky, b.lng * kx, b.lat * ky]
}

/** How far along segment ab (0–1) the point nearest p lies */
function projection(p: LatLng, a: LatLng, b: LatLng) {
  const [px, py, ax, ay, bx, by] = flat(p, a, b)
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  return len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0
}

/** Distance from p to segment ab in meters */
function segmentMeters(p: LatLng, a: LatLng, b: LatLng) {
  const [px, py, ax, ay, bx, by] = flat(p, a, b)
  const t = projection(p, a, b)
  return Math.hypot(px - ax - t * (bx - ax), py - ay - t * (by - ay))
}

/** One way into or out of a place: a network node, plus the walk between it and the door (`meters`) */
type Option = {
  node: number
  meters: number
  /** What the search counts; more than `meters` when it includes floor changes */
  cost: number
  at: LatLng
  /** Leaves (or arrives) through an indoor link to the other building first */
  via?: { connection: Connection; line: LatLng[]; meters: number }
}
type Access = { kind: AccessKind; options: Option[] }

export type RouteOptions = {
  avoidStairs?: boolean
  /** Rain or heat: indoor links and covered walkways count for less, so routes take them when close */
  preferIndoor?: boolean
}

/** With preferIndoor, covered and indoor edges count as this share of their length */
const INDOOR_FAVOR = 0.5

/** Min-heap of [cost, node] */
class Heap {
  private items: [number, number][] = []
  get size() {
    return this.items.length
  }
  push(item: [number, number]) {
    const a = this.items
    a.push(item)
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p][0] <= a[i][0]) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop(): [number, number] | undefined {
    const a = this.items
    const top = a[0]
    const last = a.pop()
    if (a.length && last) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < a.length && a[l][0] < a[m][0]) m = l
        if (r < a.length && a[r][0] < a[m][0]) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top
  }
  peek() {
    return this.items[0]
  }
}

type Arc = { to: number; meters: number; cost: number; flags: number; label: string; connection?: string }

export class Router {
  private readonly lat: number[] = []
  private readonly lng: number[] = []
  private readonly arcs: Arc[][] = []
  private readonly realNodes: number

  constructor(
    private readonly graph: WalkGraph,
    private readonly entrances: Partial<Record<string, readonly Entrance[]>> = {},
    connections: readonly Connection[] = []
  ) {
    for (let i = 0; i < graph.nodes.length; i += 2) {
      this.lat.push(graph.nodes[i] / GRAPH_SCALE + GRAPH_ORIGIN.lat)
      this.lng.push(graph.nodes[i + 1] / GRAPH_SCALE + GRAPH_ORIGIN.lng)
      this.arcs.push([])
    }
    this.realNodes = this.lat.length
    for (let i = 0; i < graph.edges.length; i += 4) {
      const [a, b, flags, name] = graph.edges.slice(i, i + 4)
      const meters = distanceMeters(this.point(a), this.point(b))
      const cost = flags & EDGE.STREET ? meters * STREET_COST : meters
      const label = graph.names[name] ?? ''
      this.arcs[a].push({ to: b, meters, cost, flags, label })
      this.arcs[b].push({ to: a, meters, cost, flags, label })
    }
    for (const c of connections) {
      if (c.inOsm) this.nameConnection(c)
      else if (c.ends) {
        this.indoor.push(c)
        this.addIndoorLink(c)
      } else this.addShortcut(c)
    }
  }

  /** Indoor links, also offered as a way to leave or arrive at either end building */
  private readonly indoor: Connection[] = []

  /** Mapped bridges and paths: the edges lying along the line take its name, so directions say "Decatur Street pedestrian bridge" */
  private nameConnection(c: Connection) {
    const line = c.path.map(([lat, lng]) => ({ lat, lng }))
    const reach = c.halfWidth ?? ON_LINE_METERS
    const onLine = (p: LatLng) => line.slice(1).some((b, i) => segmentMeters(p, line[i], b) <= reach)
    // A skybridge passes over the sidewalk below it; only raised edges (and their steps) are the bridge
    const fits = (arc: Arc) => c.kind !== 'skybridge' || !!(arc.flags & EDGE.BRIDGE)
    for (let a = 0; a < this.realNodes; a++) {
      for (const arc of this.arcs[a]) {
        if (fits(arc) && onLine(this.point(a)) && onLine(this.point(arc.to))) {
          arc.connection = c.id
          arc.label = c.name
          if (c.favor) arc.cost = arc.meters * c.favor
        }
      }
    }
  }

  point(i: number): LatLng {
    return { lat: this.lat[i], lng: this.lng[i] }
  }

  /** Places the network reaches */
  canRoute(placeId: string) {
    return placeId in this.graph.places
  }

  private readonly snapped = new Map<string, number>()

  /**
   * The point on the nearest sidewalk or path (a street centerline only if there's none),
   * added to the network as a node so a door meets its own stretch of sidewalk rather than
   * the closest corner. Cached, so each door splits its edge once.
   */
  snap(p: LatLng, maxMeters = SNAP_METERS): number {
    const key = `${p.lat},${p.lng}`
    const cached = this.snapped.get(key)
    if (cached !== undefined) return cached

    let best: { a: number; arc: Arc; d: number } | undefined
    for (const streets of [false, true]) {
      for (let a = 0; a < this.realNodes; a++) {
        if (Math.abs(this.lat[a] - p.lat) * 111_000 > maxMeters + 200) continue
        for (const arc of this.arcs[a]) {
          if (arc.to < a || arc.to >= this.realNodes || !!(arc.flags & EDGE.STREET) !== streets) continue
          const d = segmentMeters(p, this.point(a), this.point(arc.to))
          if (d <= maxMeters && (!best || d < best.d)) best = { a, arc, d }
        }
      }
      if (best) break
    }
    if (!best) return -1

    const { a, arc } = best
    const A = this.point(a)
    const B = this.point(arc.to)
    const t = projection(p, A, B)
    let node: number
    if (t * arc.meters < 1) node = a
    else if ((1 - t) * arc.meters < 1) node = arc.to
    else {
      node = this.addNode({ lat: A.lat + t * (B.lat - A.lat), lng: A.lng + t * (B.lng - A.lng) })
      const rate = arc.cost / arc.meters
      for (const [end, share] of [
        [a, t],
        [arc.to, 1 - t],
      ] as const) {
        this.link(node, end, arc.meters * share, arc.meters * share * rate, arc.flags, arc.label, arc.connection)
      }
    }
    this.snapped.set(key, node)
    return node
  }

  /** A place's known doors (confirmed, else from OSM), snapped to the network */
  private doors(placeId: string, avoidStairs = false) {
    const known = this.entrances[placeId]
    const doors: Entrance[] = known?.length
      ? [...known]
      : (this.graph.places[placeId]?.entrances ?? []).map(([lat, lng]) => ({ lat, lng }))
    return doors
      .filter((d) => !avoidStairs || d.stepFree !== false)
      .flatMap((door) => {
        const node = this.snap(door)
        if (node < 0) return []
        const meters = distanceMeters(door, this.point(node))
        return [{ node, meters, cost: meters, at: { lat: door.lat, lng: door.lng } as LatLng, stepFree: door.stepFree !== false }]
      })
  }

  /** How routes reach a place: confirmed entrances, then OSM entrances, then its sides, then its pin */
  access(placeId: string, avoidStairs = false, wide = false): Access | undefined {
    const doors = this.doors(placeId, avoidStairs)
    if (doors.length) return { kind: 'entrance', options: doors }

    const place = this.graph.places[placeId]
    const at = (node: number): Option => ({ node, meters: 0, cost: 0, at: this.point(node) })
    const sides = [...(place?.sides ?? []), ...(wide ? (place?.near ?? []) : [])]
    if (sides.length) return { kind: 'side', options: sides.map(at) }
    if (place?.node !== undefined) return { kind: 'point', options: [at(place.node)] }
    return undefined
  }

  /**
   * Leaving (or arriving at) a building through an indoor link: the other building's
   * doors become extra starts (or goals), already carrying the link's length and floors.
   */
  private throughLinks(placeId: string, leaving: boolean, opts: RouteOptions): Option[] {
    return this.indoor.flatMap((c) => {
      const i = c.ends!.indexOf(placeId)
      if (i < 0 || (opts.avoidStairs && c.stairs)) return []
      const line = c.path.map(([lat, lng]) => ({ lat, lng }))
      const here = i === 0 ? line[0] : line.at(-1)!
      const there = i === 0 ? line.at(-1)! : line[0]
      const span = lineMeters(line)
      const other = this.access(c.ends![1 - i], opts.avoidStairs)
      return (other?.options ?? []).map((o) => {
        const meters = span + distanceMeters(there, o.at) + o.meters
        const cost = (meters + (c.penalty ?? 0)) * (opts.preferIndoor ? INDOOR_FAVOR : 1)
        return { ...o, meters, cost, via: { connection: c, line: leaving ? [here, there] : [there, here], meters: meters - o.meters } }
      })
    })
  }

  nearest(p: LatLng, maxMeters = Infinity): number {
    let best = -1
    let bestD = maxMeters
    for (let i = 0; i < this.realNodes; i++) {
      // Cheap reject before the trig
      if (Math.abs(this.lat[i] - p.lat) * 111_000 > bestD) continue
      const d = distanceMeters(p, this.point(i))
      if (d < bestD) {
        best = i
        bestD = d
      }
    }
    return best
  }

  private addNode(p: LatLng) {
    this.lat.push(p.lat)
    this.lng.push(p.lng)
    this.arcs.push([])
    return this.lat.length - 1
  }

  private link(a: number, b: number, meters: number, cost: number, flags: number, label: string, connection?: string) {
    this.arcs[a].push({ to: b, meters, cost, flags, label, connection })
    this.arcs[b].push({ to: a, meters, cost, flags, label, connection })
  }

  /**
   * An indoor link walked straight through: new nodes at the ends of its line, joined to
   * each end building's known doors only. (Joining to a building's approximate sides
   * would let routes use the link as a shortcut between two unrelated sidewalks.)
   */
  private addIndoorLink(c: Connection) {
    const line = c.path.map(([lat, lng]) => ({ lat, lng }))
    if (line.length < 2) return
    const flags = EDGE.ADDED | EDGE.COVERED | (c.stairs ? EDGE.STAIRS : 0)
    const ends = [line[0], line.at(-1)!].map((p, i) => {
      const node = this.addNode(p)
      for (const door of this.doors(c.ends![i])) {
        const hop = distanceMeters(p, door.at) + door.meters
        const doorFlags = flags | (door.stepFree ? 0 : EDGE.STAIRS)
        this.link(node, door.node, hop, hop + (c.penalty ?? 0) / 2, doorFlags, c.name, c.id)
      }
      return node
    })
    const span = lineMeters(line)
    this.link(ends[0], ends[1], span, span, flags | EDGE.BRIDGE, c.name, c.id)
  }

  /** An outdoor shortcut OSM doesn't have: its ends join the nearest sidewalks */
  private addShortcut(c: Connection) {
    const line = c.path.map(([lat, lng]) => ({ lat, lng }))
    const a = this.snap(line[0])
    const b = this.snap(line.at(-1)!)
    if (line.length < 2 || a < 0 || b < 0) return
    const meters = distanceMeters(line[0], this.point(a)) + lineMeters(line) + distanceMeters(line.at(-1)!, this.point(b))
    this.link(a, b, meters, meters + (c.penalty ?? 0), EDGE.ADDED | (c.stairs ? EDGE.STAIRS : 0), c.name, c.id)
  }

  private resolve(end: Endpoint, avoidStairs: boolean, wide: boolean): Access | undefined {
    if ('placeId' in end) return this.access(end.placeId, avoidStairs, wide)
    const node = this.nearest(end.point, 500)
    if (node < 0) return undefined
    const meters = distanceMeters(end.point, this.point(node))
    return { kind: 'point', options: [{ node, meters, cost: meters, at: end.point }] }
  }

  route(from: Endpoint, to: Endpoint, opts: RouteOptions = {}): Route | undefined {
    // Buildings' close sides first; their wider ring only if that finds nothing
    return this.search(from, to, opts, false) ?? this.search(from, to, opts, true)
  }

  private search(from: Endpoint, to: Endpoint, opts: RouteOptions, wide: boolean): Route | undefined {
    const { avoidStairs = false, preferIndoor = false } = opts
    const start = this.resolve(from, avoidStairs, wide)
    const goal = this.resolve(to, avoidStairs, wide)
    if (!start || !goal) return undefined
    const starts = [...start.options, ...('placeId' in from ? this.throughLinks(from.placeId, true, opts) : [])]
    const goals = [...goal.options, ...('placeId' in to ? this.throughLinks(to.placeId, false, opts) : [])]

    const n = this.lat.length
    const dist = new Float64Array(n).fill(Infinity)
    const prev = new Int32Array(n).fill(-1)
    const prevArc: (Arc | undefined)[] = new Array(n)
    const origin = new Map<number, Option>()
    const heap = new Heap()
    for (const o of starts) {
      if (o.cost < dist[o.node]) {
        dist[o.node] = o.cost
        origin.set(o.node, o)
        heap.push([o.cost, o.node])
      }
    }
    const targets = new Map<number, Option>()
    for (const o of goals) if (!targets.has(o.node) || o.cost < targets.get(o.node)!.cost) targets.set(o.node, o)

    let best = Infinity
    let bestNode = -1
    while (heap.size) {
      const [d, u] = heap.pop()!
      if (d > dist[u]) continue
      if (d >= best) break
      const t = targets.get(u)
      if (t && d + t.cost < best) {
        best = d + t.cost
        bestNode = u
      }
      for (const arc of this.arcs[u]) {
        if (avoidStairs && arc.flags & EDGE.STAIRS) continue
        const nd = d + (preferIndoor && arc.flags & EDGE.COVERED ? arc.cost * INDOOR_FAVOR : arc.cost)
        if (nd < dist[arc.to]) {
          dist[arc.to] = nd
          prev[arc.to] = u
          prevArc[arc.to] = arc
          heap.push([nd, arc.to])
        }
      }
    }
    if (bestNode < 0) return undefined

    // Walk back from the goal
    const nodes: number[] = []
    const arcs: Arc[] = []
    for (let v = bestNode; v >= 0; v = prev[v]) {
      nodes.unshift(v)
      if (prevArc[v]) arcs.unshift(prevArc[v]!)
    }
    const first = origin.get(nodes[0])!
    const last = targets.get(bestNode)!

    const path = [
      ...(first.via?.line ?? []),
      first.at,
      ...nodes.map((i) => this.point(i)),
      last.at,
      ...(last.via?.line ?? []),
    ]
    const meters = first.meters + arcs.reduce((s, a) => s + a.meters, 0) + last.meters
    const linkStep = (o: Option): RouteStep[] =>
      o.via ? [{ label: o.via.connection.name, meters: o.via.meters, kind: 'connection' }] : []
    const vias = [first.via, last.via].flatMap((v) => (v ? [v.connection] : []))
    return {
      path,
      meters,
      minutes: Math.max(1, Math.round(meters / WALK_METERS_PER_MINUTE)),
      steps: [...linkStep(first), ...describe(arcs), ...linkStep(last)],
      connections: [...new Set([...vias.map((c) => c.id), ...arcs.flatMap((a) => a.connection ?? [])])],
      from: start.kind,
      to: goal.kind,
      usesStairs: arcs.some((a) => a.flags & EDGE.STAIRS) || vias.some((c) => c.stairs),
    }
  }
}

const lineMeters = (line: readonly LatLng[]) => line.slice(1).reduce((sum, p, i) => sum + distanceMeters(line[i], p), 0)

/** Mapped edges along a connection keep their own kind (stairs stay stairs) */
const kindOf = (a: Arc): RouteStep['kind'] =>
  a.flags & EDGE.ADDED
    ? 'connection'
    : a.flags & EDGE.STAIRS
      ? 'stairs'
      : a.flags & EDGE.CROSSING
        ? 'crossing'
        : a.flags & EDGE.BRIDGE
          ? 'bridge'
          : a.flags & EDGE.COVERED
            ? 'covered'
            : a.flags & EDGE.STREET
              ? 'street'
              : 'path'

const GENERIC: Record<RouteStep['kind'], string> = {
  path: 'Sidewalk or path',
  street: 'Along the street',
  crossing: 'Cross the street',
  stairs: 'Stairs',
  bridge: 'Raised walkway',
  covered: 'Covered walkway',
  connection: 'Connector',
}

/** Turn-free directions: consecutive edges grouped by name (or type when unnamed). */
export function describe(arcs: readonly Arc[]): RouteStep[] {
  type Step = { -readonly [K in keyof RouteStep]: RouteStep[K] }
  const steps: Step[] = []
  for (const a of arcs) {
    const kind = kindOf(a)
    const label = a.label || GENERIC[kind]
    const lastStep = steps.at(-1)
    if (lastStep && lastStep.label === label) lastStep.meters += a.meters
    else steps.push({ label, meters: a.meters, kind })
  }
  // Fold slivers (a 3 m bit of sidewalk between two named paths) into the step before
  const keep = (s: RouteStep) => s.meters >= TINY_STEP_METERS || ['stairs', 'crossing', 'connection'].includes(s.kind)
  const out: Step[] = []
  for (const s of steps) {
    const prev = out.at(-1)
    if (!keep(s) && prev) prev.meters += s.meters
    else if (prev && prev.label === s.label) prev.meters += s.meters
    else out.push({ ...s })
  }
  return out
}
