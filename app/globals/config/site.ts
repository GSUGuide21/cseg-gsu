/**
 * How we describe CSEG across the site, adapted from our PIN listing
 * (pin.gsu.edu/organization/cseg). Keep the PIN page in sync when editing.
 */
export const SITE_NAME = 'Campus Survival and Engagement Group'

export const SITE_SHORT_NAME = 'CSEG'

export const CLUB_DESCRIPTION = {
  /** Hero, social bios */
  tagline: 'Your gateway to life on campus at Georgia State.',
  /** Meta descriptions, footer (PIN summary) */
  oneLiner:
    'The Campus Survival and Engagement Group is a student organization dedicated to fostering a gateway for students of Georgia State University to be acclimated to the campus environment.',
  /** About page intro (PIN description) */
  short:
    'The Campus Survival and Engagement Group, also known as CSEG or the Campus Survival Group, is a student organization at Georgia State University. We help Panthers get comfortable on campus, from navigating its social and physical sides to finding the resources that make college easier.',
  /** About page Mission card */
  mission:
    'To foster an environment for students of Georgia State University to be acclimated to the campus environment.',
  /** About page Purpose card */
  purpose:
    'To educate students on navigating the social and physical aspects of campus, and assist students with performing the necessary tasks for getting through college, understanding underutilized resources, and graduating.',
} as const

export const HERO = {
  eyebrow: 'Georgia State University',
  title: 'Survive. Engage. Graduate.',
} as const
