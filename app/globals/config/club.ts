// Relative, so the scripts can load this too
import { BUILT_IN_JOIN_STEPS } from '../../lib/homepage'

/** The club's core values; their first letters spell CAMPUS, in this order. Shown on the About page. */
export const CORE_VALUES: readonly { title: string; body: string }[] = [
  { title: 'Community', body: 'No Panther navigates campus alone. We build friendships and networks that last from the first semester to graduation.' },
  { title: 'Accessibility', body: 'Everyone belongs at the table, so we plan events, spaces, and resources that every student can use, and make accommodations easy to ask for.' },
  { title: 'Mentorship', body: 'We pass on what we’ve learned: upperclassmen help newer students find their footing, and every officer helps the next one lead.' },
  { title: 'Preparedness', body: 'Knowing where to go, who to ask, and what’s available, so nothing about campus life catches a student off guard.' },
  { title: 'Unity', body: 'Every major, background, and identity, together, working alongside our affiliates rather than apart from them.' },
  { title: 'Support', body: 'We meet students where they are, from social anxiety to food insecurity, and connect them with the resources that help.' },
]

/** Who to ask for an accommodation at a CSEG event, as every flyer says; shown on the Events page. */
export const ACCOMMODATIONS = {
  name: 'Access and Accommodations Center',
  short: 'AACE',
  email: 'access@gsu.edu',
  phone: '(404) 413-1560',
  href: 'https://access.gsu.edu/',
  /** On the campus map: Student Center East, rooms 302 and 304 */
  placeId: 'student-center-east',
} as const

/**
 * How joining works, as the site has it built in. Officers change the steps in the homepage
 * editor; the homepage and the Join page show the saved ones.
 */
export const JOIN_STEPS: readonly { title: string; body: string }[] = BUILT_IN_JOIN_STEPS
