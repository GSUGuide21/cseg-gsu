/**
 * Campus map places (Atlanta campus). Coordinates and addresses come from
 * OpenStreetMap (© OpenStreetMap contributors, ODbL), pulled October 2026.
 * Office locations follow GSU's Aug 2025 relocation notice (news.gsu.edu), made
 * when Sparks Hall closed for demolition; suite numbers come from each office's own
 * website (October 2026), and for the Student Centers from the Student Center's floor
 * listing (engagement.gsu.edu/student-center/visitus, October 2026). Descriptions are CSEG's own.
 * Restaurant pins come from ./eats (the /eat guide), or on the map from the dashboard's eateries.
 */
import type { Eatery } from '../eateries'
import type { Schedule } from '../hours'
import { EATERIES } from './eats'
import { STUDENT_CENTER_EAST_FLOORS, STUDENT_CENTER_WEST_FLOORS, type Floor } from './rooms'

export type PlaceCategory =
  | 'student-life'
  | 'services'
  | 'study'
  | 'academic'
  | 'food'
  | 'housing'
  | 'apartments'
  | 'transit'
  | 'parking'
  | 'arts-athletics'
  | 'outdoors'

export type Place = {
  /** URL id: /map?place=student-center-west */
  readonly id: string
  readonly name: string
  readonly category: PlaceCategory
  /** Other filters this place also appears under (the pin color follows `category`) */
  readonly alsoIn?: readonly PlaceCategory[]
  readonly lat: number
  readonly lng: number
  readonly address?: string
  readonly description: string
  /** Extra search terms (abbreviations, nicknames) */
  readonly aliases?: readonly string[]
  /** Opening hours, where an official source gives them ("Open now") */
  readonly schedule?: Schedule
  /** Room directory by floor, shown in the popup and matched by search */
  readonly floors?: readonly Floor[]
}

export const PLACE_CATEGORIES: Record<PlaceCategory, { label: string; color: string }> = {
  'student-life': { label: 'Student life', color: '#0039a6' },
  services: { label: 'Student services', color: '#0891b2' },
  study: { label: 'Study', color: '#7c3aed' },
  academic: { label: 'Academic', color: '#0f766e' },
  food: { label: 'Food', color: '#c2410c' },
  housing: { label: 'Housing', color: '#be185d' },
  apartments: { label: 'Student apartments', color: '#a21caf' },
  transit: { label: 'MARTA', color: '#ca8a04' },
  parking: { label: 'Parking', color: '#475569' },
  'arts-athletics': { label: 'Arts & athletics', color: '#15803d' },
  outdoors: { label: 'Parks & plazas', color: '#65a30d' },
}

/** Where the map opens: between the student centers and the library. */
export const CAMPUS_CENTER = { lat: 33.7535, lng: -84.3865, zoom: 16 } as const

