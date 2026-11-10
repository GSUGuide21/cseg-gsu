'use client'

import 'maplibre-gl/dist/maplibre-gl.css'

import type * as Gl from 'maplibre-gl'
import { useEffect, useRef, useState, type FC } from 'react'

import { Box } from 'lucide-react'

import { addBuildings, BUILDINGS_3D_MINZOOM, collection, FONT, point, setBuildings3d, STYLE_URL, tuneBaseStyle } from '@/globals/CampusMap/gl'
import { cn } from '@/lib/cn'
import { CAMPUS_BOUNDS } from '@/lib/dashboard/validate'
import { CAMPUS_CENTER } from '@/lib/data/places'

export type LatLng = { lat: number; lng: number }

export type MapPin = LatLng & {
  id: string
  /** Its name, shown on hover and read out */
  label: string
  /** The pin's color (a place category's); the brand blue when left out */
  color?: string
  /** Shown fainter: context, like the other pins around the one being placed */
  muted?: boolean
}

const hasWebGL = () => {
  // No WebGL at all (tests' jsdom among them): don't ask a canvas for it
  if (typeof WebGLRenderingContext === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** A spot to six places (about 10 cm), as the coordinate fields hold it */
const rounded = ({ lat, lng }: LatLng): LatLng => ({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) })

const theme = () =>(document.documentElement.classList.contains('dark') ? 'dark' : 'light')

/** How far the 3D view tilts (the campus map's own) */
const TILT_DEGREES = 55

/** The pins' names, as the source the name layer draws */
const NAMES = 'pin-names'
const nameData = (pins: MapPin[]) => collection(pins.map((p) => point(p, { name: p.label, muted: !!p.muted })))

/**
 * Each pin's name under its point, as the campus map shows them. Where names would collide
 * the map drops some (faint pins' first), so a full map stays readable and zooming in shows more.
 */
const nameLayer = (dark: boolean): Gl.AddLayerObject => ({
  id: NAMES,
  type: 'symbol',
  source: NAMES,
  layout: {
    'text-field': ['get', 'name'],
    'text-font': FONT,
    'text-size': ['interpolate', ['linear'], ['zoom'], 15, 10, 19, 13],
    'text-anchor': 'top',
    'text-offset': [0, 0.35],
    'text-max-width': 9,
    'text-padding': 4,
    'symbol-sort-key': ['case', ['get', 'muted'], 1, 0],
  },
  paint: {
    'text-color': dark ? '#e5e7eb' : '#1f2937',
    'text-halo-color': dark ? '#111827' : '#ffffff',
    'text-halo-width': 1.6,
    'text-opacity': ['case', ['get', 'muted'], 0.6, 1],
  },
})

/**
 * A pin as a DOM marker: a round head on a point, in its color. MapLibre positions the
 * outer element itself (and sets its opacity), so the look goes on the inner one.
 */
const pinElement = (pin: MapPin, draggable: boolean) => {
  const el = document.createElement('div')
  el.dataset.pinId = pin.id
  el.className = draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
  el.innerHTML = `<svg viewBox="0 0 24 32" width="24" height="32" aria-hidden="true" style="display:block${pin.muted ? ';opacity:0.45' : ''}"><path d="M12 31s10-11.2 10-19A10 10 0 0 0 2 12c0 7.8 10 19 10 19z" fill="${pin.color ?? '#0039a6'}" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="white"/></svg>`
  return el
}

/** Its name, for hover and screen readers (after MapLibre's own "Map marker" label goes on) */
const labelPin = (el: HTMLElement, pin: MapPin, draggable: boolean) => {
  el.setAttribute('role', 'img')
  el.setAttribute('aria-label', pin.label)
  el.title = draggable ? `${pin.label} (drag to move)` : pin.label
}

/**
 * A small map of campus for the dashboard, built on the site's MapLibre setup: pins you
 * can drag (onMove), click (onPick), and a click on the map itself (onMapClick) to place
 * one. Kept inside the area pins are allowed in. Without WebGL (some old machines, tests)
 * it says so, and the coordinate fields beside it still work.
 */
export const PinMap: FC<{
  pins: MapPin[]
  /** Pins that can be dragged; the rest are context */
  draggable?: (pin: MapPin) => boolean
  onMove?: (id: string, at: LatLng) => void
  onPick?: (id: string) => void
  onMapClick?: (at: LatLng) => void
  /** Flies here when it changes: the pin being edited, say */
  focus?: LatLng | null
  className?: string
  /** What the map is for, read out to screen readers */
  label: string
}> = ({ pins, draggable = () => false, onMove, onPick, onMapClick, focus, className, label }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Gl.Map | null>(null)
  const glRef = useRef<typeof Gl | null>(null)
  const markersRef = useRef(new Map<string, { marker: Gl.Marker; key: string }>())
  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  // Tilted, with the buildings standing up
  const [tilted, setTilted] = useState(false)

  // The latest handlers, for markers and map events set up once
  const handlers = useRef({ draggable, onMove, onPick, onMapClick })
  handlers.current = { draggable, onMove, onPick, onMapClick }

  // The map, once, in the browser only
  useEffect(() => {
    if (!hasWebGL()) {
      setUnavailable(true)
      return
    }
    let cancelled = false
    let map: Gl.Map | undefined
    import('maplibre-gl')
      .then((gl) => {
        if (cancelled || !containerRef.current) return
        glRef.current = gl
        // The worker can't be found relative to the bundled script; postinstall copies it here
        gl.setWorkerUrl(`/vendor/maplibre-gl-worker-${gl.getVersion()}.mjs`)
        map = new gl.Map({
          container: containerRef.current,
          style: STYLE_URL[theme()],
          center: [focus?.lng ?? CAMPUS_CENTER.lng, focus?.lat ?? CAMPUS_CENTER.lat],
          zoom: focus ? 17 : CAMPUS_CENTER.zoom,
          minZoom: 13,
          maxZoom: 19.5,
          maxPitch: 60,
          maxBounds: [
            [CAMPUS_BOUNDS.lng[0], CAMPUS_BOUNDS.lat[0]],
            [CAMPUS_BOUNDS.lng[1], CAMPUS_BOUNDS.lat[1]],
          ],
          attributionControl: { compact: true },
        })
        const m = map
        m.addControl(new gl.NavigationControl({ visualizePitch: true }), 'top-right')
        // The campus map's look: base labels without icons, 3D buildings (shown when tilted), and the pins' names
        m.on('style.load', () => {
          const t = theme()
          tuneBaseStyle(m, t)
          addBuildings(m, t)
          if (!m.getSource(NAMES)) m.addSource(NAMES, { type: 'geojson', data: collection([]) })
          if (!m.getLayer(NAMES)) m.addLayer(nameLayer(t === 'dark'))
        })
        // Follows the pitch however it changes (right-drag, two fingers, the compass)
        m.on('pitch', () => setTilted(m.getPitch() > 10))
        m.on('click', (e) => handlers.current.onMapClick?.(rounded(e.lngLat)))
        map.on('load', () => !cancelled && setReady(true))
        mapRef.current = map
      })
      .catch(() => !cancelled && setUnavailable(true))
    const markers = markersRef.current
    return () => {
      cancelled = true
      markers.clear()
      map?.remove()
      mapRef.current = null
    }
    // Made once; focus changes fly the map instead (below)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The pins: added, moved, and removed to match
  useEffect(() => {
    const map = mapRef.current
    const gl = glRef.current
    if (!ready || !map || !gl) return
    const current = markersRef.current
    const seen = new Set<string>()
    for (const pin of pins) {
      seen.add(pin.id)
      const canDrag = handlers.current.draggable(pin)
      // A pin whose look or draggability changed is made again
      const key = `${pin.label}|${pin.color}|${pin.muted}|${canDrag}`
      const existing = current.get(pin.id)
      if (existing && existing.key === key) {
        existing.marker.setLngLat([pin.lng, pin.lat])
        continue
      }
      existing?.marker.remove()
      const el = pinElement(pin, canDrag)
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        handlers.current.onPick?.(pin.id)
      })
      const marker = new gl.Marker({ element: el, draggable: canDrag, anchor: 'bottom' }).setLngLat([pin.lng, pin.lat]).addTo(map)
      labelPin(el, pin, canDrag)
      marker.on('dragend', () => handlers.current.onMove?.(pin.id, rounded(marker.getLngLat())))
      current.set(pin.id, { marker, key })
    }
    for (const [id, { marker }] of current) {
      if (seen.has(id)) continue
      marker.remove()
      current.delete(id)
    }
    ;(map.getSource(NAMES) as Gl.GeoJSONSource | undefined)?.setData(nameData(pins))
  }, [pins, ready])

  // Buildings stand up while the map is tilted, and lie flat again when it isn't
  useEffect(() => {
    const map = mapRef.current
    if (ready && map) setBuildings3d(map, tilted)
  }, [tilted, ready])

  // 3D view: tilt so building heights show, close enough in that the buildings are drawn
  const toggleTilt = () => {
    const map = mapRef.current
    if (!map) return
    const next = !tilted
    setTilted(next)
    map.easeTo(next ? { pitch: TILT_DEGREES, zoom: Math.max(map.getZoom(), BUILDINGS_3D_MINZOOM + 1), duration: 600 } : { pitch: 0, duration: 600 })
  }

  // Fly to what's being edited
  useEffect(() => {
    if (!ready || !focus) return
    mapRef.current?.easeTo({ center: [focus.lng, focus.lat], zoom: Math.max(mapRef.current.getZoom(), 17), duration: 400 })
  }, [focus?.lat, focus?.lng, ready]) // eslint-disable-line react-hooks/exhaustive-deps

  if (unavailable)
    return (
      <div className={cn('grid place-items-center rounded-lg border border-dashed border-line bg-fill p-4 text-center text-[0.85rem] text-muted', className)}>
        The map can’t show on this computer. Use the coordinates instead.
      </div>
    )
  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-line', className)}>
      <div ref={containerRef} role="region" aria-label={label} data-pin-map="" className="h-full w-full" />
      {ready ? (
        <button
          type="button"
          onClick={toggleTilt}
          aria-pressed={tilted}
          className="absolute top-2.5 left-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-[0.8rem] font-semibold text-ink-soft shadow-sm hover:text-ink aria-pressed:border-brand aria-pressed:bg-brand-tint aria-pressed:text-ink"
        >
          <Box size={14} aria-hidden />
          3D view
        </button>
      ) : null}
    </div>
  )
}

/**
 * Picking one spot: the pin drags, and a click on the map moves it there. With no spot yet,
 * a click places it.
 */
export const PinPicker: FC<{
  value: LatLng | null
  onChange: (at: LatLng) => void
  /** Other pins nearby, faint, for bearings */
  context?: MapPin[]
  className?: string
}> = ({ value, onChange, context = [], className }) => (
  <div className="flex flex-col gap-1.5">
    <PinMap
      label="Where the pin goes: drag it, or click the map"
      className={cn('h-64', className)}
      pins={[...context.map((p) => ({ ...p, muted: true })), ...(value ? [{ id: '__picked', label: 'This pin', ...value }] : [])]}
      draggable={(p) => p.id === '__picked'}
      onMove={(_, at) => onChange(at)}
      onMapClick={onChange}
      focus={value}
    />
    <p className="m-0 text-[0.8rem] text-muted">{value ? 'Drag the pin, or click the map to move it there.' : 'Click the map to place the pin.'}</p>
  </div>
)
