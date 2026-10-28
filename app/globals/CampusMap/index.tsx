'use client'

import 'maplibre-gl/dist/maplibre-gl.css'

import type { FeatureCollection, Point } from 'geojson'
import type * as Gl from 'maplibre-gl'
import { Box, Bus, Clock, Footprints, LocateFixed, Map as MapIcon, MapPin, Route as RouteIcon, Search, X } from 'lucide-react'
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { CONNECTIONS } from '@/lib/data/connections'
import { ENTRANCES } from '@/lib/data/entrances'
import { CAMPUS_CENTER, PLACE_CATEGORIES, PLACES, placesWithEateries, type Place, type PlaceCategory } from '@/lib/data/places'
import type { Eatery } from '@/lib/eateries'
import { allRooms, findRooms, floorLabel, floorOf, ordinal } from '@/lib/data/rooms'
import { TOUR_STOPS } from '@/lib/data/tour'
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
import { Router, type WalkGraph } from '@/lib/wayfinding'
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
import { HERE, RoutePanel, type StationChoice } from './RoutePanel'
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

const directionsUrl = (p: Place) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking`

const categoryLabel = (p: Place) =>
  [p.category, ...(p.alsoIn ?? [])].map((c) => PLACE_CATEGORIES[c].label).join(' & ')

/**
 * A building's room directory: a button per floor and that floor's rooms, with `room`
 * highlighted. The buttons redraw the popup (see the container's click handler).
 */
const floorsHtml = (p: Place, floor: number, room?: string) => {
  const floors = p.floors!
  const f = floors[floor]
  return `
    <div class="mt-1 flex flex-col gap-2 border-t border-line pt-2.5">
      <span class="text-[0.7rem] font-bold tracking-wider text-muted uppercase">Rooms by floor</span>
      <span class="flex flex-wrap gap-1" role="group" aria-label="Floor">
        ${floors
          .map(
            (x, i) =>
              `<button type="button" data-floor="${i}" data-place="${p.id}" aria-pressed="${i === floor}" aria-label="${floorLabel(x.level)}" class="cursor-pointer rounded-md border border-line px-2.5 py-0.5 text-[0.75rem] font-semibold text-ink-soft hover:border-brand/50 aria-pressed:border-brand-solid aria-pressed:bg-brand-solid aria-pressed:text-white">${ordinal(x.level)}</button>`
          )
          .join('')}
      </span>
      ${f.note ? `<p class="m-0! text-[0.8rem] text-muted">${escapeHtml(f.note)}</p>` : ''}
      ${
        f.rooms.length
          ? `<ul class="m-0! flex list-none flex-col gap-0.5 p-0! text-[0.8rem] leading-snug" aria-label="${floorLabel(f.level)}">${f.rooms
              .map(
                (r) =>
                  `<li class="flex gap-2 rounded px-1 py-px${r.room === room ? ' bg-brand-tint font-semibold' : ''}"><span class="w-10 shrink-0 text-muted tabular-nums">${escapeHtml(r.room)}</span><span>${escapeHtml(r.name)}</span></li>`
              )
              .join('')}</ul>`
          : ''
      }
    </div>`
}

/** Popup body; plain HTML because map popups live outside React. Opens on `room`'s floor when given. */
const popupHtml = (p: Place, status?: OpenStatus, view: { floor?: number; room?: string } = {}) => {
  const { color } = PLACE_CATEGORIES[p.category]
  const floor = view.floor ?? Math.max(floorOf(p.floors, view.room), 0)
  return `
    <div class="flex flex-col gap-1.5">
      <span class="text-[0.7rem] font-bold tracking-wider uppercase" style="color:${color}">${categoryLabel(p)}</span>
      <strong class="text-[0.95rem] leading-snug">${escapeHtml(p.name)}</strong>
      ${p.address ? `<span class="text-[0.8rem] text-muted">${escapeHtml(p.address)}</span>` : ''}
      ${status ? `<span class="text-[0.8rem] font-bold ${status.open ? 'text-[#15803d] dark:text-[#4ade80]' : 'text-muted'}">${escapeHtml(status.label)}</span>` : ''}
      <p class="m-0! text-[0.85rem] leading-relaxed">${escapeHtml(p.description)}</p>
      ${p.floors?.length ? floorsHtml(p, floor, view.room) : ''}
      <span class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        <button type="button" data-route-to="${p.id}" class="cursor-pointer p-0 text-[0.85rem] font-semibold text-brand hover:underline">Route here</button>
        <a class="text-[0.85rem] font-semibold text-brand!" href="${directionsUrl(p)}" target="_blank" rel="noopener noreferrer">Google Maps &#8599;</a>
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

