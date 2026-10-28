/**
 * External links (sourced from pin.gsu.edu/organization/cseg). Anything left empty
 * is hidden from the header, footer, and Contact page instead of rendering a dead link.
 */
export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/cseg_gsu/',
  x: 'https://x.com/cseg_gsu',
  /** Georgia State Panther Involvement Network page */
  pin: 'https://pin.gsu.edu/organization/cseg',
} as const

export type SocialNetwork = keyof typeof SOCIAL_LINKS

/** Club contact email (as listed on PIN) */
export const CONTACT_EMAIL = 'cseg.gsu@gmail.com'

export const GSU_URL = 'https://www.gsu.edu'
