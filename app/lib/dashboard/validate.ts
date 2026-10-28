import { slugify } from '@/components/Form/Slug/slugify'
import { PLACE_CATEGORIES, placesWithEateries } from '@/lib/data/places'
import { isEatArea, parseSchedule, scheduleJson } from '@/lib/eateries'
import { sectionId } from '@/lib/richtext/blocks/section'
import {
  PAGE_SECTIONS_MAX,
  PAGE_SUBTITLE_MAX as SUBTITLE_MAX,
  SECTION_TITLE_MAX,
  type MemberStatus,
  type MemberYear,
  type OfficerRole,
  type PageLayout,
  type PageSection,
  type PublishStatus,
} from '@/lib/supabase/types'

/**
 * Checks for what officers type into the dashboard. Each takes the form's fields and
 * returns either clean data or a message per field, so a form can show them in place.
 * The database checks the same rules again.
 */

export type FieldErrors = Record<string, string>
export type Parsed<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors }

/** What a server action hands back to its form */
export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error?: string; errors?: FieldErrors }

export const YEARS: readonly MemberYear[] = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate']
export const STATUSES: readonly MemberStatus[] = ['active', 'new', 'inactive']

const text = (v: FormDataEntryValue | null | undefined) => (typeof v === 'string' ? v.trim() : '')
const optional = (v: FormDataEntryValue | null | undefined) => text(v) || null
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** One slug rule for the whole site: the Slug component's */
export { slugify }

const done = <T>(errors: FieldErrors, data: T): Parsed<T> => (Object.keys(errors).length ? { ok: false, errors } : { ok: true, data })

export function parseMember(form: FormData) {
  const errors: FieldErrors = {}
  const name = text(form.get('name'))
  const email = optional(form.get('email'))?.toLowerCase() ?? null
  const year = optional(form.get('year')) as MemberYear | null
  const status = (text(form.get('status')) || 'new') as MemberStatus
  const joined = text(form.get('joined_on'))
  if (!name) errors.name = 'Add their name.'
  if (email && !EMAIL.test(email)) errors.email = 'That doesn’t look like an email address.'
  if (year && !YEARS.includes(year)) errors.year = 'Pick a year from the list.'
  if (!STATUSES.includes(status)) errors.status = 'Pick a status.'
  if (joined && !/^\d{4}-\d{2}-\d{2}$/.test(joined)) errors.joined_on = 'Use a date like 2026-09-01.'
  return done(errors, {
    name,
    email,
    major: optional(form.get('major')),
    year,
    status,
    notes: optional(form.get('notes')),
    ...(joined ? { joined_on: joined } : {}),
  })
}

export function parseCheckin(form: FormData) {
  const errors: FieldErrors = {}
  const name = text(form.get('name'))
  const email = optional(form.get('email'))?.toLowerCase() ?? null
  const eventId = text(form.get('event_id'))
  if (!name) errors.name = 'Add a name.'
  if (email && !EMAIL.test(email)) errors.email = 'That doesn’t look like an email address.'
  if (!eventId) errors.event_id = 'Missing the event.'
  return done(errors, { name, email, event_id: eventId, member_id: optional(form.get('member_id')) })
}

/** Posts and pages share their fields: a title, a slug, markdown, and draft or published */
/**
 * A page's sections, sent as JSON: each with an id, a title, a subtitle, and its writing
 * (editor JSON), trimmed to size; anything that isn't one is dropped
 */
