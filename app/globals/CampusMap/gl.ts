/**
 * MapLibre GL pieces for the campus map: base styles, pin images, and the overlay
 * sources and layers (places, skybridges, Panther Express, routes, tour). Overlays are
 * re-added after every style change (light ↔ dark), so they live here as plain specs.
 */
import type { Feature, FeatureCollection, GeoJsonProperties, LineString, Point } from 'geojson'
import type * as Gl from 'maplibre-gl'

import { PLACE_CATEGORIES, PLACES } from '@/lib/data/places'
import type { LatLng } from '@/lib/geo'

/**
 * OpenFreeMap vector styles (free, no key). "bright" has clear roads, parks, and building
 * outlines; "dark" is nearly black on black as published, so tuneBaseStyle() lifts it.
 */
export const STYLE_URL = {
  light: 'https://tiles.openfreemap.org/styles/bright',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const

/** Dark-mode base map colors, chosen to sit behind the pins but stay readable */
const DARK = {
  background: '#111827',
  building: '#1f2937',
  buildingOutline: '#374151',
  road: '#4b5563',
  label: '#d1d5db',
  halo: '#111827',
  wood: '#1c3326',
}

/** Every name our pins show, so the base map doesn't label the same place again */
const OUR_NAMES = PLACES.map((p) => p.name)

/**
 * Adjusts the base style after it loads: keeps its place names but drops their icons (our
 * pins cover campus, and two sets of icons is clutter) and, in dark mode, raises the
 * contrast of roads, buildings, and labels.
 */
export function tuneBaseStyle(map: Gl.Map, theme: Theme) {
  for (const layer of map.getStyle().layers) {
    const sourceLayer = 'source-layer' in layer ? layer['source-layer'] : undefined
    // Shield layers' filters always fail on OpenFreeMap tiles (MapLibre warns about each),
    // so they never draw; hiding them just quiets the console
    if (layer.id.includes('shield')) {
      map.setLayoutProperty(layer.id, 'visibility', 'none')
      continue
    }
    // Names of shops, buildings, and parks stay, minus their icons and any name one of our
    // pins already shows (the base map's copy sits a little off and would read as a second place)
    if (sourceLayer === 'poi' && layer.type === 'symbol') {
      map.setLayoutProperty(layer.id, 'icon-image', '')
      const notOurs: Gl.FilterSpecification = ['!', ['in', ['get', 'name'], ['literal', OUR_NAMES]]]
      map.setFilter(layer.id, layer.filter ? ['all', layer.filter as Gl.ExpressionSpecification, notOurs] : notOurs)
    }
    if (theme !== 'dark') continue
    // The dark style's woodland asks for a "wood-pattern" image its sprite doesn't have
    // (MapLibre warns on every redraw), so woods get a plain fill instead
    if (layer.type === 'fill' && layer.paint?.['fill-pattern']) {
      map.setPaintProperty(layer.id, 'fill-pattern', undefined)
      map.setPaintProperty(layer.id, 'fill-color', DARK.wood)
      continue
    }
    if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', DARK.background)
    else if (layer.type === 'fill' && sourceLayer === 'building') {
      map.setPaintProperty(layer.id, 'fill-color', DARK.building)
      map.setPaintProperty(layer.id, 'fill-outline-color', DARK.buildingOutline)
    } else if (layer.type === 'line' && sourceLayer === 'transportation') map.setPaintProperty(layer.id, 'line-color', DARK.road)
    else if (layer.type === 'symbol') {
      map.setPaintProperty(layer.id, 'text-color', DARK.label)
      map.setPaintProperty(layer.id, 'text-halo-color', DARK.halo)
    }
  }
}

/** Fonts the OpenFreeMap glyph server has */
const FONT = ['Noto Sans Bold']

/** Brand blue in each theme (matches --brand in globals.css) */
const BRAND = { light: '#0039a6', dark: '#6d9bff' }

export type Theme = keyof typeof STYLE_URL

/** GeoJSON source ids, in drawing order */
export const SOURCES = ['links', 'shuttle-lines', 'shuttle-stops', 'tour-line', 'route', 'places'] as const
export type SourceId = (typeof SOURCES)[number]

export const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

export const point = (p: LatLng, properties: GeoJsonProperties = {}): Feature<Point> => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
  properties,
})