const tourStopHtml = (i: number, place: Place) =>
  `<div class="flex flex-col gap-1"><span class="text-[0.7rem] font-bold tracking-wider text-brand uppercase">Stop ${i + 1}</span><strong class="text-[0.95rem] leading-snug">${escapeHtml(TOUR_STOPS[i].title)}</strong><span class="text-[0.8rem] text-muted">${escapeHtml(place.name)}</span></div>`

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
const LINKS_DATA = collection(CONNECTIONS.map((c) => lineFeature(c.path, { id: c.id, kind: c.kind })))
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
  /** Tour stop to open on load, 1-based (from ?tour=) */
  initialTourStop?: string
  /** Route to open on load (from ?from=, ?to=, ?stairs=avoid, and ?indoor=prefer) */
  initialFrom?: string
  initialTo?: string
  initialAvoidStairs?: boolean
  initialPreferIndoor?: boolean
  /** "Coming by MARTA" line to open with (from ?line=blue) */
  initialLine?: string
  /** More places to show with the built-in ones: the club's own pins, from the dashboard */
  extraPlaces?: readonly Place[]
  /** The places to eat to pin (with their hours), from the dashboard; the built-in ones when left out */
  eateries?: readonly Eatery[]
}

const NO_EXTRA: readonly Place[] = []

const isCategory = (c?: string): c is PlaceCategory => !!c && c in PLACE_CATEGORIES

const chipClass =
  'inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-[0.85rem] font-semibold text-ink-soft transition-colors hover:border-brand/50 hover:text-ink'