export function parseSections(raw: FormDataEntryValue | null): PageSection[] {
  let list: unknown
  try {
    list = typeof raw === 'string' && raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
  if (!Array.isArray(list)) return []
  const line = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
  return list
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .slice(0, PAGE_SECTIONS_MAX)
    .map((s, i) => ({
      id: typeof s.id === 'string' && /^[\w-]{1,64}$/.test(s.id) ? s.id : `section-${i + 1}`,
      title: line(s.title, SECTION_TITLE_MAX),
      subtitle: line(s.subtitle, SUBTITLE_MAX),
      // Letters, numbers, and hyphens only, as a #link has to be
      anchor: typeof s.anchor === 'string' ? sectionId(s.anchor) : '',
      body: typeof s.body === 'string' ? s.body : '',
    }))
}

export function parseDocument(form: FormData) {
  const errors: FieldErrors = {}
  const title = text(form.get('title'))
  const slug = slugify(text(form.get('slug')) || title)
  const status = (text(form.get('status')) || 'draft') as PublishStatus
  if (!title) errors.title = 'Add a title.'
  if (!slug) errors.slug = 'Add a web address made of letters and numbers.'
  if (status !== 'draft' && status !== 'published') errors.status = 'Pick draft or published.'
  const cover = optional(form.get('cover_image_url'))
  if (cover && !/^https:\/\//.test(cover)) errors.cover_image_url = 'Use an https:// image link.'
  const subtitle = optional(form.get('subtitle'))
  if (subtitle && subtitle.length > SUBTITLE_MAX) errors.subtitle = `Keep it under ${SUBTITLE_MAX} characters.`
  const layout: PageLayout = text(form.get('layout')) === 'sections' ? 'sections' : 'document'
  const sections = parseSections(form.get('sections'))
  // A page shown in sections needs them titled; the other layout's sections just wait, as they are
  if (layout === 'sections') {
    if (!sections.length) errors.sections = 'Add a section, or switch the layout to Whole page.'
    for (const s of sections) if (!s.title) errors[`section-${s.id}`] = 'Give this section a title.'
  }
  return done(errors, {
    title,
    slug,
    status,
    body: typeof form.get('body') === 'string' ? (form.get('body') as string) : '',
    excerpt: optional(form.get('excerpt')),
    description: optional(form.get('description')),
    subtitle,
    layout,
    sections,
    cover_image_url: cover,
  })
}


/** Downtown Atlanta, roughly: pins outside it are almost certainly a typo */
export const CAMPUS_BOUNDS = { lat: [33.7, 33.8], lng: [-84.43, -84.33] } as const

export function parsePlace(form: FormData) {
  const errors: FieldErrors = {}
  const name = text(form.get('name'))
  const category = text(form.get('category')) || 'student-life'
  const lat = Number(text(form.get('lat')))
  const lng = Number(text(form.get('lng')))
  if (!name) errors.name = 'Add a name.'
  if (!(category in PLACE_CATEGORIES)) errors.category = 'Pick a category.'
  if (!text(form.get('lat')) || !Number.isFinite(lat) || lat < CAMPUS_BOUNDS.lat[0] || lat > CAMPUS_BOUNDS.lat[1]) errors.lat = 'Use a latitude near campus, like 33.7531.'
  if (!text(form.get('lng')) || !Number.isFinite(lng) || lng < CAMPUS_BOUNDS.lng[0] || lng > CAMPUS_BOUNDS.lng[1]) errors.lng = 'Use a longitude near campus, like -84.3853.'
  return done(errors, {
    name,
    category,
    lat,
    lng,
    address: optional(form.get('address')),
    description: text(form.get('description')),
    published: form.get('published') === 'on',
  })
}

const inBounds = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= CAMPUS_BOUNDS.lat[0] && lat <= CAMPUS_BOUNDS.lat[1] && lng >= CAMPUS_BOUNDS.lng[0] && lng <= CAMPUS_BOUNDS.lng[1]

/** The map's buildings and spaces, whose ids an eatery's pins can't take */
const BUILDING_IDS = new Set(placesWithEateries([]).map((p) => p.id))

const json = (raw: FormDataEntryValue | null): unknown => {
  try {
    return typeof raw === 'string' && raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * A place to eat. Its slug (its map pin's id) is made from its name when it's added and kept
 * after, so links to it don't break on a rename. Hours and locations come as JSON from their
 * editors; a pin is optional, but takes both coordinates.
 */
export function parseEatery(form: FormData, existingSlug: string | null) {
  const errors: FieldErrors = {}
  const name = text(form.get('name'))
  const slug = existingSlug ?? slugify(text(form.get('slug')) || name)
  const area = text(form.get('area'))
  if (!name) errors.name = 'Add a name.'
  if (!existingSlug && !slug) errors.name = 'Add a name with letters or numbers in it.'
  if (!existingSlug && BUILDING_IDS.has(slug)) errors.name = 'A campus building already uses this name on the map; add a word to tell them apart.'
  if (!isEatArea(area)) errors.area = 'Pick an area.'

  const latText = text(form.get('lat'))
  const lngText = text(form.get('lng'))
  let lat: number | null = null
  let lng: number | null = null
  if (latText || lngText) {
    lat = Number(latText)
    lng = Number(lngText)
    if (!latText || !lngText || !inBounds(lat, lng)) errors.lat = 'Use coordinates near campus, like 33.7531, -84.3853, or leave both empty.'
  }

  const schedule = scheduleJson(parseSchedule(json(form.get('schedule'))))
  const rawLocations = json(form.get('locations'))
  const locations = (Array.isArray(rawLocations) ? rawLocations : []).flatMap((raw, i) => {
    if (!raw || typeof raw !== 'object') return []
    const l = raw as Record<string, unknown>
    const label = typeof l.label === 'string' ? l.label.trim() : ''
    const at = { lat: Number(l.lat), lng: Number(l.lng) }
    if (!label || !inBounds(at.lat, at.lng)) {
      errors.locations = `Location ${i + 1} needs a name and coordinates near campus.`
      return []
    }
    const id = typeof l.id === 'string' && /^[a-z0-9-]{1,80}$/.test(l.id) ? l.id : slugify(`${slug}-${label}`)
    return [{ id, label, ...at, schedule: scheduleJson(parseSchedule(l.schedule)) }]
  })
  if (locations.some((l) => BUILDING_IDS.has(l.id))) errors.locations = 'A location’s name matches a campus building on the map; rename it.'

  const url = optional(form.get('url'))
  if (url && !/^https?:\/\//.test(url)) errors.url = 'Use a full link, starting with https://.'
  const sort = Number(text(form.get('sort')) || 0)

  return done(errors, {
    slug,
    name,
    area,
    dining_hall: form.get('dining_hall') === 'on',
    address: text(form.get('address')),
    description: text(form.get('description')),
    hours: optional(form.get('hours')),
    schedule,
    status: optional(form.get('status')),
    note: optional(form.get('note')),
    lat,
    lng,
    locations,
    place_id: optional(form.get('place_id')),
    url,
    aliases: [...new Set(form.getAll('aliases').map((a) => text(a).toLowerCase()).filter(Boolean))],
    sort: Number.isInteger(sort) ? sort : 0,
    published: form.get('published') === 'on',
  })
}

export function parseSettings(form: FormData) {
  const errors: FieldErrors = {}
  const email = optional(form.get('contact_email'))?.toLowerCase() ?? null
  const instagram = optional(form.get('instagram_url'))
  if (email && !EMAIL.test(email)) errors.contact_email = 'That doesn’t look like an email address.'
  if (instagram && !/^https:\/\/(www\.)?instagram\.com\//.test(instagram)) errors.instagram_url = 'Use a link like https://instagram.com/cseg_gsu.'
  return done(errors, { tagline: optional(form.get('tagline')), meeting_info: optional(form.get('meeting_info')), contact_email: email, instagram_url: instagram })
}

export function parseOfficer(form: FormData) {
  const errors: FieldErrors = {}
  const email = text(form.get('email')).toLowerCase()
  const role = (text(form.get('role')) || 'officer') as OfficerRole
  if (!EMAIL.test(email)) errors.email = 'Add the Google email they sign in with.'
  if (role !== 'officer' && role !== 'admin') errors.role = 'Pick a role.'
  return done(errors, { email, role, name: optional(form.get('name')), title: optional(form.get('title')) })
}

/** Turns a pasted Google Maps or OpenStreetMap link (or "33.75, -84.38") into coordinates */
export const coordsFrom = (text: string): { lat: number; lng: number } | null => {
  const at = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? text.match(/[?&](?:q|query|mlat)=(-?\d+\.\d+)[,&](?:mlon=)?(-?\d+\.\d+)/) ?? text.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/)
  if (!at) return null
  const lat = Number(at[1])
  const lng = Number(at[2])
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

/** A path inside the site to go back to after signing in; anything else falls back to /dashboard */
export const safeNext = (next: string | null | undefined) =>
  next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/dashboard'