/** A line from [lat, lng] pairs (how routes and paths are stored) */
export const line = (
  latLngs: readonly (readonly [number, number])[],
  properties: GeoJsonProperties = {}
): Feature<LineString> => ({
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: latLngs.map(([lat, lng]) => [lng, lat]) },
  properties,
})

export const collection = (features: Feature[]): FeatureCollection => ({ type: 'FeatureCollection', features })

/**
 * A teardrop pin as an image, so thousands of map frames can draw it without DOM markers.
 * Drawn at 2× for sharp edges; the tip sits at the bottom center.
 */
function pinImage(color: string): ImageData {
  const scale = 2
  const w = 30 * scale
  const h = 38 * scale
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  const cx = 15
  const cy = 14
  const r = 11
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetY = 1.5
  ctx.beginPath()
  // Circle that narrows to a point just above the bottom edge
  ctx.arc(cx, cy, r, Math.PI * 0.8, Math.PI * 0.2)
  ctx.lineTo(cx, 35)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 2.5
  ctx.strokeStyle = '#fff'
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  return ctx.getImageData(0, 0, w, h)
}

/** Category pins, added after every style load (images don't survive a style change) */
export function addPinImages(map: Gl.Map) {
  for (const [category, { color }] of Object.entries(PLACE_CATEGORIES)) {
    const id = `pin-${category}`
    if (!map.hasImage(id)) map.addImage(id, pinImage(color), { pixelRatio: 2 })
  }
}

const pinIcon: Gl.ExpressionSpecification = ['concat', 'pin-', ['get', 'category']]

/** Every overlay layer, bottom to top. `theme` only affects colors. */
export function overlayLayers(theme: Theme): Gl.AddLayerObject[] {
  const brand = BRAND[theme]
  return [
    // Skybridges (solid) and shortcuts (dotted): wide translucent bands
    {
      id: 'links',
      type: 'line',
      source: 'links',
      filter: ['!=', ['get', 'kind'], 'shortcut'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#7c3aed', 'line-opacity': 0.55, 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 4, 19, 12] },
    },
    {
      id: 'links-shortcut',
      type: 'line',
      source: 'links',
      filter: ['==', ['get', 'kind'], 'shortcut'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#15803d',
        'line-opacity': 0.6,
        'line-width': ['interpolate', ['linear'], ['zoom'], 15, 3, 19, 8],
        'line-dasharray': [0.5, 1.5],
      },
    },
    // Panther Express loops and stops
    {
      id: 'shuttle-lines',
      type: 'line',
      source: 'shuttle-lines',
      layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.75 },
    },
    {
      id: 'shuttle-stops',
      type: 'circle',
      source: 'shuttle-stops',
      layout: { visibility: 'none' },
      paint: { 'circle-radius': 6, 'circle-color': '#fff', 'circle-stroke-width': 4, 'circle-stroke-color': ['get', 'color'] },
    },
    // First-week tour: dashed line between the numbered stops (stops are HTML markers)
    {
      id: 'tour-line',
      type: 'line',
      source: 'tour-line',
      layout: { 'line-cap': 'round', visibility: 'none' },
      paint: { 'line-color': brand, 'line-width': 3, 'line-dasharray': [2, 2.5] },
    },
    // Places: count bubbles that split apart as you zoom in, then category pins
    {
      id: 'clusters',
      type: 'circle',
      source: 'places',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': brand,
        'circle-radius': ['step', ['get', 'point_count'], 17, 10, 20, 25, 23],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#fff',
      },
    },
    {
      id: 'cluster-count',
      type: 'symbol',
      source: 'places',
      filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': FONT, 'text-size': 13, 'text-allow-overlap': true },
      paint: { 'text-color': theme === 'dark' ? '#0b1220' : '#fff' },
    },
    {
      id: 'pins',
      type: 'symbol',
      source: 'places',
      filter: ['all', ['!', ['has', 'point_count']], ['!', ['to-boolean', ['get', 'selected']]]],
      layout: { 'icon-image': pinIcon, 'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true },
      // Faded when "Open now" knows the place is closed
      paint: { 'icon-opacity': ['case', ['to-boolean', ['get', 'closed']], 0.45, 1] },
    },
    {
      id: 'pin-selected',
      type: 'symbol',
      source: 'places',
      filter: ['all', ['!', ['has', 'point_count']], ['to-boolean', ['get', 'selected']]],
      layout: { 'icon-image': pinIcon, 'icon-anchor': 'bottom', 'icon-size': 1.3, 'icon-allow-overlap': true, 'icon-ignore-placement': true },
    },
    // Route, above the pins so none covers it: white casing under a brand line; the shuttle ride is dashed in its route's color
    {
      id: 'route-casing',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#fff', 'line-width': 9 },
    },
    {
      id: 'route-walk',
      type: 'line',
      source: 'route',
      filter: ['==', ['get', 'role'], 'walk'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': brand, 'line-width': 5 },
    },
    {
      id: 'route-ride',
      type: 'line',
      source: 'route',
      filter: ['==', ['get', 'role'], 'ride'],
      layout: { 'line-join': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-dasharray': [1.6, 1] },
    },
    {
      id: 'route-stops',
      type: 'circle',
      source: 'route',
      filter: ['==', ['get', 'role'], 'stop'],
      paint: { 'circle-radius': 7, 'circle-color': '#fff', 'circle-stroke-width': 5, 'circle-stroke-color': ['get', 'color'] },
    },
    // Place names under the pins, drawn above them so no pin hides a name; where names would
    // collide the map drops some, keeping the selected one
    {
      id: 'pin-labels',
      type: 'symbol',
      source: 'places',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 16, 11, 19, 13],
        'text-anchor': 'top',
        'text-offset': [0, 0.35],
        'text-max-width': 9,
        'text-padding': 4,
        'symbol-sort-key': ['case', ['to-boolean', ['get', 'selected']], 0, 1],
      },
      paint: {
        'text-color': theme === 'dark' ? '#e5e7eb' : '#1f2937',
        'text-halo-color': theme === 'dark' ? '#111827' : '#ffffff',
        'text-halo-width': 1.6,
      },
    },
  ]
}

