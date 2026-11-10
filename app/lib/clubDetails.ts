import { CLUB_DESCRIPTION } from '@/globals/config/site'
import { CONTACT_EMAIL, SOCIAL_LINKS, type SocialNetwork } from '@/globals/config/social'

import type { BannerTone, ClubSettingsRow } from './supabase/types'

/** A notice across the top of every page */
export interface SiteBanner {
  message: string
  /** Where it links, if anywhere: a path here or a full link */
  href: string | null
  tone: BannerTone
}

/** The club's details as the site shows them */
export interface ClubDetails {
  tagline: string
  meetingInfo: string | null
  contactEmail: string
  instagramUrl: string
  /** Every place the club is online; "" for one it isn't */
  links: Record<SocialNetwork, string>
  banner: SiteBanner | null
  acceptingMembers: boolean
  /** A term's dues, in dollars; null when none are set */
  duesAmount: number | null
  contactFormOpen: boolean
  /** What the Contact form says once a message is sent; null for the site's own */
  contactReply: string | null
  /** What search and link previews fall back to; null for the site's own */
  siteDescription: string | null
  shareImageUrl: string | null
}

/** What the site says until officers fill these in under Settings */
export const BUILT_IN_CLUB_DETAILS: ClubDetails = {
  tagline: CLUB_DESCRIPTION.oneLiner,
  meetingInfo: null,
  contactEmail: CONTACT_EMAIL,
  instagramUrl: SOCIAL_LINKS.instagram,
  links: { ...SOCIAL_LINKS },
  banner: null,
  acceptingMembers: true,
  duesAmount: null,
  contactFormOpen: true,
  contactReply: null,
  siteDescription: null,
  shareImageUrl: null,
}

/** The settings column each network's link is kept in */
export const SOCIAL_COLUMNS = {
  instagram: 'instagram_url',
  x: 'x_url',
  pin: 'pin_url',
  groupme: 'groupme_url',
  linktree: 'linktree_url',
  discord: 'discord_url',
  linkedin: 'linkedin_url',
  youtube: 'youtube_url',
} as const satisfies Record<SocialNetwork, keyof ClubSettingsRow>

/** Today in Atlanta, "YYYY-MM-DD" */
const atlantaToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now)

/**
 * The saved details over the built-in ones: a field left blank keeps the site's own. The
 * notice shows through its last day (Atlanta's), or until it's cleared.
 */
export const clubDetailsFrom = (row: Partial<ClubSettingsRow> | null, today = atlantaToday()): ClubDetails => {
  const links = Object.fromEntries((Object.keys(SOCIAL_COLUMNS) as SocialNetwork[]).map((n) => [n, row?.[SOCIAL_COLUMNS[n]] || SOCIAL_LINKS[n]])) as Record<SocialNetwork, string>
  const message = row?.banner_message?.trim()
  return {
    tagline: row?.tagline || BUILT_IN_CLUB_DETAILS.tagline,
    meetingInfo: row?.meeting_info || BUILT_IN_CLUB_DETAILS.meetingInfo,
    contactEmail: row?.contact_email || BUILT_IN_CLUB_DETAILS.contactEmail,
    instagramUrl: links.instagram,
    links,
    banner: message && (!row?.banner_until || row.banner_until >= today) ? { message, href: row?.banner_href || null, tone: row?.banner_tone ?? 'info' } : null,
    acceptingMembers: row?.accepting_members ?? true,
    duesAmount: row?.dues_amount ?? null,
    contactFormOpen: row?.contact_form_open ?? true,
    contactReply: row?.contact_reply || null,
    siteDescription: row?.site_description || null,
    shareImageUrl: row?.share_image_url || null,
  }
}

/** "@cseg_gsu" from an Instagram link */
export const instagramHandle = (url: string) => `@${new URL(url).pathname.split('/').filter(Boolean)[0] ?? 'cseg_gsu'}`

/** "$15" or "$12.50" */
export const formatDollars = (amount: number) => `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`
