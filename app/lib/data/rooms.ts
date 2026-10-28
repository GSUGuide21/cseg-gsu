/**
 * Floor-by-floor room directories for map places, shown in their popups and searchable
 * on the map. From the Student Center's room listing
 * (engagement.gsu.edu/student-center/visitus, October 2026); storage rooms and rooms
 * listed as "TBA" are left out.
 */

export type Room = {
  /** Room or suite number as posted */
  readonly room: string
  readonly name: string
}

export type Floor = {
  readonly level: number
  /** One line about the floor, for floors the listing describes without rooms */
  readonly note?: string
  readonly rooms: readonly Room[]
}

export const STUDENT_CENTER_EAST_FLOORS: readonly Floor[] = [
  {
    level: 1,
    rooms: [
      { room: '100', name: 'Piedmont Avenue & Gilmer Street entrance' },
      { room: '101', name: 'Front entrance (Unity Plaza)' },
      { room: '102', name: 'Atrium Lounge' },
      { room: '104', name: 'Ballroom pre-function area' },
      { room: '110', name: 'State Ballroom' },
      { room: '110A', name: 'Court Salon' },
      { room: '110B', name: 'House Salon' },
      { room: '110C', name: 'Senate Salon' },
      { room: '113', name: 'Information Center' },
      { room: '116', name: 'Speaker’s Auditorium lobby' },
      { room: '120', name: 'Speaker’s Auditorium' },
      { room: '122', name: 'The Courtyard food court entrance' },
      { room: '124', name: 'The Courtyard seating area' },
      { room: '125', name: 'The Courtyard: Courtyard Kitchen, Panda Express, and Costa Coffee' },
    ],
  },
  {
    level: 2,
    rooms: [
      { room: '200', name: 'Meeting room' },
      { room: '201', name: 'Meeting room' },
      { room: '203', name: 'Meeting room' },
      { room: '204', name: 'Quiet study lounge' },
      { room: '205', name: 'TRIO Student Support Services' },
      { room: '206', name: 'Cultures, Communities & Inclusion' },
      { room: '207', name: 'Cultures, Communities & Inclusion' },
      { room: '210', name: 'The Intersection' },
      { room: '211', name: 'Cultures, Communities & Inclusion' },
      { room: '216', name: 'Meeting room' },
      { room: '217', name: 'Meeting room' },
      { room: '218', name: 'Meeting room' },
      { room: '219', name: 'Green Room' },
      { room: '220', name: 'Student Center Building Operations' },
      { room: '221', name: 'Student Center Media Services' },
      { room: '222', name: 'Collaborative study lounge' },
      { room: '223', name: 'Elevator lounge' },
    ],
  },
  {
    level: 3,
    rooms: [
      { room: '300', name: 'Dean of Students and Student Conduct' },
      { room: '301', name: 'Student Engagement Marketing & Media' },
      { room: '302', name: 'Access and Accommodations Center' },
      { room: '303', name: 'Student Engagement Administration & Support Services' },
      { room: '304', name: 'Access and Accommodations Center' },
      { room: '306', name: 'Gallery Lounge' },
      { room: '308', name: 'Student Center Digital Marketing & Administrative Support' },
      { room: '310', name: 'Student Center Administration' },
      { room: '315', name: 'Student Center Event Management' },
      { room: '316', name: 'Student Orientation & Family Engagement' },
      { room: '317', name: 'Meeting room' },
      { room: '318', name: 'PantherDining Catering' },
    ],
  },
]

