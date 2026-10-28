/**
 * "First week on campus": CSEG's walking tour of the places new Panthers need first.
 * Stops reference place ids in ./places. Ordered as a walking loop that starts at the
 * Welcome Center and ends at the Georgia State MARTA station.
 *
 * Facts come from GSU's Aug 2025 office relocation notice, PantherDining, and GSU Safety.
 * CSEG officers: edit the wording freely, but keep office locations in sync with GSU.
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

export const TOUR_TITLE = 'First week on campus'

export const TOUR_INTRO =
  'A walking loop through the places you’ll need in your first week, from the Welcome Center to the MARTA station. About 1.8 km (roughly 25 minutes of walking); plan an hour or two with stops.'

export const TOUR_STOPS: readonly TourStop[] = [
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
]
