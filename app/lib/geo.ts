export type LatLng = { readonly lat: number; readonly lng: number }

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Downtown streets aren't straight lines; pad the crow-flies distance for a walking estimate. */
const STREET_FACTOR = 1.3
/** ~4.8 km/h */
const WALK_METERS_PER_MINUTE = 80

export const walkMinutes = (meters: number) => Math.max(1, Math.round((meters * STREET_FACTOR) / WALK_METERS_PER_MINUTE))

/** "4 min walk", or "3.2 km away" when it's farther than a reasonable walk. */
export function distanceLabel(meters: number): string {
  if (meters > 2500) return `${(meters / 1000).toFixed(1)} km away`
  return `${walkMinutes(meters)} min walk`
}