const BUILDINGS_AND_SPACES: readonly Place[] = [
  // Student life
  {
    id: 'student-center-east',
    name: 'Student Center East',
    category: 'student-life',
    lat: 33.75258,
    lng: -84.38486,
    address: '55 Gilmer Street SE',
    description:
      'A hub for student organizations, meeting rooms, and lounges, and a good first stop on campus: the Dean of Students, the Access and Accommodations Center, TRIO, Cultures, Communities & Inclusion, and Orientation are all here, with The Courtyard food court on the 1st floor.',
    floors: STUDENT_CENTER_EAST_FLOORS,
    aliases: [
      'sce',
      'courtyard kitchen',
      'panda express',
      'costa',
      'information center',
      'ballroom',
      'speakers auditorium',
      'trio',
      'cci',
      'intersection',
      'quiet study',
      'dean of students',
      'student conduct',
      'aace',
      'accommodations',
      'disability',
      'student engagement',
      'event management',
      'room reservations',
      'orientation',
      'catering',
    ],
  },
  {
    id: 'student-center-west',
    name: 'Student Center West',
    category: 'student-life',
    lat: 33.75248,
    lng: -84.38599,
    address: '66 Courtland Street SE',
    description:
      'Meeting and event rooms across four floors; CSEG events like Vibez Talk and The Hub have been held here. Home to Student Media, SGA and Student Organizations, the Bookstore, PantherCard and parking help, Fraternity & Sorority Life, Leadership & Service, and Student Wellness.',
    floors: STUDENT_CENTER_WEST_FLOORS,
    aliases: [
      'scw',
      'public health',
      'student media',
      'album 88',
      'wras',
      'radio',
      'student life',
      'pantherdining',
      'cinefest',
      'movies',
      'spotlight',
      'lactation',
      'student organizations',
      'sga',
      'student government',
      'bookstore',
      'business services',
      'panthercard',
      'parking permit',
      'cashier',
      'payroll',
      'reflection space',
      'meditation',
      'commuter',
      'lounge',
      'information center',
      'fsl',
      'fraternity',
      'sorority',
      'greek life',
      'dance studio',
      'leadership',
      'service',
      'collegiate recovery',
      'recovery',
      'wellness',
    ],
  },
  {
    id: 'student-recreation-center',
    name: 'Student Recreation Center',
    category: 'student-life',
    lat: 33.75192,
    lng: -84.38432,
    address: '101 Piedmont Avenue SE',
    description: 'The Rec Center: gym, courts, and fitness classes for students.',
    aliases: ['rec', 'gym'],
  },
  {
    id: 'university-bookstore',
    name: 'University Bookstore',
    category: 'student-life',
    lat: 33.75279,
    lng: -84.38562,
    address: '66 Courtland Street SE',
    description: 'Textbooks, supplies, and Georgia State gear. Suite 323 in Student Center West.',
    aliases: ['books'],
  },
  {
    id: 'alumni-center',
    name: 'Alumni Center',
    category: 'student-life',
    lat: 33.75604,
    lng: -84.38253,
    address: '142 Auburn Avenue NE',
    description: 'Home of Georgia State alumni relations, on historic Auburn Avenue.',
  },

  // Student services (moved out of Sparks Hall in 2025)
  {
    id: 'student-success-center',
    name: 'Student Success Center',
    category: 'services',
    lat: 33.75525,
    lng: -84.38739,
    address: '25-27 Auburn Avenue NE',
    description:
      'One stop for enrollment and registration, financial aid (Student Financial Management Center), International Student and Scholar Services, and Supplemental Instruction. Housed in the restored Bell Buildings.',
    aliases: ['registrar', 'registration', 'financial aid', 'issss', 'international', 'si', 'bell building'],
  },
  {
    id: 'centennial-hall',
    name: 'Centennial Hall (Welcome Center)',
    category: 'services',
    lat: 33.75587,
    lng: -84.38357,
    address: '100 Auburn Avenue NE',
    description: 'The Welcome Center, Undergraduate Admissions, and the Honors College. Campus tours start here.',
    aliases: ['admissions', 'welcome center', 'tours', 'honors'],
  },
  {
    id: '75-piedmont',
    name: '75 Piedmont',
    category: 'services',
    lat: 33.75665,
    lng: -84.38185,
    address: '75 Piedmont Avenue NE',
    description:
      'The Graduation Office, classroom scheduling, and the PantherDining office, with Twisted Taco (Tex-Mex) and Kenley’s (Suite 152) on the 1st floor. Also home to the Student Health Clinic (Suite 200), the Counseling Center (Suite 200A, with same-day drop-in consultations), Student Victim Assistance (Suite 241), the Ombudsperson (Suite 502), and a Panther Pantry pickup locker (basement).',
    aliases: [
      'graduation',
      'citizens trust',
      'twisted taco',
      'kenleys',
      'pantherdining',
      'health clinic',
      'doctor',
      'counseling',
      'mental health',
      'victim assistance',
      'ombuds',
      'pantry',
      'free food',
    ],
  },
  {
    id: 'gsu-police',
    name: 'GSU Police Headquarters',
    category: 'services',
    lat: 33.75439,
    lng: -84.38903,
    address: '15 Edgewood Avenue NE',
    description:
      'Georgia State University Police, open 24/7. Campus police: 404-413-3333. Non-emergencies and safety escorts: 404-413-2100. Emergencies: 911.',
    aliases: ['police', 'gsupd', 'safety', 'escort', 'security'],
  },

  // Study
  {
    id: 'library-north',
    name: 'Library North',
    category: 'study',
    lat: 33.75277,
    lng: -84.38657,
    address: '100 Decatur Street SE',
    description:
      'University Library: study spaces, computers, printing, and research help, plus Saxbys café (open until midnight Mon–Thu). A calming Sensory Room is on the 3rd floor.',
    aliases: ['library', 'printing', 'saxbys', 'coffee', 'sensory room'],
  },
  {
    id: 'library-south',
    name: 'Library South',
    category: 'study',
    lat: 33.75227,
    lng: -84.38702,
    address: '100 Decatur Street SE',
    description: 'The other half of the University Library, connected to Library North. Home to CURVE and CETLOE (Room 100).',
    aliases: ['library', 'curve', 'cetloe'],
  },
  {
    id: 'curve',
    name: 'CURVE',
    category: 'study',
    lat: 33.75238,
    lng: -84.38691,
    address: '100 Decatur Street SE',
    description:
      'The Collaborative University Research & Visualization Environment, in Library South: a library space for data, mapping, and visualization projects, built around a 24-foot touch video wall.',
    aliases: ['visualization', 'video wall', 'data', 'research', 'library south'],
  },
  {
    id: 'cetloe',
    name: 'CETLOE',
    category: 'academic',
    lat: 33.75237,
    lng: -84.38713,
    address: '100 Decatur Street SE',
    description:
      'The Center for Excellence in Teaching, Learning, and Online Education, which supports teaching and online learning across GSU. Room 100 in Library South.',
    aliases: ['teaching', 'online learning', 'online education', 'library south'],
  },
  {
    id: 'aderhold-learning-center',
    name: 'Helen M. Aderhold Learning Center',
    category: 'study',
    lat: 33.75636,
    lng: -84.38916,
    address: '60 Luckie Street NW',
    description: 'Classrooms and learning spaces near Centennial Olympic Park.',
    aliases: ['alc', 'aderhold'],
  },

  // Classes
  {
    id: 'langdale-hall',
    name: 'Langdale Hall',
    category: 'academic',
    lat: 33.75322,
    lng: -84.38716,
    address: '38 Peachtree Center Avenue SE',
    description: 'Classrooms and offices in the center of campus.',
  },
  {
    id: 'classroom-south',
    name: 'Classroom South',
    category: 'academic',
    lat: 33.75264,
    lng: -84.38751,
    address: '38 Peachtree Center Avenue SE',
    description: 'One of the main general-purpose classroom buildings.',
    aliases: ['csb'],
  },
  {
    id: 'arts-humanities',
    name: 'Arts & Humanities',
    category: 'academic',
    lat: 33.75387,
    lng: -84.38648,
    address: '10 Peachtree Center Avenue SE',
    description: 'Arts and humanities classrooms, studios, and offices.',
    aliases: ['ah'],
  },
  {
    id: 'natural-science-center',
    name: 'Natural Science Center',
    category: 'academic',
    lat: 33.75377,
    lng: -84.38809,
    address: '50 Decatur Street SE',
    description: 'Science classrooms and labs.',
    aliases: ['nsc'],
  },
  {
    id: 'petit-science-center',
    name: 'Petit Science Center',
    category: 'academic',
    lat: 33.75084,
    lng: -84.38548,
    address: '100 Piedmont Avenue SE',
    description: 'Science labs, research space, and lecture halls.',
    aliases: ['psc'],
  },
  {
    id: 'research-science-center',
    name: 'Research Science Center',
    category: 'academic',
    lat: 33.75072,
    lng: -84.38485,
    description:
      'Five-story science research building at Decatur Street and Piedmont Avenue, next to the Petit Science Center, with the Research Tower directly behind it.',
    aliases: ['rsc', 'science', 'research', 'labs'],
  },
  {
    id: 'science-annex',
    name: 'Science Annex',
    category: 'academic',
    lat: 33.75372,
    lng: -84.38746,
    address: '29 Peachtree Center Avenue SE',
    description: 'Science classrooms and labs next to the Natural Science Center.',
  },
  {
    id: 'one-park-place',
    name: 'One Park Place',
    category: 'academic',
    lat: 33.75422,
    lng: -84.38899,
    address: '1 Park Place',
    description: 'Georgia State offices on Park Place, by Woodruff Park and next to GSU Police headquarters.',
    aliases: ['opp'],
  },
  {
    id: '55-park-place',
    name: '55 Park Place',
    category: 'academic',
    lat: 33.75596,
    lng: -84.3872,
    address: '55 Park Place NE',
    description: 'Georgia State’s 19-story office tower overlooking Woodruff Park, home of the Andrew Young School of Policy Studies.',
    aliases: ['55pp', 'andrew young', 'ays', 'policy'],
  },
  {
    id: '25-park-place',
    name: '25 Park Place',
    category: 'academic',
    alsoIn: ['services'],
    lat: 33.75525,
    lng: -84.38777,
    address: '25 Park Place NE',
    description:
      'The historic Trust Company of Georgia Building. Inside: University Career Services (Suite 111, with free headshots on the 1st floor), the Creative Media Industries Institute (Suite 219), the Writing Studio (Suite 2420), and the College of Arts & Sciences dean’s office (Suite 2500).',
    aliases: ['25pp', 'trust company', 'career services', 'headshots', 'cmii', 'writing studio', 'arts and sciences', 'cas'],
  },
  {
    id: 'cmii',
    name: 'Creative Media Industries Institute',
    category: 'academic',
    alsoIn: ['arts-athletics'],
    lat: 33.75482,
    lng: -84.38787,
    address: '25 Park Place NE',
    description:
      '“The Cube”: CMII’s three-story media production center at Edgewood Avenue and Park Place, in the former SunTrust bank lobby attached to 25 Park Place. Studios and labs for film, games, and immersive media.',
    aliases: ['cmii', 'the cube', 'media', 'film', 'games', 'animation', 'vr'],
  },
  {
    id: 'standard-building',
    name: 'Standard Building',
    category: 'academic',
    lat: 33.75715,
    lng: -84.38972,
    address: '91 Fairlie Street NW',
    description: 'Georgia State building on the west side of campus, near the Rialto.',
  },
  {
    // Not in OpenStreetMap yet; placed from aerial imagery, directly behind the Research Science Center
    id: 'research-tower',
    name: 'Research Tower',
    category: 'academic',
    lat: 33.75035,
    lng: -84.38515,
    description:
      'Nine-story science building that opened in fall 2026: classrooms, a large lecture hall, and teaching labs on the first two floors, with research labs above. Directly behind the Research Science Center.',
    aliases: ['science', 'labs', 'lecture'],
  },
  {
    id: 'urban-life',
    name: 'Urban Life Building',
    category: 'academic',
    lat: 33.75221,
    lng: -84.38537,
    address: '140 Decatur Street SE',
    description:
      'Classrooms and offices along Decatur Street, across from the Student Centers. Home of the School of Public Health (Suite 400), with a Panther Pantry pickup locker on the 3rd floor.',
    aliases: ['public health', 'pantry', 'free food'],
  },
  {
    id: 'dahlberg-hall',
    name: 'Dahlberg Hall',
    category: 'academic',
    lat: 33.75371,
    lng: -84.38461,
    address: '30 Courtland Street SE',
    description: 'University offices and event space.',
  },
  {
    id: '100-edgewood',
    name: '100 Edgewood',
    category: 'academic',
    lat: 33.75475,
    lng: -84.38562,
    address: '100 Edgewood Avenue NE',
    description:
      'The 18-story former headquarters of the United Way of Greater Atlanta, overlooking Hurt Park. Georgia State bought it in 2023 and plans to renovate it as part of the remake of the blocks around the park.',
    aliases: ['united way', 'united way building', '100edg', 'woodruff volunteer service center'],
  },
  {
    id: 'college-of-education',
    name: 'College of Education & Human Development',
    category: 'academic',
    lat: 33.75353,
    lng: -84.38897,
    address: '30 Pryor Street SW',
    description: 'CEHD classes and offices; the dean’s office is in Suite 300.',
    aliases: ['cehd', 'college of education', 'education'],
  },
  {
    id: 'robinson-college-of-business',
    name: 'J. Mack Robinson College of Business',
    category: 'academic',
    lat: 33.75506,
    lng: -84.38996,
    address: '35 Broad Street NW',
    description: 'Business school classrooms and offices near Five Points.',
    aliases: ['rcb', 'business'],
  },
  {
    id: 'college-of-law',
    name: 'College of Law',
    category: 'academic',
    lat: 33.75677,
    lng: -84.38724,
    address: '85 Park Place NE',
    description: 'Georgia State University College of Law.',
    aliases: ['law'],
  },
  {
    id: 'haas-howell',
    name: 'Haas-Howell Building',
    category: 'academic',
    lat: 33.75662,
    lng: -84.38976,
    address: '75 Poplar Street NW',
    description: 'Classrooms and offices on the west side of campus.',
  },

  // Food
  {
    id: 'piedmont-north-dining',
    name: 'Piedmont North Dining Hall',
    category: 'food',
    lat: 33.7591,
    lng: -84.38157,
    address: '175 Piedmont Avenue NE',
    description: 'All-you-care-to-eat dining hall at the Piedmont North residence halls. Open weekdays 7 a.m.–9 p.m.; closed weekends.',
    aliases: ['dining', 'meal plan'],
  },
  {
    id: 'patton-hall',
    name: 'Patton Hall',
    category: 'housing',
    alsoIn: ['food'],
    lat: 33.7548,
    lng: -84.38257,
    address: '160 Edgewood Avenue NE',
    description:
      'First-year residence hall with single or shared rooms, plus one of GSU’s three dining halls (eight themed stations). Residents need a meal plan. The dining hall is closed for maintenance as of October 2026.',
    aliases: ['dining', 'meal plan', 'dorm', 'freshman', 'first-year'],
  },
  {
    id: 'piedmont-central',
    name: 'Piedmont Central',
    category: 'food',
    alsoIn: ['housing'],
    lat: 33.75685,
    lng: -84.38291,
    address: '92 Piedmont Avenue NE',
    description: 'Residence hall with suite-style rooms and one of GSU’s three dining halls, open around the clock Monday–Thursday.',
    aliases: ['dining', 'meal plan', 'dorm', 'housing'],
  },

  // Housing
  {
    id: 'university-commons',
    name: 'University Commons',
    category: 'housing',
    lat: 33.75806,
    lng: -84.38137,
    address: '141 Piedmont Avenue NE',
    description: 'Apartment-style student housing.',
    aliases: ['dorm', 'commons'],
  },
  {
    id: 'piedmont-north',
    name: 'Piedmont North',
    category: 'housing',
    lat: 33.75882,
    lng: -84.38131,
    address: '175 Piedmont Avenue NE',
    description: 'Residence halls (buildings A and B), popular with first-year students.',
    aliases: ['dorm', 'freshman'],
  },
  {
    id: 'university-lofts',
    name: 'University Lofts',
    category: 'housing',
    lat: 33.75409,
    lng: -84.38377,
    address: '135 Edgewood Avenue SE',
    description: 'Loft-style student housing on Edgewood Avenue.',
    aliases: ['dorm', 'lofts'],
  },
  {
    id: 'greek-housing',
    name: 'Greek Housing',
    category: 'housing',
    lat: 33.75462,
    lng: -84.38306,
    address: '156 Edgewood Avenue NE',
    description: 'Housing for fraternity and sorority members.',
    aliases: ['fraternity', 'sorority'],
  },

  // Student apartments: privately run, not GSU housing. Leases go through each property.
  {
    id: 'reflection',
    name: 'Reflection',
    category: 'apartments',
    lat: 33.75679,
    lng: -84.38381,
    address: '111 John Wesley Dobbs Avenue NE',
    description:
      'Private student apartments with furnished units, a block from the Piedmont residence halls, with MJ Wings & More on the ground floor. Not GSU housing.',
    aliases: ['apartment', 'off-campus', 'reflection student apartments', 'mj wings'],
  },
  {
    id: 'one12-courtland',
    name: 'One12 Courtland',
    category: 'apartments',
    lat: 33.75744,
    lng: -84.38519,
    address: '112 Courtland Street NE',
    description: 'Private apartments listed for GSU students, with studio, three-, and four-bedroom units. Not GSU housing.',
    aliases: ['apartment', 'off-campus', 'one 12'],
  },
  {
    id: 'the-mix',
    name: 'The Mix',
    category: 'apartments',
    lat: 33.75748,
    lng: -84.38279,
    address: '120 Piedmont Avenue NE',
    description: 'Private student apartments on Piedmont Avenue, next to Piedmont Central. Not GSU housing.',
    aliases: ['apartment', 'off-campus'],
  },
  {
    id: '200-edgewood',
    name: '200 Edgewood',
    category: 'apartments',
    lat: 33.75481,
    lng: -84.38098,
    address: '200 Edgewood Avenue NE',
    description: 'Private student apartments on Edgewood Avenue, a short walk from campus. Not GSU housing.',
    aliases: ['apartment', 'off-campus'],
  },
  {
    id: 'freeman-ford-lofts',
    name: 'Freeman Ford Lofts',
    category: 'apartments',
    lat: 33.75684,
    lng: -84.3852,
    address: '75 John Wesley Dobbs Avenue NE',
    description: 'Loft apartments a short walk from campus, near Peachtree Center. Not GSU housing.',
    aliases: ['apartment', 'off-campus', 'ford lofts'],
  },
  {
    id: 'legacy-at-centennial',
    name: 'The Legacy at Centennial',
    category: 'apartments',
    lat: 33.75819,
    lng: -84.3907,
    address: '130 Luckie Street NW',
    description: 'Private student apartments near Centennial Olympic Park, on the west side of campus. Not GSU housing.',
    aliases: ['apartment', 'off-campus', 'legacy'],
  },

  // MARTA
  {
    id: 'marta-georgia-state',
    name: 'Georgia State Station',
    category: 'transit',
    lat: 33.75017,
    lng: -84.38596,
    description: 'MARTA East-West line (Blue and Green). The closest rail stop to the Student Centers.',
    aliases: ['marta', 'train'],
  },
  {
    id: 'marta-five-points',
    name: 'Five Points Station',
    category: 'transit',
    lat: 33.75389,
    lng: -84.3916,
    description: 'MARTA hub where all four rail lines meet. Closest to the business school.',
    aliases: ['marta', 'train'],
  },
  {
    id: 'marta-peachtree-center',
    name: 'Peachtree Center Station',
    category: 'transit',
    lat: 33.75815,
    lng: -84.38761,
    description: 'MARTA North-South line (Red and Gold), near the College of Law.',
    aliases: ['marta', 'train'],
  },

  // Parking
  {
    id: 'g-deck',
    name: 'G Deck',
    category: 'parking',
    lat: 33.75201,
    lng: -84.38758,
    address: '116 Courtland Street SE',
    description: 'GSU parking deck near the library and Classroom South.',
  },
  {
    id: 'k-deck',
    name: 'K Deck',
    category: 'parking',
    lat: 33.75114,
    lng: -84.38412,
    address: '118 Gilmer Street SE',
    description: 'GSU parking deck near the Rec Center.',
  },
  {
    id: 'm-deck',
    name: 'M Deck',
    category: 'parking',
    lat: 33.75325,
    lng: -84.38406,
    address: '19 Auditorium Place SE',
    description: 'GSU parking deck near Student Center East.',
  },
  {
    id: 'n-deck',
    name: 'N Deck',
    category: 'parking',
    lat: 33.75139,
    lng: -84.38446,
    address: '118 Gilmer Street SE',
    description: 'GSU parking deck near the Rec Center.',
  },
  {
    id: 's-deck',
    name: 'S Deck',
    category: 'parking',
    lat: 33.75171,
    lng: -84.38351,
    address: '118 Gilmer Street SE',
    description: 'GSU parking deck on Gilmer Street.',
  },
  {
    id: 't-deck',
    name: 'T Deck',
    category: 'parking',
    lat: 33.75504,
    lng: -84.38671,
    address: '43 Auburn Avenue NE',
    description: 'GSU parking deck on Auburn Avenue.',
  },
  {
    id: 'lofts-parking',
    name: 'Lofts Parking Lot',
    category: 'parking',
    lat: 33.7538,
    lng: -84.38346,
    address: '34 Piedmont Avenue SE',
    description: 'GSU parking by University Lofts.',
    aliases: ['loft parking'],
  },
  {
    id: 'j-deck',
    name: 'J Deck',
    category: 'parking',
    lat: 33.75645,
    lng: -84.38156,
    description: 'GSU parking deck near University Commons.',
  },

  // Arts & athletics
  {
    id: 'rialto-center',
    name: 'Rialto Center for the Arts',
    category: 'arts-athletics',
    lat: 33.7568,
    lng: -84.3895,
    address: '80 Forsyth Street NW',
    description: 'Georgia State performance venue for concerts, shows, and speakers.',
    aliases: ['theatre', 'theater'],
  },
  {
    id: 'sports-arena',
    name: 'GSU Sports Arena',
    category: 'arts-athletics',
    lat: 33.75163,
    lng: -84.38636,
    address: '125 Decatur Street SE',
    description: 'On-campus arena for Panthers athletics.',
    aliases: ['arena'],
  },
  {
    id: 'convocation-center',
    name: 'Georgia State Convocation Center',
    category: 'arts-athletics',
    lat: 33.74254,
    lng: -84.38868,
    address: '455 Capitol Avenue SE',
    description: 'Arena opened in 2022; home of Panthers basketball and big campus events.',
    aliases: ['convo', 'basketball'],
  },
  {
    id: 'center-parc-stadium',
    name: 'Center Parc Stadium',
    category: 'arts-athletics',
    lat: 33.73553,
    lng: -84.3894,
    address: '755 Hank Aaron Drive SE',
    description: 'Home of Panthers football, in Summerhill south of the main campus.',
    aliases: ['football', 'stadium', 'turner field'],
  },
  {
    id: 'baseball-park',
    name: 'Georgia State Baseball Park',
    category: 'arts-athletics',
    lat: 33.73954,
    lng: -84.38943,
    address: '565 Hank Aaron Drive SE',
    description:
      'The new home of Panthers baseball, built on the site of the old Atlanta–Fulton County Stadium, where Hank Aaron hit home run No. 715.',
    aliases: ['baseball', 'hank aaron'],
  },

  // Parks & plazas
  {
    id: 'gsu-greenway',
    name: 'GSU Greenway',
    category: 'outdoors',
    lat: 33.75334,
    lng: -84.38646,
    description:
      'Car-free walkway through the middle of campus, starting at Langdale Hall. The new Panther Quad will connect it to Hurt Park.',
    aliases: ['greenway', 'walkway'],
  },
  {
    // Unnamed pedestrian plaza on the east side of Langdale Hall in OpenStreetMap
    id: 'langdale-plaza',
    name: 'Langdale Plaza',
    category: 'outdoors',
    lat: 33.7531,
    lng: -84.38666,
    description: 'Open plaza outside Langdale Hall at the west end of the GSU Greenway. A natural meeting spot between classes.',
    aliases: ['plaza'],
  },
  {
    id: 'unity-plaza',
    name: 'Unity Plaza',
    category: 'outdoors',
    lat: 33.75284,
    lng: -84.38536,
    description:
      'The central plaza between Student Center East and Student Center West, by the University Bookstore. Look for the bronze panther statue: tradition says touching its nose brings luck.',
    aliases: ['student center plaza', 'plaza', 'panther statue'],
  },
  {
    // Unnamed pedestrian plaza beside the Urban Life Building in OpenStreetMap
    id: 'urban-life-plaza',
    name: 'Urban Life Plaza',
    category: 'outdoors',
    lat: 33.75215,
    lng: -84.38574,
    description: 'Plaza alongside the Urban Life Building, between Student Center West and Library South.',
    aliases: ['plaza', 'urban life'],
  },
  {
    // Under construction; placed in the middle of the Sparks Hall footprint, which OpenStreetMap still maps
    id: 'panther-quad',
    name: 'Panther Quad',
    category: 'outdoors',
    lat: 33.75347,
    lng: -84.38591,
    description:
      'New pedestrian quad taking shape where Sparks Hall stood. Gilmer Street is closed to cars here, and an elevated plaza, walkways, and green space will join the GSU Greenway to Hurt Park. Under construction.',
    aliases: ['quad', 'sparks hall', 'gilmer', 'central academic quad'],
  },
  {
    id: 'hurt-park',
    name: 'Hurt Park',
    category: 'outdoors',
    lat: 33.754,
    lng: -84.38542,
    description:
      'Green space in the middle of campus, maintained by Georgia State. The former Sparks Hall site and the new Panther Quad are being opened up to connect with it.',
    aliases: ['park', 'panther quad'],
  },
  {
    id: 'woodruff-park',
    name: 'Woodruff Park',
    category: 'outdoors',
    lat: 33.75558,
    lng: -84.38855,
    description:
      'Downtown Atlanta’s central park, ringed by Georgia State buildings, with the International Peace Fountain, open lawn, and a playground.',
    aliases: ['park', 'fountain'],
  },
]

