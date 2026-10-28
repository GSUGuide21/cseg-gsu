/**
 * MARTA rail near the Atlanta campus, for "Coming by MARTA" in the route finder: pick a
 * line and it finds the stop with the shortest walk to your destination.
 * Lines, stations, and colors from OpenStreetMap's MARTA route relations (October 2026).
 */
import type { Schedule } from '../hours'
export type MartaLine = 'blue' | 'green' | 'red' | 'gold'

export const MARTA_LINES: Record<MartaLine, { name: string; color: string }> = {
  blue: { name: 'Blue Line', color: '#0274BA' },
  green: { name: 'Green Line', color: '#009544' },
  red: { name: 'Red Line', color: '#CC0000' },
  gold: { name: 'Gold Line', color: '#F67705' },
}

/** Rail stations within walking distance of campus (place ids in ./places) and the lines that stop there */
export const MARTA_STATIONS: readonly { placeId: string; lines: readonly MartaLine[] }[] = [
  { placeId: 'marta-georgia-state', lines: ['blue', 'green'] },
  { placeId: 'marta-five-points', lines: ['blue', 'green', 'red', 'gold'] },
  { placeId: 'marta-peachtree-center', lines: ['red', 'gold'] },
]

export const isMartaLine = (s?: string): s is MartaLine => !!s && s in MARTA_LINES

export const stationsOn = (line: MartaLine) => MARTA_STATIONS.filter((s) => s.lines.includes(line))

export const linesAt = (placeId: string) => MARTA_STATIONS.find((s) => s.placeId === placeId)?.lines ?? []

/**
 * Panther Express, GSU's free weekday shuttle (2026 fall schedule,
 * parking.gsu.edu/transportation/panther-express). Stops are in riding order; each loop
 * returns to its first stop. Locations and route lines come from GSU's Passio GO live map
 * via scripts/fetch-panther-express.ts.
 */
export type ShuttleRouteId = 'red' | 'green' | 'purple'

export type ShuttleStop = {
  /** Passio stop id, for its location in ./panther-express.json; omitted when it isn't on the live map */
  readonly passioId?: string
  readonly name: string
}

export type ShuttleRoute = {
  readonly id: ShuttleRouteId
  readonly name: string
  readonly color: string
  readonly stops: readonly ShuttleStop[]
  /** Weekly hours, Atlanta time */
  readonly schedule: Schedule
  readonly hours: string
}

const MON_THU = [1, 2, 3, 4]
const FRI = [5]

export const PANTHER_EXPRESS: readonly ShuttleRoute[] = [
  {
    id: 'red',
    name: 'Red Route',
    color: '#d62728',
    stops: [
      { passioId: '179194', name: 'Convocation Center Deck' },
      // On GSU's schedule but not the live map yet
      { name: 'Blue Lot' },
      { passioId: '15389', name: 'Langdale Hall' },
      { passioId: '15390', name: 'Courtland Street, across from Student Center West' },
    ],
    schedule: [
      { days: MON_THU, open: '07:00', close: '24:00' },
      { days: FRI, open: '07:00', close: '22:00' },
    ],
    hours: 'Mon–Thu 7 a.m.–midnight · Fri 7 a.m.–10 p.m.',
  },
  {
    id: 'green',
    name: 'Green Route',
    color: '#2ca02c',
    stops: [
      { passioId: '15397', name: 'Student Center East' },
      { passioId: '154947', name: '75 Piedmont' },
      { passioId: '154948', name: 'Piedmont North' },
    ],
    schedule: [
      { days: MON_THU, open: '07:00', close: '24:00' },
      { days: FRI, open: '07:00', close: '22:00' },
    ],
    hours: 'Mon–Thu 7 a.m.–midnight · Fri 7 a.m.–10 p.m.',
  },
  {
    id: 'purple',
    name: 'Purple Route',
    color: '#9467bd',
    stops: [
      { passioId: '15393', name: 'Rialto Center / Aderhold' },
      { passioId: '223005', name: 'Azalea Fresh Market' },
      { passioId: '15397', name: 'Student Center East' },
      { passioId: '154947', name: '75 Piedmont' },
      { passioId: '154948', name: 'Piedmont North' },
    ],
    schedule: [
      { days: MON_THU, open: '07:00', close: '22:30' },
      { days: FRI, open: '07:00', close: '20:00' },
    ],
    hours: 'Mon–Thu 7 a.m.–10:30 p.m. · Fri 7 a.m.–8 p.m.',
  },
]

export const SHUTTLE_NOTES = [
  'No weekend service, and none on Labor Day or over Thanksgiving Break (Nov 23–27). Fall service ends Tuesday, Dec 15.',
  'Drivers wait up to 5 minutes at each stop.',
]

export const PASSIO_GO_URL = 'https://georgiastate.passiogo.com/'
