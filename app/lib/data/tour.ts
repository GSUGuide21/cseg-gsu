/**
 * CSEG's walking tours of campus, picked from the map's Tours tab. Stops reference place
 * ids in ./places and run in walking order; the map works out the paths and walk times.
 *
 * Facts come from GSU's Aug 2025 office relocation notice, PantherDining, GSU Safety, and
 * the place and shuttle data in this folder.
 * CSEG officers: edit the wording freely, but keep office locations in sync with GSU. To
 * add a tour, add it to TOURS; the first one is what the Tours tab opens on.
 */
export type TourStop = {
  readonly placeId: string
  /** Short task-style title, e.g. "Get your PantherCard" */
  readonly title: string
  /** Why a new student should go here */
  readonly why: string
  /** Optional practical tip */
  readonly tip?: string
}

export type Tour = {
  /** URL id: /map?tour=commuter */
  readonly id: string
  /** Full name, in the panel and on the map */
  readonly title: string
  /** A word or two for the tour switcher */
  readonly label: string
  readonly intro: string
  readonly stops: readonly TourStop[]
}

export const TOURS: readonly Tour[] = [
  {
    id: 'first-week',
    title: 'First week on campus',
    label: 'First week',
    intro:
      'A walking loop through the places you’ll need in your first week, from the Welcome Center to the MARTA station. Plan an hour or two with stops.',
    stops: [
      {
        placeId: 'centennial-hall',
        title: 'Start at the Welcome Center',
        why: 'Undergraduate Admissions and the Welcome Center are in Centennial Hall. Campus tours start here.',
      },
      {
        placeId: 'student-success-center',
        title: 'Sort out registration and financial aid',
        why: 'Enrollment and Registration Services and the Student Financial Management Center share the 2nd floor. International Student and Scholar Services and Supplemental Instruction are on the 1st.',
        tip: 'Bring your Panther ID number and any holds or aid questions in one trip.',
      },
      {
        placeId: 'gsu-police',
        title: 'Save the campus safety numbers',
        why: 'GSU Police headquarters is open 24/7. Campus police: 404-413-3333. Non-emergencies and free safety escorts: 404-413-2100.',
        tip: 'Put both numbers in your phone now, before you need them.',
      },
      {
        placeId: 'gsu-greenway',
        title: 'Walk the Greenway',
        why: 'The car-free walkway through the middle of campus, starting at Langdale Hall. It’s the easiest way to cut between classes.',
      },
      {
        placeId: 'library-north',
        title: 'Find your study spot',
        why: 'The University Library has study spaces, computers, printing, and research help. Saxbys inside is open until midnight Monday–Thursday.',
      },
      {
        placeId: 'student-center-west',
        title: 'Get your PantherCard and parking help',
        why: 'University Business Services in Suite 356 handles PantherCard support and parking and transportation. CSEG events like Vibez Talk have met here too.',
      },
      {
        placeId: 'student-center-east',
        title: 'Grab food and find your people',
        why: 'Student organizations, lounges, and the 1st-floor food hall: Courtyard Kitchen, Panda Express, and a Costa Coffee café.',
        tip: 'Pay with PantherCash, PantherMeals, or a card.',
      },
      {
        placeId: 'student-recreation-center',
        title: 'Check out the Rec Center',
        why: 'Gym, courts, and fitness classes for students.',
      },
      {
        placeId: 'marta-georgia-state',
        title: 'Finish at the MARTA station',
        why: 'Georgia State Station is on the East-West line (Blue and Green) and is the closest rail stop to the Student Centers.',
      },
    ],
  },
  {
    id: 'commuter',
    title: 'A commuter’s campus',
    label: 'Commuter',
    intro: 'Coming in by train or car? These are the places that make the day work when your room is somewhere else.',
    stops: [
      {
        placeId: 'marta-georgia-state',
        title: 'Get off at the right station',
        why: 'Georgia State Station is on the Blue and Green lines and is the closest rail stop to the Student Centers. On the Red or Gold line, get off at Peachtree Center or Five Points instead.',
        tip: 'Set your destination in Routes and pick your line under By MARTA to see which stop is the shortest walk.',
      },
      {
        placeId: 'm-deck',
        title: 'Know your parking deck',
        why: 'M Deck is the GSU deck near Student Center East. G Deck is the one near the library and Classroom South.',
      },
      {
        placeId: 'student-center-east',
        title: 'Base yourself between classes',
        why: 'Lounges and the 1st-floor food hall make this the easy place to wait out a gap. It’s also a Panther Express stop on the Green and Purple Routes.',
        tip: 'Panther Express doesn’t run on weekends, so check the Routes tab before you rely on it.',
      },
      {
        placeId: 'student-center-west',
        title: 'Sort out parking and your PantherCard',
        why: 'University Business Services in Suite 356 handles PantherCard support and parking and transportation.',
      },
      {
        placeId: 'library-north',
        title: 'Stay late without going home first',
        why: 'Study spaces, computers, and printing, with Saxbys open until midnight Monday–Thursday.',
      },
    ],
  },
  {
    id: 'support',
    title: 'Support and wellness',
    label: 'Support',
    intro: 'Where to go when you need a hand: health, counseling, food, accommodations, or just somewhere quiet.',
    stops: [
      {
        placeId: 'library-north',
        title: 'Find somewhere quiet',
        why: 'The library’s Sensory Room on the 3rd floor is a calm place to reset between classes.',
      },
      {
        placeId: 'urban-life',
        title: 'Pick up from a Panther Pantry locker',
        why: 'There’s a Panther Pantry pickup locker on the 3rd floor. The pantry itself is in the basement of the Citizens Trust Building, the last stop on this tour.',
      },
      {
        placeId: 'student-center-west',
        title: 'Meet Student Wellness',
        why: 'Student Wellness is here, along with SGA and Student Organizations if you’re looking for a community.',
      },
      {
        placeId: 'student-center-east',
        title: 'Ask for accommodations or advice',
        why: 'The Dean of Students, the Access and Accommodations Center, TRIO, and Cultures, Communities & Inclusion are all in this building.',
      },
      {
        placeId: '75-piedmont',
        title: 'See a clinician or a counselor',
        why: 'The Citizens Trust Building has the Student Health Clinic in Suite 200 and the Counseling Center in Suite 200A, with same-day drop-in consultations. Student Victim Assistance is in Suite 241, the Ombudsperson in Suite 502, and the Panther Pantry in the basement.',
        tip: 'You don’t need to wait for a crisis. Drop-in consultations are there for smaller worries too.',
      },
    ],
  },
]

/** The tour and 0-based stop a /map link opens on. `?tour=3` is an older link to a stop on the first tour. */
export const tourFromLink = (tour?: string, stop?: string) => {
  if (!tour) return undefined
  const stopOnly = /^\d+$/.test(tour)
  const found = stopOnly ? TOURS[0] : TOURS.find((t) => t.id === tour)
  if (!found) return undefined
  const number = Number(stopOnly ? tour : stop)
  return { tour: found, step: Number.isInteger(number) && number >= 1 && number <= found.stops.length ? number - 1 : 0 }
}
