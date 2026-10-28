/**
 * Confirmed building entrances for the campus map's route finder, by place id.
 * These replace OpenStreetMap's entrances for that building. Buildings with neither
 * are routed to their nearest side, and the route says so.
 *
 * CSEG officers: when you check a building's doors, add them here as { lat, lng }
 * (right-click on openstreetmap.org and pick "Show address" to read the coordinates).
 * Mark doors you can only reach by steps with `stepFree: false` so "Avoid stairs"
 * skips them. No rebuild needed.
 */
import type { Entrance } from '../wayfinding'

export const ENTRANCES: Partial<Record<string, readonly Entrance[]>> = {
  'student-center-east': [
    // The two main entrances tagged in OSM, kept since this list replaces OSM's
    { lat: 33.752907, lng: -84.384882, note: 'Main entrance, north side' },
    { lat: 33.752566, lng: -84.384367, note: 'Main entrance, east corner' },
    // Middle of the west face, which opens onto the plaza
    { lat: 33.752809, lng: -84.385344, note: 'Unity Plaza side' },
  ],
  'student-center-west': [
    // Courtland Street is raised a level above Decatur Street here; middle of the face along it
    { lat: 33.752582, lng: -84.386127, note: '3rd floor, from the Courtland Street sidewalk' },
    // Middle of the face on the plaza
    { lat: 33.752612, lng: -84.3856, note: 'Unity Plaza side' },
  ],
  'library-north': [
    // Front entrance, added with the Greenway (2021): middle of the wall facing it in OSM
    { lat: 33.752984, lng: -84.38627, note: 'Front entrance, on the GSU Greenway', stepFree: true },
  ],
  // MARTA station entrances (railway=subway_entrance in OSM). Georgia State station's aren't
  // mapped; its exits are on Piedmont Avenue and Jesse Hill Jr. Drive, so routes use its pin.
  'marta-five-points': [
    { lat: 33.754236, lng: -84.392194 },
    { lat: 33.753595, lng: -84.391052 },
  ],
  'marta-peachtree-center': [
    // OSM marks these two without wheelchair access
    { lat: 33.75811, lng: -84.387416, stepFree: false },
    { lat: 33.757881, lng: -84.387815, note: 'Southwest entrance', stepFree: false },
    { lat: 33.76037, lng: -84.387847 },
  ],
  'classroom-south': [
    // End of the Classroom South bridge in OSM; the library lists Classroom South's 2nd floor as a way in
    { lat: 33.752637, lng: -84.387225, note: '2nd floor, from the Library Plaza bridge', stepFree: false },
  ],
}