export const CampusMap: FC<CampusMapProps> = ({
  initialPlaceId,
  initialRoom,
  initialCategory,
  initialTourStop,
  initialFrom,
  initialTo,
  initialAvoidStairs,
  initialPreferIndoor,
  initialLine,
  extraPlaces = NO_EXTRA,
  eateries,
}) => {
  // Built-in places (with the dashboard's eateries, when given) and the club's pins together.
  // Map handlers registered once read the list through the ref, so they always see the current one.
  const places = useMemo(() => {
    const base = eateries ? placesWithEateries(eateries) : PLACES
    return extraPlaces.length ? [...base, ...extraPlaces] : base
  }, [eateries, extraPlaces])
  const placesRef = useRef(places)
  placesRef.current = places
  const findPlace = (id: string | undefined) => placesRef.current.find((p) => p.id === id)
  const isPlaceId = (id?: string): id is string => !!findPlace(id)

  const initialStep = Number(initialTourStop)
  const startsInTour = Number.isInteger(initialStep) && initialStep >= 1 && initialStep <= TOUR_STOPS.length
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
  const [tourStep, setTourStep] = useState(startsInTour ? initialStep - 1 : 0)
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
  // Set after mount: open/closed depends on the viewer's clock, so the server never renders it
  const [now, setNow] = useState<Date>()
  const [ready, setReady] = useState(false)
  // Bumped each time the base style (re)loads, so overlays get redrawn on it
  const [styleVersion, setStyleVersion] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<typeof Gl | null>(null)
  const mapRef = useRef<Gl.Map | null>(null)
  const themeRef = useRef<Theme>('light')
  const popupRef = useRef<Gl.Popup | null>(null)
  /** What the open popup shows; closing a place popup clears the selection */
  const popupKindRef = useRef<'place' | 'other'>('other')
  const dataRef = useRef<Record<SourceId, FeatureCollection>>({
    links: LINKS_DATA,
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
  const statusRef = useRef(statusFor)
  statusRef.current = statusFor

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

  // The walking network (~120 KB gzipped) only loads once someone opens Routes
  useEffect(() => {
    if (mode !== 'route' || router) return
    let cancelled = false
    import('@/lib/data/walk-graph.json').then(({ default: graph }) => {
      if (!cancelled) setRouter(new Router(graph as WalkGraph, ENTRANCES, CONNECTIONS))
    })
    return () => {
      cancelled = true
    }
  }, [mode, router])

  const route = useMemo(() => {
    if (!router || !routeFrom || !routeTo || routeFrom === routeTo) return undefined
    const start = routeFrom === HERE ? (position && geo !== 'far' ? { point: position } : undefined) : { placeId: routeFrom }
    return start ? router.route(start, { placeId: routeTo }, { avoidStairs, preferIndoor }) : undefined
  }, [router, routeFrom, routeTo, avoidStairs, preferIndoor, position, geo])

  // "Coming by MARTA": the line's stations near campus, nearest walk to the destination first
  const stations = useMemo<StationChoice[]>(() => {
    if (!router || !line || !routeTo) return []
    return stationsOn(line)
      .flatMap((s) => {
        const r = s.placeId === routeTo ? undefined : router.route({ placeId: s.placeId }, { placeId: routeTo }, { avoidStairs, preferIndoor })
        return r ? [{ placeId: s.placeId, route: r }] : []
      })
      .sort((a, b) => a.route.meters - b.route.meters)
  }, [router, line, routeTo, avoidStairs, preferIndoor])

  // A Panther Express ride, when it would save a good chunk of the walk
  const shuttle = useMemo(() => {
    if (!router || !route) return undefined
    const start = routeFrom === HERE ? (position ? { point: position } : undefined) : { placeId: routeFrom }
    return start ? planShuttle(router, start, { placeId: routeTo }, route, { avoidStairs, preferIndoor }) : undefined
  }, [router, route, routeFrom, routeTo, position, avoidStairs, preferIndoor])

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

  const openPopup = useCallback((at: LatLng, html: string, kind: 'place' | 'other') => {
    const map = mapRef.current
    const popup = popupRef.current
    if (!map || !popup) return
    popupKindRef.current = kind
    popup.setOffset(kind === 'place' ? PIN_OFFSET : 10).setLngLat([at.lng, at.lat]).setHTML(html)
    if (!popup.isOpen()) popup.addTo(map)
  }, [])

  const fitTo = useCallback((points: readonly LatLng[], padding: number, maxZoom = 18) => {
    const gl = glRef.current
    const map = mapRef.current
    if (!gl || !map || !points.length) return
    const bounds = new gl.LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat])
    for (const p of points) bounds.extend([p.lng, p.lat])
    map.fitBounds(bounds, { padding, maxZoom, duration: 600 })
  }, [])

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
      // Scroll-zoom only after the user engages, so the page can still scroll past the map
      m.scrollZoom.disable()
      const engage = () => m.scrollZoom.enable()
      m.once('click', engage)
      m.getCanvas().addEventListener('focus', engage, { once: true })

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

      const popup = new gl.Popup({ maxWidth: '260px', focusAfterOpen: false })
      popup.on('close', () => {
        if (popupKindRef.current === 'place') {
          setSelectedId(undefined)
          setSelectedRoom(undefined)
        }
      })
      popupRef.current = popup

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
          setSelectedId(place.id)
          setSelectedRoom(undefined)
          // Open here too, so Routes (which doesn't fly to selections) gets the popup and its "Route here"
          openPopup(place, popupHtml(place, statusRef.current(place.id)), 'place')
        })
      }
      for (const id of ['links', 'links-shortcut']) {
        m.on('click', id, (e) => {
          const c = CONNECTIONS.find((x) => x.id === e.features?.[0]?.properties?.id)
          if (c) openPopup(e.lngLat, connectionHtml(c.name, c.note), 'other')
        })
      }
      m.on('click', 'shuttle-stops', (e) => {
        const stop = SHUTTLE_STOPS.get(e.features?.[0]?.properties?.id)
        if (stop) openPopup(stop.at, shuttleStopHtml(stop.name, stop.routes), 'other')
      })
      for (const id of CLICKABLE) {
        m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'))
        m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''))
      }
      // Follows the pitch as it changes (right-drag, two-finger drag, the compass), not just when it settles
      m.on('pitch', () => setTilted(m.getPitch() > 10))

      // "Route here" in a place popup switches to Routes with that destination, and a floor button
      // shows that floor's rooms. Delegated from the container because popup HTML is replaced each
      // time it opens.
      containerRef.current.addEventListener('click', (e) => {
        const floorButton = (e.target as Element).closest<HTMLElement>('[data-floor]')
        const floorPlace = findPlace(floorButton?.dataset.place ?? '')
        if (floorButton && floorPlace) {
          const floor = Number(floorButton.dataset.floor)
          popupRef.current?.setHTML(popupHtml(floorPlace, statusRef.current(floorPlace.id), { floor }))
          // The buttons were just replaced; keep keyboard focus on the chosen floor
          popupRef.current?.getElement()?.querySelector<HTMLElement>(`[data-floor="${floor}"]`)?.focus()
          return
        }
        const button = (e.target as Element).closest<HTMLElement>('[data-route-to]')
        if (!button) return
        setRouteTo(button.dataset.routeTo!)
        setMode('route')
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
    if (mode === 'tour' && popupKindRef.current === 'place') popupRef.current?.remove()
  }, [mode, showShuttles, tilted, styleVersion])

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
    for (const key of ['tour', 'from', 'to', 'stairs', 'indoor', 'line', 'room']) url.searchParams.delete(key)
    if (selectedId) url.searchParams.set('place', selectedId)
    else url.searchParams.delete('place')
    if (selectedId && selectedRoom) url.searchParams.set('room', selectedRoom)
    window.history.replaceState(null, '', url)

    const place = selectedId ? findPlace(selectedId) : undefined
    if (!place) {
      if (popupKindRef.current === 'place') popupRef.current?.remove()
      return
    }
    const center: [number, number] = [place.lng, place.lat]
    const zoom = Math.max(map.getZoom(), 17)
    // Jump straight to a linked place on load; animate later picks
    // Pin sits below center so its popup has room above it
    const offset: [number, number] = [0, Math.min(120, map.getContainer().clientHeight / 5)]
    if (firstSelectRef.current) map.easeTo({ center, zoom, offset, duration: 0 })
    else map.flyTo({ center, zoom, offset, duration: 600 })
    firstSelectRef.current = false
    openPopup(place, popupHtml(place, statusRef.current(place.id), { room: selectedRoom }), 'place')
  }, [selectedId, selectedRoom, ready, mode, openPopup])

  // Tour mode: numbered stops joined by a dashed line, in place of the regular pins
  useEffect(() => {
    const gl = glRef.current
    const map = mapRef.current
    for (const m of tourMarkersRef.current) m.remove()
    tourMarkersRef.current = []
    if (!gl || !map || !ready || mode !== 'tour') return
    popupRef.current?.remove()
    const stops = TOUR_STOPS.flatMap((s) => findPlace(s.placeId) ?? [])
    setSource('tour-line', collection([lineFeature(pairs(stops))]))
    tourMarkersRef.current = stops.map((p, i) => {
      const el = markerElement(`<span class="cseg-tour-pin">${i + 1}</span>`, 32, 'button')
      el.setAttribute('aria-label', `Stop ${i + 1}: ${TOUR_STOPS[i].title}`)
      el.addEventListener('click', () => setTourStep(i))
      return new gl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(new gl.Popup({ offset: 18, maxWidth: '240px', focusAfterOpen: false }).setHTML(tourStopHtml(i, p)))
        .addTo(map)
    })
    fitTo(stops, 40)
  }, [mode, ready, setSource, fitTo])

  // Tour step: highlight it, center on it, and keep it in the URL (?tour=3)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || mode !== 'tour') return
    tourMarkersRef.current.forEach((m, i) => {
      m.getElement().querySelector('.cseg-tour-pin')?.classList.toggle('is-active', i === tourStep)
      if (i !== tourStep && m.getPopup()?.isOpen()) m.togglePopup()
    })
    const marker = tourMarkersRef.current[tourStep]
    if (marker) {
      map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 17), duration: 500 })
      if (!marker.getPopup()?.isOpen()) marker.togglePopup()
    }
    const url = new URL(window.location.href)
    for (const key of ['place', 'room', 'from', 'to', 'stairs', 'indoor', 'line']) url.searchParams.delete(key)
    url.searchParams.set('tour', String(tourStep + 1))
    window.history.replaceState(null, '', url)
  }, [tourStep, mode, ready])

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
    for (const key of ['place', 'room', 'tour', 'from', 'to', 'stairs', 'indoor', 'line']) url.searchParams.delete(key)
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

  const goToStep = (i: number) => setTourStep(Math.min(Math.max(i, 0), TOUR_STOPS.length - 1))

  const pickFrom = (id: string) => {
    setRouteFrom(id)
    // Starting somewhere that line doesn't stop ends "Coming by MARTA"
    if (line && !linesAt(id).includes(line)) setLine(undefined)
    if (id === HERE && !position && geo !== 'locating') locate()
  }

  const showConnection = (id: string) => {
    const c = CONNECTIONS.find((x) => x.id === id)
    if (!c) return
    const path = c.path.map(([lat, lng]) => ({ lat, lng }))
    fitTo(path, 80)
    openPopup(path[Math.floor(path.length / 2)], connectionHtml(c.name, c.note), 'other')
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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

  return (
    <div className="flex flex-col gap-4">
      {/* Mode switch + tools */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-line bg-fill p-1" role="tablist" aria-label="Map mode">
          {(
            [
              ['explore', 'Explore', MapIcon],
              ['route', 'Routes', RouteIcon],
              ['tour', 'First-week tour', Footprints],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-[0.85rem] font-semibold text-ink-soft transition-colors hover:text-ink aria-selected:bg-surface aria-selected:text-brand aria-selected:shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
            >
              <Icon size={15} aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={locate}
            aria-pressed={!!position}
            className={cn(chipClass, 'aria-pressed:border-brand aria-pressed:bg-brand-tint aria-pressed:text-ink')}
          >
            <LocateFixed size={15} className={geo === 'locating' ? 'animate-pulse' : ''} aria-hidden />
            Near me
          </button>
          {mode !== 'tour' ? (
            <button
              type="button"
              onClick={() => setShowShuttles((v) => !v)}
              aria-pressed={showShuttles}
              className={cn(chipClass, 'aria-pressed:border-brand aria-pressed:bg-brand-tint aria-pressed:text-ink')}
            >
              <Bus size={15} aria-hidden />
              Panther Express
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggleTilt}
            aria-pressed={tilted}
            className={cn(chipClass, 'aria-pressed:border-brand aria-pressed:bg-brand-tint aria-pressed:text-ink')}
          >
            <Box size={15} aria-hidden />
            3D view
          </button>
          {mode === 'explore' ? (
            <button
              type="button"
              onClick={() => setOpenNow((v) => !v)}
              aria-pressed={openNow}
              className={cn(chipClass, 'aria-pressed:border-[#15803d] aria-pressed:bg-[color-mix(in_srgb,#15803d_12%,var(--bg))] aria-pressed:text-ink')}
            >
              <Clock size={15} aria-hidden />
              Open now
            </button>
          ) : null}
        </div>
      </div>
      {geoMessage[geo] ? (
        <p className="-mt-2 text-[0.8rem] text-muted" role="status">
          {geoMessage[geo]}
        </p>
      ) : null}

      {mode === 'explore' ? (
        <div className="flex flex-col gap-3">
          <label className="relative block">
            <span className="sr-only">Search places</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-faint" size={18} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search buildings, rooms, food, parking, MARTA…"
              className="h-12 w-full rounded-xl border border-line bg-surface pr-10 pl-10 text-[0.95rem] text-ink outline-none placeholder:text-ink-faint focus:border-brand focus-visible:outline-2 focus-visible:outline-brand/40 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-ink-faint hover:text-ink"
                aria-label="Clear search"
              >
                <X size={16} aria-hidden />
              </button>
            ) : null}
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            <button
              type="button"
              aria-pressed={categories.size === 0}
              onClick={() => setCategories(new Set())}
              className={cn(chipClass, 'aria-pressed:border-brand-solid aria-pressed:bg-brand-solid aria-pressed:text-white')}
            >
              All
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
        </div>
      ) : null}

      <div className="grid gap-4 lg:h-[min(44rem,calc(100dvh-var(--header-height)-3rem))] lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Map: `isolate` keeps the map's controls and popups below the fixed header and menus */}
        <div className="cseg-map relative isolate h-[60svh] min-h-80 overflow-hidden rounded-2xl border border-line bg-fill lg:order-last lg:h-full">
          <div ref={containerRef} className="size-full" aria-label="Campus map" role="region" />
          {!ready ? (
            <p className="absolute inset-0 grid place-items-center text-[0.9rem] text-muted">Loading map…</p>
          ) : null}
        </div>

        {/* Side panel: tour steps, or the place list (the accessible way to browse) */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
          {mode === 'tour' ? (
            <TourPanel step={tourStep} onStep={goToStep} position={position} />
          ) : mode === 'route' ? (
            <RoutePanel
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
              onShowConnection={showConnection}
              route={route}
              loading={!router}
              locationProblem={locationProblem}
            />
          ) : (
            <>
              <p className="border-b border-line px-4 py-2.5 text-[0.8rem] font-semibold text-muted" aria-live="polite">
                {visible.length} {visible.length === 1 ? 'place' : 'places'}
                {roomCount ? ` · ${roomCount} ${roomCount === 1 ? 'room' : 'rooms'}` : ''}
                {openNow ? ' open now' : ''}
                {position ? ' · nearest first' : ''}
              </p>
              {visible.length ? (
                <ul className="flex-1 divide-y divide-line overflow-y-auto max-lg:max-h-112">
                  {visible.map((p) => {
                    const status = statusFor(p.id)
                    // Rooms under the building: the ones a search matches ("trio", "scw 462"), or every
                    // room once the building is picked
                    const hits = findRooms(p.floors, p.name, terms)
                    const rooms = hits.length ? hits : p.id === selectedId ? allRooms(p.floors) : []
                    const select = (room?: string) => {
                      setSelectedId(p.id)
                      setSelectedRoom(room)
                      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                    }
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => select()}
                          aria-current={p.id === selectedId && !selectedRoom ? 'location' : undefined}
                          className={cn(
                            'flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-wash',
                            'focus-visible:bg-brand-wash focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                            'aria-[current=location]:bg-brand-tint'
                          )}
                        >
                          <span
                            className="mt-1.5 size-2.5 shrink-0 rounded-full"
                            style={{ background: PLACE_CATEGORIES[p.category].color }}
                            aria-hidden
                          />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-[0.92rem] leading-snug font-bold text-ink">{p.name}</span>
                            <span className="text-[0.78rem] text-muted">
                              {position ? `${distanceLabel(distanceMeters(position, p))} · ` : ''}
                              {categoryLabel(p)}
                              {p.address ? ` · ${p.address}` : ''}
                            </span>
                            {status ? (
                              <span
                                className={cn(
                                  'text-[0.75rem] font-bold',
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
                                  onClick={() => select(room.room)}
                                  aria-current={p.id === selectedId && room.room === selectedRoom ? 'location' : undefined}
                                  className={cn(
                                    'flex w-full cursor-pointer items-baseline gap-2.5 py-1.5 pr-4 pl-9.5 text-left text-[0.8rem] transition-colors hover:bg-brand-wash',
                                    'focus-visible:bg-brand-wash focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                                    'aria-[current=location]:bg-brand-tint aria-[current=location]:font-semibold'
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
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                  <MapPin className="text-ink-faint" size={22} aria-hidden />
                  <p className="text-[0.9rem] text-muted">
                    {openNow
                      ? 'Nothing with confirmed hours is open right now. Turn off “Open now” to see everything.'
                      : 'No places match. Try another search or category.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {mode === 'explore' && openNow ? (
        <p className="text-[0.8rem] text-muted">
          “Open now” only includes places with hours confirmed by an official source (mostly campus dining). Hours are
          Atlanta time.
        </p>
      ) : null}
    </div>
  )
}
