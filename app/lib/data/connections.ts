/**
 * Skybridges and shortcuts for the campus map's route finder.
 *
 * Bridges already in OpenStreetMap (`inOsm`) are drawn for reference and routes use them
 * on their own. Indoor links OSM doesn't have are added to the walking network here.
 * Sources: GSU Library (The Link), OSM, and a GSU student page on the Decatur Street bridge.
 *
 * CSEG officers: add the shortcuts you know. A `path` is a list of [lat, lng] points (right-click
 * on openstreetmap.org and pick "Show address" to read them). Indoor links between two
 * buildings set `ends` to both place ids so routes go in and out through their doors.
 * No rebuild needed.
 */
import type { Connection } from '../wayfinding'

export const CONNECTIONS: readonly Connection[] = [
  {
    id: 'the-link',
    name: 'The Link',
    kind: 'skybridge',
    note: 'Indoor bridges joining Library North and Library South on the 3rd and 4th floors, with study space along the way. Open when the library is.',
    // Spans the gap between the two buildings' facing walls
    path: [
      [33.75252, -84.38667],
      [33.75236, -84.38677],
    ],
    ends: ['library-north', 'library-south'],
    // Up to the 3rd floor and back down, by elevator or stairs
    penalty: 60,
  },
  {
    id: 'decatur-street-bridge',
    name: 'Decatur Street pedestrian bridge',
    kind: 'skybridge',
    note: 'Crosses over Decatur Street from Urban Life Plaza, by Student Center West, to the Sports Arena side, so you skip the traffic.',
    // Center line; OSM maps it as two walkways about 19 m apart
    path: [
      [33.752076, -84.385879],
      [33.751795, -84.386161],
    ],
    inOsm: true,
    halfWidth: 11,
  },
  {
    id: 'classroom-south-bridge',
    name: 'Classroom South bridge',
    kind: 'skybridge',
    note: 'From the Library Plaza level straight onto Classroom South’s 2nd floor, without going down to Decatur Street. A few steps on the way.',
    path: [
      [33.752784, -84.387073],
      [33.752697, -84.387162],
      [33.752685, -84.387175],
      [33.752637, -84.387225],
    ],
    inOsm: true,
    stairs: true,
  },
  {
    id: 'gsu-greenway',
    name: 'GSU Greenway',
    kind: 'shortcut',
    note: 'Car-free, lit walkway through the middle of campus, linking Peachtree Center Avenue by Langdale Hall to Collins and Courtland Streets by the Student Centers. Routes favor it over busier sidewalks.',
    path: [
      [33.753832, -84.38693],
      [33.753477, -84.386594],
      [33.753321, -84.386447],
      [33.753073, -84.386212],
      [33.752848, -84.385993],
    ],
    inOsm: true,
    // Car-free and lit, so worth a few extra steps over a street sidewalk
    favor: 0.85,
  },
]
