/**
 * The campus map's skybridges, indoor links, and shortcuts. Edited in the dashboard (the
 * map_connections table); the list in ./data/connections is what the map uses until it has any.
 */
import type { Connection } from './wayfinding'
import type { ConnectionKind, Database, MapConnectionRow } from './supabase/types'

export const CONNECTION_KINDS: readonly { value: ConnectionKind; label: string; description: string }[] = [
  { value: 'skybridge', label: 'Skybridge', description: 'A bridge between buildings, or over a street' },
  { value: 'indoor', label: 'Indoor link', description: 'A way through one building into the next' },
  { value: 'shortcut', label: 'Shortcut', description: 'An outdoor path that beats the sidewalk' },
]

export const connectionKindLabel = (kind: ConnectionKind) => CONNECTION_KINDS.find((k) => k.value === kind)?.label ?? kind

export const connectionFromRow = (row: MapConnectionRow): Connection => ({
  id: row.slug,
  name: row.name,
  kind: row.kind,
  note: row.note,
  path: row.path.map(([lat, lng]) => [lat, lng] as const),
  ...(row.in_osm ? { inOsm: true } : {}),
  ...(row.half_width != null ? { halfWidth: row.half_width } : {}),
  ...(row.favor != null ? { favor: row.favor } : {}),
  ...(row.ends.length === 2 ? { ends: [row.ends[0], row.ends[1]] as const } : {}),
  ...(row.stairs ? { stairs: true } : {}),
  ...(row.penalty != null ? { penalty: row.penalty } : {}),
})

export const connectionToRow = (c: Connection, sort: number): Database['public']['Tables']['map_connections']['Insert'] => ({
  slug: c.id,
  name: c.name,
  kind: c.kind,
  note: c.note,
  path: c.path.map(([lat, lng]) => [lat, lng]),
  in_osm: !!c.inOsm,
  half_width: c.halfWidth ?? null,
  favor: c.favor ?? null,
  ends: c.ends ? [...c.ends] : [],
  stairs: !!c.stairs,
  penalty: c.penalty ?? null,
  sort,
  published: true,
})

/** A path as it's typed: one "lat, lng" a line */
export const pathText = (path: readonly (readonly [number, number])[]) => path.map(([lat, lng]) => `${lat}, ${lng}`).join('\n')
