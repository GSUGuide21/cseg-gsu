'use client'

import 'maplibre-gl/dist/maplibre-gl.css'

import type { FeatureCollection, Point } from 'geojson'
import type * as Gl from 'maplibre-gl'
import { Box, Bus, Clock, Footprints, LocateFixed, Map as MapIcon, MapPin, Route as RouteIcon, Search, X } from 'lucide-react'
import { type FC, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { eyebrow } from '@/globals/ui/styles'
import { cn } from '@/lib/cn'
import { CONNECTIONS } from '@/lib/data/connections'
import { EATERIES } from '@/lib/data/eats'
import { ENTRANCES } from '@/lib/data/entrances'
import { CAMPUS_CENTER, PLACE_CATEGORIES, PLACES, placesWithEateries, type Place, type PlaceCategory } from '@/lib/data/places'
import type { Eatery } from '@/lib/eateries'
import { findRooms, floorOf, ordinal } from '@/lib/data/rooms'
import { TOURS, tourFromLink, type Tour, type TourStop } from '@/lib/data/tour'
import {
  PANTHER_EXPRESS,
  PASSIO_GO_URL,
  isMartaLine,
  linesAt,
  stationsOn,
  type MartaLine,
  type ShuttleRoute,
} from '@/lib/data/transit'
import { locatedStops, planShuttle, rideBetween, shuttleShape } from '@/lib/shuttle'
import { distanceLabel, distanceMeters, type LatLng } from '@/lib/geo'
import { getOpenStatus, type OpenStatus } from '@/lib/hours'
import { Router, type Connection, type Endpoint, type WalkGraph } from '@/lib/wayfinding'
import {
  CLICKABLE,
  EMPTY,
  SOURCES,
  STYLE_URL,
  BUILDINGS_3D_MINZOOM,
  addBuildings,
  addPinImages,
  collection,
  line as lineFeature,
  overlayLayers,
  point,
  setBuildings3d,
  tuneBaseStyle,
  type SourceId,
  type Theme,
} from './gl'
import { categoryLabel, PlacePanel } from './PlacePanel'
import { HERE, RoutePanel, type StationChoice } from './RoutePanel'
import { sheetClass, sheetCover, SheetHandle, type SheetStop } from './Sheet'
import { TourPanel } from './TourPanel'

const CATEGORY_ORDER = Object.keys(PLACE_CATEGORIES) as PlaceCategory[]

/** Farther than this from campus, "Near me" sorts the list but leaves the map on campus. */
const NEAR_CAMPUS_METERS = 3000

/** How far the map tilts in 3D view */
const TILT_DEGREES = 55

type Mode = 'explore' | 'tour' | 'route'
type GeoState = 'idle' | 'locating' | 'found' | 'far' | 'denied' | 'unavailable'

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Route mode's pin popup: use this place as either end of the route. Plain HTML because map popups live outside React. */
const routePickHtml = (p: Place) => {
  const { color } = PLACE_CATEGORIES[p.category]
  return `
    <div class="flex flex-col gap-1.5">
      <span class="text-[0.7rem] font-bold tracking-wider uppercase" style="color:${color}">${escapeHtml(categoryLabel(p))}</span>
      <strong class="text-[0.95rem] leading-snug">${escapeHtml(p.name)}</strong>
      <span class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        <button type="button" data-route-from="${p.id}" class="cursor-pointer p-0 text-[0.85rem] font-semibold text-brand hover:underline">Start here</button>
        <button type="button" data-route-to="${p.id}" class="cursor-pointer p-0 text-[0.85rem] font-semibold text-brand hover:underline">Route here</button>
      </span>
    </div>`
}

/** Panther Express stop popup: the routes that stop here and when they run */
const shuttleStopHtml = (name: string, routes: readonly ShuttleRoute[]) => `
  <div class="flex flex-col gap-1.5">
    <span class="text-[0.7rem] font-bold tracking-wider text-brand uppercase">Panther Express stop</span>
    <strong class="text-[0.95rem] leading-snug">${escapeHtml(name)}</strong>
    ${routes
      .map(
        (r) =>
          `<span class="flex items-start gap-1.5 text-[0.8rem]"><span class="mt-1 size-2.5 shrink-0 rounded-full" style="background:${r.color}"></span><span><strong>${escapeHtml(r.name)}</strong><br><span class="text-muted">${escapeHtml(r.hours)}</span></span></span>`
      )
      .join('')}
    <a class="mt-1 text-[0.85rem] font-semibold text-brand!" href="${PASSIO_GO_URL}" target="_blank" rel="noopener noreferrer">Live arrivals &#8599;</a>
  </div>`

/** Skybridge or shortcut popup */
const connectionHtml = (name: string, note: string) =>
  `<div class="flex flex-col gap-1"><span class="text-[0.7rem] font-bold tracking-wider text-brand uppercase">Shortcut</span><strong class="text-[0.95rem] leading-snug">${escapeHtml(name)}</strong><p class="m-0! text-[0.85rem] leading-relaxed">${escapeHtml(note)}</p></div>`

const tourStopHtml = (i: number, stop: TourStop, place: Place) =>
  `<div class="flex flex-col gap-1"><span class="text-[0.7rem] font-bold tracking-wider text-brand uppercase">Stop ${i + 1}</span><strong class="text-[0.95rem] leading-snug">${escapeHtml(stop.title)}</strong><span class="text-[0.8rem] text-muted">${escapeHtml(place.name)}</span></div>`

/** A fixed-size box holding marker HTML, since the marker CSS fills its parent */
const markerElement = (html: string, size: number, tag: 'div' | 'button' = 'div') => {
  const el = document.createElement(tag)
  if (el instanceof HTMLButtonElement) el.type = 'button'
  el.style.cssText = `width:${size}px;height:${size}px;padding:0;border:0;background:none;cursor:pointer`
  el.innerHTML = html
  return el
}

const searchTerms = (query: string) => query.trim().toLowerCase().split(/\s+/).filter(Boolean)

const matches = (p: Place, terms: string[]) => {
  const rooms = p.floors?.flatMap((f) => f.rooms.map((r) => `${r.room} ${r.name}`)) ?? []
  const haystack = [p.name, p.address ?? '', p.description, ...(p.aliases ?? []), categoryLabel(p), ...rooms].join(' ').toLowerCase()
  return terms.every((t) => haystack.includes(t))
}

const pairs = (path: readonly LatLng[]) => path.map((p) => [p.lat, p.lng] as const)

/** Skybridges, shortcuts, and Panther Express never change while the page is open */
const linksData = (connections: readonly Connection[]) => collection(connections.map((c) => lineFeature(c.path, { id: c.id, kind: c.kind })))
const SHUTTLE_LINES_DATA = collection(PANTHER_EXPRESS.map((r) => lineFeature(shuttleShape(r.id), { id: r.id, color: r.color })))
const SHUTTLE_STOPS = (() => {
  const stops = new Map<string, { name: string; at: LatLng; routes: ShuttleRoute[] }>()
  for (const r of PANTHER_EXPRESS) {
    for (const s of locatedStops(r)) {
      const entry = stops.get(s.passioId!) ?? { name: s.name, at: s.at, routes: [] }
      if (!entry.routes.includes(r)) entry.routes.push(r)
      stops.set(s.passioId!, entry)
    }
  }
  return stops
})()
const SHUTTLE_STOPS_DATA = collection(
  [...SHUTTLE_STOPS].map(([id, s]) => point(s.at, { id, color: s.routes[0].color }))
)

/** Pin popups sit above the pin's tip; the pin image is 38 px tall */
const PIN_OFFSET: Gl.PopupOptions['offset'] = {
  center: [0, -19],
  top: [0, 0],
  'top-left': [0, 0],
  'top-right': [0, 0],
  bottom: [0, -38],
  'bottom-left': [0, -38],
  'bottom-right': [0, -38],
  left: [12, -22],
  right: [-12, -22],
}

const currentTheme = (): Theme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light')

export type CampusMapProps = {
  /** Place id to open on load (from ?place=) */
  initialPlaceId?: string
  /** Room in that place to highlight, e.g. "205" (from ?room=) */
  initialRoom?: string
  /** Filter to start with (from ?category=) */
  initialCategory?: string
  /** Tour to open on load, and its stop, 1-based (from ?tour= and ?stop=) */
  initialTour?: string
  initialStop?: string
  /** Route to open on load (from ?from=, ?to=, ?stairs=avoid, and ?indoor=prefer) */
  initialFrom?: string
  initialTo?: string
  initialAvoidStairs?: boolean
  initialPreferIndoor?: boolean
  /** "Coming by MARTA" line to open with (from ?line=blue) */
  initialLine?: string
  /** The buildings and spaces, from the dashboard; the built-in ones when left out */
  buildings?: readonly Place[]
  /** More places to show with the built-in ones: the club's own pins, from the dashboard */
  extraPlaces?: readonly Place[]
  /** Skybridges, indoor links, and shortcuts, from the dashboard; the built-in ones when left out */
  connections?: readonly Connection[]
  /** The places to eat to pin (with their hours), from the dashboard; the built-in ones when left out */
  eateries?: readonly Eatery[]
  /** Fine print at the end of the place list */
  children?: ReactNode
}

const NO_EXTRA: readonly Place[] = []

const isCategory = (c?: string): c is PlaceCategory => !!c && c in PLACE_CATEGORIES

/** Same as Tailwind's `lg`, where the panel docks beside the map instead of covering it */
const DOCKED = '(min-width: 64rem)'

const chipClass =
  'pointer-events-auto inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[0.82rem] font-semibold text-ink-soft shadow-card transition-colors hover:border-brand/50 hover:text-ink'

const toolClass = cn(chipClass, 'aria-pressed:border-brand aria-pressed:bg-brand-tint aria-pressed:text-ink max-lg:size-10 max-lg:justify-center max-lg:p-0')

export const CampusMap: FC<CampusMapProps> = ({
  initialPlaceId,
  initialRoom,
  initialCategory,
  initialTour,
  initialStop,
  initialFrom,
  initialTo,
  initialAvoidStairs,
  initialPreferIndoor,
  initialLine,
  buildings,
  extraPlaces = NO_EXTRA,
  connections = CONNECTIONS,
  eateries,
  children,
}) => {
  // The places (the dashboard's buildings and eateries, when given) and the club's pins together.
  // Map handlers registered once read the list through the ref, so they always see the current one.
  const places = useMemo(() => {
    const base = eateries || buildings ? placesWithEateries(eateries ?? EATERIES, buildings) : PLACES
    return extraPlaces.length ? [...base, ...extraPlaces] : base
  }, [buildings, eateries, extraPlaces])
  // Handlers registered once, and the route finder, read these through the ref too
  const connectionsRef = useRef(connections)
  connectionsRef.current = connections
  const placesRef = useRef(places)
  placesRef.current = places
  const findPlace = (id: string | undefined) => placesRef.current.find((p) => p.id === id)
  const isPlaceId = (id?: string): id is string => !!findPlace(id)

  const tourLink = tourFromLink(initialTour, initialStop)
  const startsInTour = !!tourLink
  const startsInRoute = isPlaceId(initialFrom) || isPlaceId(initialTo)

  const [mode, setMode] = useState<Mode>(startsInRoute ? 'route' : startsInTour ? 'tour' : 'explore')
  const [routeFrom, setRouteFrom] = useState(isPlaceId(initialFrom) ? initialFrom : '')
  const [routeTo, setRouteTo] = useState(isPlaceId(initialTo) ? initialTo : '')
  const [avoidStairs, setAvoidStairs] = useState(!!initialAvoidStairs)
  const [preferIndoor, setPreferIndoor] = useState(!!initialPreferIndoor)
  const [line, setLine] = useState<MartaLine | undefined>(isMartaLine(initialLine) && startsInRoute ? initialLine : undefined)
  const [showShuttles, setShowShuttles] = useState(false)
  const [showShuttleTrip, setShowShuttleTrip] = useState(false)
  const [tilted, setTilted] = useState(false)
  const [router, setRouter] = useState<Router>()
  const [tour, setTour] = useState(tourLink?.tour ?? TOURS[0])
  const [tourStep, setTourStep] = useState(tourLink?.step ?? 0)
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<ReadonlySet<PlaceCategory>>(
    () => new Set(isCategory(initialCategory) ? [initialCategory] : [])
  )
  const [openNow, setOpenNow] = useState(false)
  const [selectedId, setSelectedId] = useState<string | undefined>(
    isPlaceId(initialPlaceId) ? initialPlaceId : undefined
  )
  // A room in the selected place, from a search hit or ?room=; its popup opens on that floor
  const [selectedRoom, setSelectedRoom] = useState<string | undefined>(() =>
    floorOf(findPlace(initialPlaceId ?? '')?.floors, initialRoom) >= 0 ? initialRoom : undefined
  )
  const [position, setPosition] = useState<LatLng>()
  const [geo, setGeo] = useState<GeoState>('idle')
  const [geoNoticeHidden, setGeoNoticeHidden] = useState(false)
  // Below `lg`, how much of the map the panel covers; linked views open with their content showing
  const [sheet, setSheet] = useState<SheetStop>(startsInRoute || startsInTour || selectedId ? 'half' : 'peek')
  const [sheetDrag, setSheetDrag] = useState<number>()
  // Picking from the list moves focus into the place's panel; picking a pin leaves it on the map
  const [focusPlace, setFocusPlace] = useState(false)
  // Set after mount: open/closed depends on the viewer's clock, so the server never renders it
  const [now, setNow] = useState<Date>()
  const [ready, setReady] = useState(false)
  // Bumped each time the base style (re)loads, so overlays get redrawn on it
  const [styleVersion, setStyleVersion] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet
  const glRef = useRef<typeof Gl | null>(null)
  const mapRef = useRef<Gl.Map | null>(null)
  const themeRef = useRef<Theme>('light')
  const popupRef = useRef<Gl.Popup | null>(null)
  const dataRef = useRef<Record<SourceId, FeatureCollection>>({
    links: linksData(connections),
    'shuttle-lines': SHUTTLE_LINES_DATA,
    'shuttle-stops': SHUTTLE_STOPS_DATA,
    'tour-line': EMPTY,
    route: EMPTY,
    places: EMPTY,
  })
  const tourMarkersRef = useRef<Gl.Marker[]>([])
  const routeMarkersRef = useRef<Gl.Marker[]>([])
  const youRef = useRef<Gl.Marker | null>(null)
  const firstSelectRef = useRef(true)

  // Open/closed labels go stale; refresh every minute
  useEffect(() => {
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const statusFor = useMemo(() => {
    const cache = new Map<string, OpenStatus>()
    if (now) for (const p of places) if (p.schedule) cache.set(p.id, getOpenStatus(p.schedule, now))
    return (id: string) => cache.get(id)
  }, [now, places])

  const terms = useMemo(() => searchTerms(query), [query])

  const visible = useMemo(() => {
    const inFilter = (p: Place) =>
      categories.size === 0 || [p.category, ...(p.alsoIn ?? [])].some((c) => categories.has(c))
    const list = places.filter(
      (p) => inFilter(p) && matches(p, terms) && (!openNow || statusFor(p.id)?.open === true)
    )
    return position ? [...list].sort((a, b) => distanceMeters(position, a) - distanceMeters(position, b)) : list
  }, [places, terms, categories, openNow, statusFor, position])

  // Rooms the search turned up in the listed places, counted next to them
  const roomCount = useMemo(() => visible.reduce((n, p) => n + findRooms(p.floors, p.name, terms).length, 0), [visible, terms])

  // The walking network (~120 KB gzipped) only loads once someone opens Routes or the tour
  useEffect(() => {
    if (mode === 'explore' || router) return
    let cancelled = false
    import('@/lib/data/walk-graph.json').then(({ default: graph }) => {
      if (!cancelled) setRouter(new Router(graph as WalkGraph, ENTRANCES, connectionsRef.current))
    })
    return () => {
      cancelled = true
    }
  }, [mode, router])

  /**
   * Where a route starts or ends at a place: its doors and sides when the walking network
   * knows it, else its pin (a place added in the dashboard since the network was built)
   */
  const endpointOf = useCallback(
    (id: string): Endpoint | undefined => {
      if (router?.canRoute(id)) return { placeId: id }
      const place = places.find((p) => p.id === id)
      return place ? { point: { lat: place.lat, lng: place.lng } } : undefined
    },
    [router, places]
  )

  const route = useMemo(() => {
    if (!router || !routeFrom || !routeTo || routeFrom === routeTo) return undefined
    const start = routeFrom === HERE ? (position && geo !== 'far' ? { point: position } : undefined) : endpointOf(routeFrom)
    const end = endpointOf(routeTo)
    return start && end ? router.route(start, end, { avoidStairs, preferIndoor }) : undefined
  }, [router, routeFrom, routeTo, avoidStairs, preferIndoor, position, geo, endpointOf])

  // The tour's stops still on the map, in case the dashboard has taken a place down
  const tourStops = useMemo(
    () => tour.stops.flatMap((stop) => places.filter((p) => p.id === stop.placeId).map((place) => ({ stop, place }))),
    [tour, places]
  )

  // The walk from each tour stop to the next
  const tourLegs = useMemo(() => {
    if (!router) return undefined
    const ends = tourStops.map((s) => endpointOf(s.place.id))
    return ends.slice(1).map((end, i) => (ends[i] && end ? router.route(ends[i], end, {}) : undefined))
  }, [router, tourStops, endpointOf])

  // "Coming by MARTA": the line's stations near campus, nearest walk to the destination first
  const stations = useMemo<StationChoice[]>(() => {
    const end = routeTo ? endpointOf(routeTo) : undefined
    if (!router || !line || !end) return []
    return stationsOn(line)
      .flatMap((s) => {
        const r = s.placeId === routeTo ? undefined : router.route({ placeId: s.placeId }, end, { avoidStairs, preferIndoor })
        return r ? [{ placeId: s.placeId, route: r }] : []
      })
      .sort((a, b) => a.route.meters - b.route.meters)
  }, [router, line, routeTo, avoidStairs, preferIndoor, endpointOf])

  // A Panther Express ride, when it would save a good chunk of the walk
  const shuttle = useMemo(() => {
    if (!router || !route) return undefined
    const start = routeFrom === HERE ? (position ? { point: position } : undefined) : endpointOf(routeFrom)
    const end = endpointOf(routeTo)
    return start && end ? planShuttle(router, start, end, route, { avoidStairs, preferIndoor }) : undefined
  }, [router, route, routeFrom, routeTo, position, avoidStairs, preferIndoor, endpointOf])

  // Once there's a route, a sheet raised for the pickers drops back so the map shows it
  useEffect(() => {
    if (route) setSheet((s) => (s === 'full' ? 'half' : s))
  }, [route])

  // A new plan starts out showing the walk
  useEffect(() => setShowShuttleTrip(false), [shuttle])

  const shuttleStatus = (r: ShuttleRoute) => (now ? getOpenStatus(r.schedule, now) : undefined)

  // Start from the line's best stop whenever the line, destination, or options change;
  // picking another of its stops afterward sticks until one of those changes again
  useEffect(() => {
    if (line && stations.length) setRouteFrom(stations[0].placeId)
  }, [line, stations])

  /** Replace an overlay's data; kept so it survives a style change */
  const setSource = useCallback((id: SourceId, data: FeatureCollection) => {
    dataRef.current[id] = data
    ;(mapRef.current?.getSource(id) as Gl.GeoJSONSource | undefined)?.setData(data)
  }, [])

  const openPopup = useCallback((at: LatLng, html: string, onPin = false) => {
    const map = mapRef.current
    const popup = popupRef.current
    if (!map || !popup) return
    popup.setOffset(onPin ? PIN_OFFSET : 10).setLngLat([at.lng, at.lat]).setHTML(html)
    if (!popup.isOpen()) popup.addTo(map)
  }, [])

  /** Map pixels the bottom sheet hides, which camera moves keep their subject clear of */
  const mapCover = useCallback(() => {
    const map = mapRef.current
    return !map || window.matchMedia(DOCKED).matches ? 0 : sheetCover(sheetRef.current, map.getContainer().clientHeight)
  }, [])

  const fitTo = useCallback((points: readonly LatLng[], padding: number, maxZoom = 18) => {
    const gl = glRef.current
    const map = mapRef.current
    if (!gl || !map || !points.length) return
    const bounds = new gl.LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat])
    for (const p of points) bounds.extend([p.lng, p.lat])
    map.fitBounds(bounds, { padding: { top: padding, left: padding, right: padding, bottom: padding + mapCover() }, maxZoom, duration: 600 })
  }, [mapCover])

  // Create the map once, in the browser only
  useEffect(() => {
    let cancelled = false
    let map: Gl.Map | undefined

    import('maplibre-gl').then((gl) => {
      if (cancelled || !containerRef.current) return
      glRef.current = gl
      themeRef.current = currentTheme()
      // The worker can't be found relative to the bundled script; postinstall copies it here
      gl.setWorkerUrl(`/vendor/maplibre-gl-worker-${gl.getVersion()}.mjs`)

      map = new gl.Map({
        container: containerRef.current,
        style: STYLE_URL[themeRef.current],
        center: [CAMPUS_CENTER.lng, CAMPUS_CENTER.lat],
        zoom: CAMPUS_CENTER.zoom,
        minZoom: 14,
        maxZoom: 19.5,
        maxPitch: 60,
        // Reaches south to the athletics venues in Summerhill
        maxBounds: [
          [-84.41, 33.725],
          [-84.36, 33.775],
        ],
        // OpenFreeMap's tiles carry their own OpenMapTiles / OpenStreetMap credit
        attributionControl: { compact: true },
      })
      const m = map
      m.addControl(new gl.NavigationControl({ visualizePitch: true }), 'top-right')

      // Overlays go on top of every base style that loads (first load and each theme switch)
      m.on('style.load', () => {
        tuneBaseStyle(m, themeRef.current)
        addPinImages(m)
        addBuildings(m, themeRef.current)
        for (const id of SOURCES) {
          if (m.getSource(id)) continue
          m.addSource(
            id,
            id === 'places'
              ? // Nearby pins group into a count bubble; at zoom 17 and closer every pin shows
                { type: 'geojson', data: dataRef.current[id], cluster: true, clusterRadius: 40, clusterMaxZoom: 16 }
              : { type: 'geojson', data: dataRef.current[id] }
          )
        }
        for (const layer of overlayLayers(themeRef.current)) if (!m.getLayer(layer.id)) m.addLayer(layer)
        setStyleVersion((v) => v + 1)
      })

      popupRef.current = new gl.Popup({ maxWidth: '260px', focusAfterOpen: false })

      m.on('click', 'clusters', async (e) => {
        const f = e.features?.[0]
        if (!f) return
        const zoom = await (m.getSource('places') as Gl.GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id)
        m.easeTo({ center: (f.geometry as Point).coordinates as [number, number], zoom })
      })
      for (const id of ['pins', 'pin-selected']) {
        m.on('click', id, (e) => {
          const place = findPlace(e.features?.[0]?.properties?.id)
          if (!place) return
          if (modeRef.current === 'route') {
            openPopup(place, routePickHtml(place), true)
            return
          }
          setSelectedId(place.id)
          setSelectedRoom(undefined)
          setFocusPlace(false)
          setSheet('half')
        })
      }
      for (const id of ['links', 'links-shortcut']) {
        m.on('click', id, (e) => {
          const c = connectionsRef.current.find((x) => x.id === e.features?.[0]?.properties?.id)
          if (c) openPopup(e.lngLat, connectionHtml(c.name, c.note))
        })
      }
      m.on('click', 'shuttle-stops', (e) => {
        const stop = SHUTTLE_STOPS.get(e.features?.[0]?.properties?.id)
        if (stop) openPopup(stop.at, shuttleStopHtml(stop.name, stop.routes))
      })
      for (const id of CLICKABLE) {
        m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'))
        m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''))
      }
      // Follows the pitch as it changes (right-drag, two-finger drag, the compass), not just when it settles
      m.on('pitch', () => setTilted(m.getPitch() > 10))

      // "Start here" and "Route here" in a route popup fill that end of the route. Delegated from
      // the container because popup HTML is replaced each time it opens.
      containerRef.current.addEventListener('click', (e) => {
        const button = (e.target as Element).closest<HTMLElement>('[data-route-from], [data-route-to]')
        if (!button) return
        const { routeFrom: from, routeTo: to } = button.dataset
        if (to) setRouteTo(to)
        if (from) {
          setRouteFrom(from)
          // Starting somewhere that line doesn't stop ends "Coming by MARTA"
          setLine((l) => (l && !linesAt(from).includes(l) ? undefined : l))
        }
        popupRef.current?.remove()
      })

      mapRef.current = m
      m.once('load', () => setReady(true))
    })

    return () => {
      cancelled = true
      map?.remove()
      mapRef.current = null
      popupRef.current = null
    }
  }, [openPopup])

  // Follow the site's light/dark switch with the matching base style
  useEffect(() => {
    if (!ready) return
    const observer = new MutationObserver(() => {
      const theme = currentTheme()
      if (theme === themeRef.current) return
      themeRef.current = theme
      mapRef.current?.setStyle(STYLE_URL[theme], { diff: false })
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [ready])

  // Which overlays show in each mode
  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleVersion) return
    const show = (ids: string[], on: boolean) => {
      for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
    }
    // Places and their names show while exploring and routing, under the route line
    show(['clusters', 'cluster-count', 'pin-labels', 'pins', 'pin-selected'], mode !== 'tour')
    show(['links', 'links-shortcut'], mode !== 'tour')
    show(['shuttle-lines', 'shuttle-stops'], showShuttles && mode !== 'tour')
    show(['tour-line'], mode === 'tour')
    show(['route-casing', 'route-walk', 'route-ride', 'route-stops'], mode === 'route')
    // Extruded buildings only read well tilted; flat, the base style's footprints are cleaner
    setBuildings3d(map, tilted)
  }, [mode, showShuttles, tilted, styleVersion])

  // A popup belongs to the mode it opened in
  useEffect(() => {
    popupRef.current?.remove()
  }, [mode])

  // Explore: the filtered places (plus the selected one), faded when known to be closed
  useEffect(() => {
    const shown = selectedId && !visible.some((p) => p.id === selectedId) ? [...visible, findPlace(selectedId)!] : visible
    setSource(
      'places',
      collection(
        shown.map((p) => {
          const status = statusFor(p.id)
          return point(p, { id: p.id, name: p.name, category: p.category, closed: status ? !status.open : false, selected: p.id === selectedId })
        })
      )
    )
  }, [visible, statusFor, selectedId, setSource])

  // Center and open the selected place; mirror it in the URL
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || mode !== 'explore') return
    const url = new URL(window.location.href)
    for (const key of ['tour', 'stop', 'from', 'to', 'stairs', 'indoor', 'line', 'room']) url.searchParams.delete(key)
    if (selectedId) url.searchParams.set('place', selectedId)
    else url.searchParams.delete('place')
    if (selectedId && selectedRoom) url.searchParams.set('room', selectedRoom)
    window.history.replaceState(null, '', url)

    const place = selectedId ? findPlace(selectedId) : undefined
    if (!place) return
    const center: [number, number] = [place.lng, place.lat]
    const zoom = Math.max(map.getZoom(), 17)
    // Jump straight to a linked place on load; animate later picks
    // Centered in the part of the map the bottom sheet leaves showing
    const offset: [number, number] = [0, -mapCover() / 2]
    if (firstSelectRef.current) map.easeTo({ center, zoom, offset, duration: 0 })
    else map.flyTo({ center, zoom, offset, duration: 600 })
    firstSelectRef.current = false
  }, [selectedId, selectedRoom, ready, mode, mapCover])

  // Tour mode: numbered stops joined by a dashed line, in place of the regular pins
  useEffect(() => {
    const gl = glRef.current
    const map = mapRef.current
    for (const m of tourMarkersRef.current) m.remove()
    tourMarkersRef.current = []
    if (!gl || !map || !ready || mode !== 'tour') return
    popupRef.current?.remove()
    tourMarkersRef.current = tourStops.map(({ stop, place: p }, i) => {
      const el = markerElement(`<span class="cseg-tour-pin">${i + 1}</span>`, 32, 'button')
      el.setAttribute('aria-label', `Stop ${i + 1}: ${stop.title}`)
      el.addEventListener('click', () => setTourStep(i))
      return new gl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(new gl.Popup({ offset: 18, maxWidth: '240px', focusAfterOpen: false }).setHTML(tourStopHtml(i, stop, p)))
        .addTo(map)
    })
    fitTo(tourStops.map((s) => s.place), 40)
  }, [mode, ready, tourStops, fitTo])

  // Tour line: the walking paths between stops, or a straight hop where there isn't one
  useEffect(() => {
    if (mode !== 'tour' || !tourLegs) return
    setSource(
      'tour-line',
      collection(
        tourLegs.map((leg, i) => {
          return lineFeature(pairs(leg?.path ?? [tourStops[i].place, tourStops[i + 1].place]))
        })
      )
    )
  }, [mode, tourStops, tourLegs, setSource])

  // Tour step: highlight it, center on it, and keep it in the URL (?tour=commuter&stop=3)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || mode !== 'tour') return
    tourMarkersRef.current.forEach((m, i) => {
      m.getElement().querySelector('.cseg-tour-pin')?.classList.toggle('is-active', i === tourStep)
      if (i !== tourStep && m.getPopup()?.isOpen()) m.togglePopup()
    })
    const marker = tourMarkersRef.current[tourStep]
    if (marker) {
      map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 17), offset: [0, -mapCover() / 2], duration: 500 })
      if (!marker.getPopup()?.isOpen()) marker.togglePopup()
    }
    const url = new URL(window.location.href)
    for (const key of ['place', 'room', 'from', 'to', 'stairs', 'indoor', 'line']) url.searchParams.delete(key)
    url.searchParams.set('tour', tour.id)
    url.searchParams.set('stop', String(tourStep + 1))
    window.history.replaceState(null, '', url)
  }, [tour, tourStops, tourStep, mode, ready, mapCover])

  // Route mode: the route line with A/B ends in place of the regular pins; keep it in the URL
  useEffect(() => {
    const gl = glRef.current
    const map = mapRef.current
    for (const m of routeMarkersRef.current) m.remove()
    routeMarkersRef.current = []
    if (!gl || !map || !ready) return
    if (mode !== 'route') {
      setSource('route', EMPTY)
      return
    }

    const url = new URL(window.location.href)
    for (const key of ['place', 'room', 'tour', 'stop', 'from', 'to', 'stairs', 'indoor', 'line']) url.searchParams.delete(key)
    // "My location" isn't shareable, so only a building start goes in the link
    if (routeFrom && routeFrom !== HERE) url.searchParams.set('from', routeFrom)
    if (routeTo) url.searchParams.set('to', routeTo)
    if (avoidStairs) url.searchParams.set('stairs', 'avoid')
    if (preferIndoor) url.searchParams.set('indoor', 'prefer')
    if (line) url.searchParams.set('line', line)
    window.history.replaceState(null, '', url)

    const pin = (p: LatLng, letter: 'A' | 'B') =>
      new gl.Marker({
        element: markerElement(`<span class="cseg-route-pin is-${letter === 'A' ? 'start' : 'end'}">${letter}</span>`, 28),
      })
        .setLngLat([p.lng, p.lat])
        .addTo(map)

    // Ends picked but no route yet: still mark them
    if (!route) {
      setSource('route', EMPTY)
      const ends = [routeFrom === HERE ? position : findPlace(routeFrom), findPlace(routeTo)]
      routeMarkersRef.current = ends.flatMap((p, i) => (p ? [pin(p, i ? 'B' : 'A')] : []))
      return
    }

    let points: LatLng[]
    if (showShuttleTrip && shuttle) {
      // Walk to the stop, ride in the route's color, walk the rest
      const ride = rideBetween(shuttle.route.id, shuttle.board.at, shuttle.alight.at)
      const color = shuttle.route.color
      setSource(
        'route',
        collection([
          lineFeature(pairs(shuttle.walkTo.path), { role: 'walk' }),
          lineFeature(ride, { role: 'ride', color }),
          lineFeature(pairs(shuttle.walkFrom.path), { role: 'walk' }),
          point(shuttle.board.at, { role: 'stop', color }),
          point(shuttle.alight.at, { role: 'stop', color }),
        ])
      )
      points = [...shuttle.walkTo.path, ...ride.map(([lat, lng]) => ({ lat, lng })), ...shuttle.walkFrom.path]
    } else {
      setSource('route', collection([lineFeature(pairs(route.path), { role: 'walk' })]))
      points = route.path
    }
    routeMarkersRef.current = [pin(points[0], 'A'), pin(points.at(-1)!, 'B')]
    fitTo(points, 48)
  }, [mode, ready, route, routeFrom, routeTo, avoidStairs, preferIndoor, line, position, shuttle, showShuttleTrip, setSource, fitTo])

  // "You are here" dot
  useEffect(() => {
    const gl = glRef.current
    const map = mapRef.current
    if (!gl || !map || !position) return
    if (!youRef.current) {
      const el = markerElement('<span class="cseg-you"></span>', 20)
      el.style.cursor = 'default'
      el.title = 'You are here'
      youRef.current = new gl.Marker({ element: el }).setLngLat([position.lng, position.lat]).addTo(map)
    } else {
      youRef.current.setLngLat([position.lng, position.lat])
    }
  }, [position, ready])

  // 3D view: tilt so building heights show, close enough in that the buildings are drawn
  const toggleTilt = () => {
    const map = mapRef.current
    if (!map) return
    const next = !tilted
    setTilted(next)
    map.easeTo(
      next ? { pitch: TILT_DEGREES, zoom: Math.max(map.getZoom(), BUILDINGS_3D_MINZOOM + 1), duration: 600 } : { pitch: 0, duration: 600 }
    )
  }

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGeo('unavailable')
      return
    }
    setGeo('locating')
    setGeoNoticeHidden(false)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const here = { lat: coords.latitude, lng: coords.longitude }
        setPosition(here)
        const near = distanceMeters(here, CAMPUS_CENTER) <= NEAR_CAMPUS_METERS
        setGeo(near ? 'found' : 'far')
        if (near) mapRef.current?.flyTo({ center: [here.lng, here.lat], zoom: 17, duration: 600 })
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    )
  }

  const toggleCategory = (c: PlaceCategory) =>
    setCategories((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })

  const goToStep = (i: number) => setTourStep(Math.min(Math.max(i, 0), tourStops.length - 1))

  const pickTour = (next: Tour) => {
    setTour(next)
    setTourStep(0)
  }

  const pickFrom = (id: string) => {
    setRouteFrom(id)
    // Starting somewhere that line doesn't stop ends "Coming by MARTA"
    if (line && !linesAt(id).includes(line)) setLine(undefined)
    if (id === HERE && !position && geo !== 'locating') locate()
  }

  const showConnection = (id: string) => {
    const c = connections.find((x) => x.id === id)
    if (!c) return
    const path = c.path.map(([lat, lng]) => ({ lat, lng }))
    sheetRef.current = 'half'
    setSheet('half')
    fitTo(path, 80)
    openPopup(path[Math.floor(path.length / 2)], connectionHtml(c.name, c.note))
  }

  const changeMode = (next: Mode) => {
    setMode(next)
    setSheet((s) => (s === 'peek' ? 'half' : s))
  }

  const selectPlace = (id: string, room?: string) => {
    setSelectedId(id)
    setSelectedRoom(room)
    setFocusPlace(true)
    setSheet('half')
  }

  /** Back to the list, with focus on the row the viewer came from */
  const deselect = () => {
    const id = selectedId
    setSelectedId(undefined)
    setSelectedRoom(undefined)
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>(`[data-place="${id}"]`)?.focus())
  }

  /** From a tour stop to its place in Explore */
  const openPlace = (id: string) => {
    setSelectedId(id)
    setSelectedRoom(undefined)
    setFocusPlace(true)
    setMode('explore')
  }

  const routeHere = (id: string) => {
    setRouteTo(id)
    setSelectedId(undefined)
    setSelectedRoom(undefined)
    changeMode('route')
  }

  const geoMessage: Partial<Record<GeoState, string>> = {
    locating: 'Finding you…',
    far: 'You’re away from campus, so the list is sorted by distance but the map stays on campus.',
    denied: 'Location is blocked. Allow it in your browser settings to sort by distance.',
    unavailable: 'Couldn’t get your location. Try again in a moment.',
  }

  const locationProblem =
    routeFrom !== HERE
      ? undefined
      : geo === 'far'
        ? 'You’re away from campus, so routes can’t start from your location. Pick a starting building instead.'
        : !position
          ? (geoMessage[geo] ?? 'Finding you…')
          : undefined

  const selected = mode === 'explore' ? findPlace(selectedId) : undefined
  const geoNotice = geoNoticeHidden ? undefined : geoMessage[geo]

  return (
    // Fills the screen under the header; `isolate` keeps the map's controls and popups below the header and menus
    <div className="relative isolate flex h-[calc(100dvh-var(--header-height))] min-h-120 overflow-hidden">
      {/* The panel comes first in the page: it's the accessible way to browse what the map shows */}
      <section
        ref={panelRef}
        aria-label="Campus map panel"
        style={sheetDrag ? { height: sheetDrag } : undefined}
        className={cn(
          'flex min-h-0 flex-col bg-surface lg:h-full lg:w-100 lg:shrink-0 lg:border-r lg:border-line',
          'max-lg:absolute max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-20 max-lg:overflow-hidden max-lg:rounded-t-2xl max-lg:shadow-[0_-8px_28px_rgb(0_0_0/0.18)]',
          !sheetDrag && 'max-lg:transition-[height] max-lg:duration-200 max-lg:ease-out motion-reduce:transition-none',
          sheetClass[sheet]
        )}
      >
        <SheetHandle stop={sheet} onStop={setSheet} onDrag={setSheetDrag} sheetRef={panelRef} />
        <header className="flex flex-col gap-3 border-b border-line px-4 pb-3 lg:pt-5">
          <div className="flex flex-col gap-1">
            <p className={cn(eyebrow, 'max-lg:hidden')}>Campus map</p>
            {/* Routes and the tour need the room on phones */}
            <h1 className={cn('text-[1.1rem] leading-tight font-extrabold tracking-tight text-ink lg:text-[1.6rem]', mode !== 'explore' && 'max-lg:sr-only')}>
              Find your way around
            </h1>
            <p className="text-[0.84rem] leading-relaxed text-muted max-lg:hidden">
              Every building, study spot, bite to eat, parking deck, and MARTA stop on the Atlanta campus, and the quickest walk between them.
            </p>
          </div>
          <div className="flex rounded-xl border border-line bg-fill p-1" role="tablist" aria-label="Map mode">
            {(
              [
                ['explore', 'Explore', MapIcon],
                ['route', 'Routes', RouteIcon],
                ['tour', 'Tours', Footprints],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => changeMode(value)}
                className="inline-flex flex-auto cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.82rem] font-semibold whitespace-nowrap text-ink-soft transition-colors hover:text-ink aria-selected:bg-surface aria-selected:text-brand aria-selected:shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
              >
                <Icon size={15} aria-hidden />
                {label}
              </button>
            ))}
          </div>
          {mode === 'explore' && !selected ? (
            <label className="relative block">
              <span className="sr-only">Search places</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint" size={17} aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSheet('full')}
                placeholder="Search buildings, rooms, food…"
                className="h-11 w-full rounded-xl border border-line bg-surface pr-10 pl-9.5 text-[0.9rem] text-ink outline-none placeholder:text-ink-faint focus:border-brand focus-visible:outline-2 focus-visible:outline-brand/40 [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-ink-faint hover:text-ink"
                  aria-label="Clear search"
                >
                  <X size={16} aria-hidden />
                </button>
              ) : null}
            </label>
          ) : null}
        </header>

        {mode === 'tour' ? (
          <TourPanel
            tour={tour}
            stops={tourStops}
            onTour={pickTour}
            step={tourStep}
            onStep={goToStep}
            position={position}
            legs={tourLegs}
            onOpenPlace={openPlace}
            onFinish={() => changeMode('explore')}
          />
        ) : mode === 'route' ? (
          <RoutePanel
            places={places}
            from={routeFrom}
            to={routeTo}
            avoidStairs={avoidStairs}
            onFrom={pickFrom}
            onTo={setRouteTo}
            onSwap={() => {
              // "My location" can only be a start, and a swapped trip no longer starts off the train
              setRouteFrom(routeTo)
              setRouteTo(routeFrom === HERE ? '' : routeFrom)
              setLine(undefined)
            }}
            preferIndoor={preferIndoor}
            onAvoidStairs={setAvoidStairs}
            onPreferIndoor={setPreferIndoor}
            line={line}
            stations={stations}
            onLine={setLine}
            shuttle={shuttle}
            shuttleStatus={shuttleStatus}
            showShuttleTrip={showShuttleTrip}
            onShowShuttleTrip={setShowShuttleTrip}
            connections={connections}
            onShowConnection={showConnection}
            route={route}
            loading={!router}
            locationProblem={locationProblem}
            now={now}
            onPicking={() => setSheet('full')}
          />
        ) : (
          <>
            {selected ? (
              <PlacePanel
                key={`${selected.id}:${selectedRoom ?? ''}`}
                place={selected}
                room={selectedRoom}
                status={statusFor(selected.id)}
                away={position ? `${distanceLabel(distanceMeters(position, selected))} away` : undefined}
                takeFocus={focusPlace}
                onBack={deselect}
                onRoute={routeHere}
              />
            ) : null}
            {/* Stays mounted behind a picked place, so going back keeps the search and scroll position */}
            <div className={cn('flex min-h-0 flex-1 flex-col', selected && 'hidden')}>
              <p className="border-b border-line px-4 py-2 text-[0.78rem] font-semibold text-muted" aria-live="polite">
                {visible.length} {visible.length === 1 ? 'place' : 'places'}
                {roomCount ? ` · ${roomCount} ${roomCount === 1 ? 'room' : 'rooms'}` : ''}
                {openNow ? ' open now' : ''}
                {position ? ' · nearest first' : ''}
              </p>
              <div className="flex-1 overflow-y-auto">
                {openNow ? (
                  <p className="border-b border-line bg-fill px-4 py-2 text-[0.78rem] leading-relaxed text-muted">
                    “Open now” only includes places with hours confirmed by an official source (mostly campus dining). Hours
                    are Atlanta time.
                  </p>
                ) : null}
                {visible.length ? (
                  <ul className="divide-y divide-line border-b border-line">
                    {visible.map((p) => {
                      const status = statusFor(p.id)
                      // Rooms under the building that a search matches ("trio", "scw 462")
                      const rooms = findRooms(p.floors, p.name, terms)
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            data-place={p.id}
                            onClick={() => selectPlace(p.id)}
                            className={cn(
                              'flex w-full cursor-pointer items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand-wash',
                              'focus-visible:bg-brand-wash focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand'
                            )}
                          >
                            <span
                              className="mt-1.5 size-2.5 shrink-0 rounded-full"
                              style={{ background: PLACE_CATEGORIES[p.category].color }}
                              aria-hidden
                            />
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="text-[0.9rem] leading-snug font-bold text-ink">{p.name}</span>
                              <span className="text-[0.76rem] text-muted">
                                {position ? `${distanceLabel(distanceMeters(position, p))} · ` : ''}
                                {categoryLabel(p)}
                              </span>
                              {status ? (
                                <span
                                  className={cn(
                                    'text-[0.74rem] font-bold',
                                    status.open ? 'text-[#15803d] dark:text-[#4ade80]' : 'text-ink-faint'
                                  )}
                                >
                                  {status.label}
                                </span>
                              ) : null}
                            </span>
                          </button>
                          {rooms.length ? (
                            <ul className="pb-2" aria-label={`Rooms in ${p.name}`}>
                              {rooms.map(({ floor, room }) => (
                                <li key={room.room}>
                                  <button
                                    type="button"
                                    onClick={() => selectPlace(p.id, room.room)}
                                    className={cn(
                                      'flex w-full cursor-pointer items-baseline gap-2.5 py-1.5 pr-4 pl-9.5 text-left text-[0.8rem] transition-colors hover:bg-brand-wash',
                                      'focus-visible:bg-brand-wash focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand'
                                    )}
                                  >
                                    <span className="w-10 shrink-0 font-semibold text-muted tabular-nums">{room.room}</span>
                                    <span className="min-w-0 flex-1 text-ink">{room.name}</span>
                                    <span className="shrink-0 text-[0.72rem] text-ink-faint">{ordinal(p.floors![floor].level)} fl.</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                    <MapPin className="text-ink-faint" size={22} aria-hidden />
                    <p className="text-[0.9rem] text-muted">
                      {openNow
                        ? 'Nothing with confirmed hours is open right now. Turn off “Open now” to see everything.'
                        : 'No places match. Try another search or category.'}
                    </p>
                  </div>
                )}
                {children ? <p className="px-4 py-3 text-[0.76rem] leading-relaxed text-muted">{children}</p> : null}
              </div>
            </div>
          </>
        )}
      </section>

      <div className="cseg-map relative min-w-0 flex-1 bg-fill">
        <div ref={containerRef} className="size-full" aria-label="Campus map" role="region" />
        {!ready ? (
          <p className="absolute inset-0 grid place-items-center text-[0.9rem] text-muted">Loading map…</p>
        ) : null}

        {/* Filters along the top of the map: one scrolling row on phones, wrapped beside the zoom buttons on desktop */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 py-2.5 lg:pr-14 lg:pl-2.5">
          {mode === 'explore' ? (
            <div
              className="pointer-events-auto flex gap-1.5 overflow-x-auto px-2.5 [scrollbar-width:none] lg:pointer-events-none lg:flex-wrap lg:overflow-visible lg:px-0"
              role="group"
              aria-label="Filter places"
            >
              <button
                type="button"
                aria-pressed={categories.size === 0}
                onClick={() => setCategories(new Set())}
                className={cn(chipClass, 'aria-pressed:border-brand-solid aria-pressed:bg-brand-solid aria-pressed:text-white')}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setOpenNow((v) => !v)}
                aria-pressed={openNow}
                className={cn(chipClass, 'aria-pressed:border-[#15803d] aria-pressed:bg-[color-mix(in_srgb,#15803d_12%,var(--bg))] aria-pressed:text-ink')}
              >
                <Clock size={14} aria-hidden />
                Open now
              </button>
              {CATEGORY_ORDER.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={categories.has(c)}
                  onClick={() => toggleCategory(c)}
                  className={cn(chipClass, 'aria-pressed:border-brand aria-pressed:bg-brand-tint aria-pressed:text-ink')}
                >
                  <span className="size-2.5 rounded-full" style={{ background: PLACE_CATEGORIES[c].color }} aria-hidden />
                  {PLACE_CATEGORIES[c].label}
                </button>
              ))}
            </div>
          ) : null}
          {geoNotice ? (
            <p
              className="pointer-events-auto mx-2.5 flex items-start gap-2 self-start rounded-xl border border-line bg-surface py-1.5 pr-1.5 pl-3 text-[0.8rem] text-ink-soft shadow-card max-lg:mr-14 lg:mx-0"
              role="status"
            >
              {geoNotice}
              <button
                type="button"
                onClick={() => setGeoNoticeHidden(true)}
                className="grid size-5 shrink-0 cursor-pointer place-items-center rounded text-ink-faint hover:text-ink"
                aria-label="Dismiss"
              >
                <X size={14} aria-hidden />
              </button>
            </p>
          ) : null}
        </div>

        {/* Under MapLibre's zoom buttons; just the icons on phones */}
        <div className="pointer-events-none absolute top-[calc(var(--map-controls-top)+6.25rem)] right-2.5 z-10 flex flex-col items-end gap-1.5">
          <button type="button" onClick={locate} aria-pressed={!!position} title="Near me" className={toolClass}>
            <LocateFixed size={15} className={geo === 'locating' ? 'animate-pulse' : ''} aria-hidden />
            <span className="max-lg:sr-only">Near me</span>
          </button>
          {mode !== 'tour' ? (
            <button
              type="button"
              onClick={() => setShowShuttles((v) => !v)}
              aria-pressed={showShuttles}
              title="Panther Express"
              className={toolClass}
            >
              <Bus size={15} aria-hidden />
              <span className="max-lg:sr-only">Panther Express</span>
            </button>
          ) : null}
          <button type="button" onClick={toggleTilt} aria-pressed={tilted} title="3D view" className={toolClass}>
            <Box size={15} aria-hidden />
            <span className="max-lg:sr-only">3D view</span>
          </button>
        </div>
      </div>
    </div>
  )
}