/** Restaurants and cafés with their own pin (one per location); dining halls use their building's pin. */
const foodPins = (eateries: readonly Eatery[]): Place[] => eateries.flatMap((e): Place[] => {
  const description = [e.description, e.hours].filter(Boolean).join(' ')
  if (e.locations) {
    return e.locations.map((loc) => ({
      id: loc.id,
      name: `${e.name} (${loc.label})`,
      category: 'food',
      lat: loc.lat,
      lng: loc.lng,
      address: loc.label,
      description,
      aliases: e.aliases,
      schedule: loc.schedule,
    }))
  }
  if (e.lat === undefined || e.lng === undefined) return []
  return [
    {
      id: e.id,
      name: e.name,
      category: 'food',
      lat: e.lat,
      lng: e.lng,
      address: e.address,
      description,
      aliases: e.aliases,
      schedule: e.schedule,
    },
  ]
})

/** Dining-hall buildings take their hall's hours, but only when food is the building's main category. */
const withDiningHours = (eateries: readonly Eatery[]) => (p: Place): Place => {
  if (p.category !== 'food') return p
  const hall = eateries.find((e) => e.diningHall && e.placeId === p.id)
  return hall?.schedule ? { ...p, schedule: hall.schedule } : p
}

/**
 * The map's places with these eateries' pins and dining hours: the campus map draws the
 * dashboard's eateries this way, so their pins and "Open now" follow what officers set.
 */
export const placesWithEateries = (eateries: readonly Eatery[]): Place[] => [...BUILDINGS_AND_SPACES.map(withDiningHours(eateries)), ...foodPins(eateries)]

/** The places with the built-in eateries, for everything that can't wait on the dashboard (routes, search) */
export const PLACES: readonly Place[] = placesWithEateries(EATERIES)

export const getPlace = (id: string) => PLACES.find((p) => p.id === id)

/**
 * Matches a free-text event location ("Student Center West 259") to a place,
 * so event cards can link to the map. Longest matching name wins.
 */
export function findPlaceForLocation(location: string): Place | undefined {
  const text = location.toLowerCase()
  return PLACES.filter((p) => text.includes(p.name.toLowerCase())).sort(
    (a, b) => b.name.length - a.name.length
  )[0]
}

export const mapHref = (place: Place) => `/map?place=${place.id}`