export const STUDENT_CENTER_WEST_FLOORS: readonly Floor[] = [
  { level: 1, note: 'Classrooms and spaces for the School of Public Health.', rooms: [] },
  {
    level: 2,
    rooms: [
      { room: '250', name: 'Student Media Hub' },
      { room: '251', name: 'Student Media Office' },
      { room: '254', name: 'Student Media Studio' },
      { room: '256', name: 'Student Life Administration' },
      { room: '257', name: 'PantherDining Office' },
      { room: '258', name: 'Meeting room' },
      { room: '259', name: 'Meeting room' },
      { room: '260', name: 'Meeting room' },
      { room: '262', name: 'Cinefest Film Theater' },
      { room: '266', name: 'Meeting room' },
      { room: '267', name: 'Spotlight Programs Board' },
      { room: '269', name: 'Lactation room' },
      { room: '270', name: 'Student Government Association, Student Organizations & Student Life' },
      { room: '271', name: 'Album 88 radio station' },
    ],
  },
  {
    level: 3,
    rooms: [
      { room: '323', name: 'University Bookstore' },
      {
        room: '356',
        name: 'University Business Services: PantherCard, Parking & Transportation, Cashier’s Office, payroll, HR onboarding, and foreign national tax',
      },
      { room: '359', name: 'Reflection Space (meditation)' },
      { room: '364', name: 'Panther Place commuter lounge' },
      { room: '365', name: 'Information Center' },
    ],
  },
  {
    level: 4,
    rooms: [
      { room: '450', name: 'Fraternity & Sorority Life' },
      { room: '455', name: 'Dance studio' },
      { room: '460', name: 'Meeting room' },
      { room: '462', name: 'Meeting room' },
      { room: '463', name: 'Meeting room' },
      { room: '464', name: 'Meeting room' },
      { room: '465', name: 'Meeting room' },
      { room: '467', name: 'Meeting room' },
      { room: '472', name: 'Leadership & Service' },
      { room: '474', name: 'Leadership & Service seminar room' },
      { room: '475', name: 'Leadership & Service' },
      { room: '478', name: 'Leadership & Service' },
      { room: '481', name: 'Collegiate Recovery Community' },
      { room: '483', name: 'Student Wellness' },
      { room: '485', name: 'Open lounge' },
      { room: '489', name: 'Golden Key Board Room' },
    ],
  },
]

const ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

export const ordinal = (level: number) => ORDINALS[level] ?? `${level}th`

export const floorLabel = (level: number) => `${ordinal(level)} floor`

/** Which floor a room is on, by its number */
export const floorOf = (floors: readonly Floor[] | undefined, room: string | undefined) =>
  room ? (floors?.findIndex((f) => f.rooms.some((r) => r.room === room)) ?? -1) : -1

export type RoomHit = { readonly floor: number; readonly room: Room }

/**
 * The rooms a search is after: those whose number or name holds the most of the search
 * terms that aren't just the building's own name ("sce 205", "trio", "meeting room"), best
 * first. Ties go to the shorter name, so "ballroom" lists the State Ballroom before its
 * pre-function area.
 */
export function findRooms(floors: readonly Floor[] | undefined, placeName: string, terms: readonly string[]): RoomHit[] {
  if (!floors) return []
  const name = placeName.toLowerCase()
  const roomTerms = terms.filter((t) => !name.includes(t))
  if (!roomTerms.length) return []
  const scored = floors.flatMap((f, floor) =>
    f.rooms.map((room) => {
      const text = `${room.room} ${room.name}`.toLowerCase()
      return { floor, room, score: roomTerms.filter((t) => text.includes(t)).length }
    })
  )
  const top = Math.max(0, ...scored.map((s) => s.score))
  if (!top) return []
  return scored
    .filter((s) => s.score === top)
    .sort((a, b) => a.room.name.length - b.room.name.length)
    .map(({ floor, room }) => ({ floor, room }))
}

/** The room a search is most likely after (see findRooms) */
export const findRoom = (floors: readonly Floor[] | undefined, placeName: string, terms: readonly string[]) =>
  findRooms(floors, placeName, terms)[0]

/** Every room in a building, floor by floor */
export const allRooms = (floors: readonly Floor[] | undefined): RoomHit[] =>
  floors?.flatMap((f, floor) => f.rooms.map((room) => ({ floor, room }))) ?? []