/** Layers that respond to clicks (and get a pointer cursor) */
export const CLICKABLE = ['clusters', 'pins', 'pin-selected', 'links', 'links-shortcut', 'shuttle-stops'] as const

const BUILDINGS_3D = 'cseg-buildings-3d'

/** Zoom where the 3D buildings start; the 3D view zooms in at least this far */
export const BUILDINGS_3D_MINZOOM = 15

/**
 * 3D buildings from OSM heights, above every road and footprint but under the labels (the
 * light style has none of its own). The dark style draws some labels among its roads, so
 * those move up above the buildings first. Hidden until the map tilts; see setBuildings3d().
 */
export function addBuildings(map: Gl.Map, theme: Theme) {
  if (!map.getSource('openmaptiles') || map.getLayer(BUILDINGS_3D)) return
  const layers = map.getStyle().layers
  let lastShape = -1
  layers.forEach((l, i) => {
    if (l.type !== 'symbol') lastShape = i
  })
  const early = layers.slice(0, lastShape).filter((l) => l.type === 'symbol')
  const labelsFrom = layers[lastShape + 1]?.id
  for (const l of early) map.moveLayer(l.id, labelsFrom)
  map.addLayer(
    {
      id: BUILDINGS_3D,
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: BUILDINGS_3D_MINZOOM,
      // A building mapped in parts also has an outline marked hide_3d; extruding it would wrap the parts in one block
      filter: ['!', ['to-boolean', ['get', 'hide_3d']]],
      layout: { visibility: 'none' },
      paint: {
        'fill-extrusion-color': theme === 'dark' ? '#2a3140' : '#dfe3ea',
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 0],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.85,
      },
    },
    early[0]?.id ?? labelsFrom
  )
}

/**
 * Switches between 3D buildings (tilted) and flat footprints. The light style fakes depth
 * with a roof layer nudged up and left, which floats off the real extrusions, so it goes
 * while the buildings are 3D.
 */
export function setBuildings3d(map: Gl.Map, on: boolean) {
  for (const layer of map.getStyle().layers) {
    const fakeRoof =
      layer.type === 'fill' && 'source-layer' in layer && layer['source-layer'] === 'building' && !!layer.paint?.['fill-translate']
    if (layer.id === BUILDINGS_3D || fakeRoof) {
      map.setLayoutProperty(layer.id, 'visibility', (layer.id === BUILDINGS_3D) === on ? 'visible' : 'none')
    }
  }
}
