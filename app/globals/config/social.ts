/**
 * External links (sourced from pin.gsu.edu/organization/cseg). Anything left empty
 * is hidden from the header, footer, and Contact page instead of rendering a dead link.
 */
export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/cseg_gsu/',
  x: 'https://x.com/cseg_gsu',
  /** Georgia State Panther Involvement Network page */
  pin: 'https://pin.gsu.edu/organization/cseg',
  /** The club's GroupMe, as the flyers' QR codes point to (its share link, groupme.com/join_group/…) */
  groupme: '' as string,
  /** The club's Linktree, as the flyers' QR codes point to (linktr.ee/…) */
  linktree: '' as string,
  /** Set from the dashboard's Settings, when the club has them */
  discord: '' as string,
  linkedin: '' as string,
  youtube: '' as string,
} as const

export type SocialNetwork = keyof typeof SOCIAL_LINKS

/** Club contact email (as listed on PIN) */
export const CONTACT_EMAIL = 'cseg.gsu@gmail.com'

export const GSU_URL = 'https://www.gsu.edu'
