import { slugify } from '@/components/Form/Slug/slugify'
import { atlantaToIso } from '@/lib/dashboard/format'
import { eventSlug } from '@/lib/events'
import { CONTACT_FIELDS, parseService } from '@/lib/executives'
import { PLACE_CATEGORIES, placesWithEateries } from '@/lib/data/places'
import { parseSchedule, scheduleJson } from '@/lib/eateries'
import { homepageErrors, homepageFrom, type HomeButton, type HomepageContent } from '@/lib/homepage'
import { BUILT_IN_PAGE_META, META_LIMITS } from '@/lib/pageMeta'
import { CARD_ICONS } from '@/lib/richtext/blocks/cards'
import { sectionId } from '@/lib/richtext/blocks/section'
import {
  POST_CATEGORIES,
  PAGE_SECTIONS_MAX,
  PAGE_EYEBROW_MAX as EYEBROW_MAX,
  PAGE_SUBTITLE_MAX as SUBTITLE_MAX,
  SECTION_TITLE_MAX,
  type BannerTone,
  type GuideKind,
  type NavPlacement,
  type ClubSettingsRow,
  type DuesMethod,
  type EventStatus,
  type ExecutiveRow,
  type MemberStatus,
  type MemberYear,
  type OfficerRole,
  type PageLayout,
  type PageSection,
  type PublishStatus,
  type SponsorTier,
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
const DATE = /^\d{4}-\d{2}-\d{2}$/

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

/**
 * Whether an address is on the public internet, as far as can be told from the address: a link
 * check shouldn't be a way to poke at the server's own network.
 */
export const isPublicUrl = (url: string) => {
  let host: string
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    host = parsed.hostname.toLowerCase()
  } catch {
    return false
  }
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || host.startsWith('[')) return false
  const ip = host.match(/^(\d+)\.(\d+)\.\d+\.\d+$/)
  if (!ip) return host.includes('.')
  const [a, b] = [Number(ip[1]), Number(ip[2])]
  return !(a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168))
}

/** Where the site's menu can list a page */
export const NAV_PLACEMENTS: readonly { value: NavPlacement; label: string }[] = [
  { value: 'none', label: 'Not in the menu' },
  { value: 'header', label: 'Top menu' },
  { value: 'footer', label: 'Footer' },
  { value: 'both', label: 'Top menu and footer' },
]
export const NAV_LABEL_MAX = 40

/** A tip's length, as the database checks it too */
export const TIP_MAX = 240

/** A short tip in a student's voice, on a place, an eatery, or a resource */
const parseTip = (form: FormData, errors: FieldErrors) => {
  const tip = optional(form.get('tip'))
  if (tip && tip.length > TIP_MAX) errors.tip = `Keep it under ${TIP_MAX} characters.`
  return tip
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
  // A page's extras: the label above its title, its link-preview image, what shows under the
  // title, and when it's live (sent as ISO times; the form converts from the officer's clock)
  const eyebrow = optional(form.get('eyebrow'))
  if (eyebrow && eyebrow.length > EYEBROW_MAX) errors.eyebrow = `Keep it under ${EYEBROW_MAX} characters.`
  const share = optional(form.get('share_image_url'))
  if (share && !/^https:\/\//.test(share)) errors.share_image_url = 'Use an https:// image link.'
  const when = (key: string) => {
    const v = optional(form.get(key))
    if (!v) return null
    const t = Date.parse(v)
    if (Number.isNaN(t)) {
      errors[key] = 'Pick a date and time.'
      return null
    }
    return new Date(t).toISOString()
  }
  const category = optional(form.get('category'))
  if (category && !POST_CATEGORIES.some((c) => c.value === category)) errors.category = 'Pick one of the categories.'
  // A page's place on the site: the page it sits under, and where the menu lists it
  const parent = optional(form.get('parent_id'))
  if (parent && !UUID.test(parent)) errors.parent_id = 'Pick one of the pages.'
  const placement = (text(form.get('nav_placement')) || 'none') as NavPlacement
  if (!NAV_PLACEMENTS.some((p) => p.value === placement)) errors.nav_placement = 'Pick where the menu lists it.'
  const navLabel = optional(form.get('nav_label'))
  if (navLabel && navLabel.length > NAV_LABEL_MAX) errors.nav_label = `Keep it under ${NAV_LABEL_MAX} characters.`
  const publishAt = when('publish_at')
  const unpublishAt = when('unpublish_at')
  if (publishAt && unpublishAt && unpublishAt <= publishAt) errors.unpublish_at = 'Take it down after it goes up.'
  return done(errors, {
    title,
    slug,
    status,
    eyebrow,
    share_image_url: share,
    show_toc: form.get('show_toc') === 'on',
    show_updated: form.get('show_updated') === 'on',
    parent_id: parent,
    nav_placement: placement,
    nav_label: navLabel,
    nav_sort: Math.trunc(Number(text(form.get('nav_sort')) || 0)) || 0,
    category,
    featured: form.get('featured') === 'on',
    review_requested: form.get('review_requested') === 'on',
    review_note: optional(form.get('review_note')),
    publish_at: publishAt,
    unpublish_at: unpublishAt,
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
    tip: parseTip(form, errors),
    published: form.get('published') === 'on',
  })
}

/** Whether a spot is near enough to campus for a pin (the database checks the same) */
export const inCampusBounds = (lat: number, lng: number) =>
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
  // Whether it's one of the areas, the database checks
  if (!area) errors.area = 'Pick an area.'

  const latText = text(form.get('lat'))
  const lngText = text(form.get('lng'))
  let lat: number | null = null
  let lng: number | null = null
  if (latText || lngText) {
    lat = Number(latText)
    lng = Number(lngText)
    if (!latText || !lngText || !inCampusBounds(lat, lng)) errors.lat = 'Use coordinates near campus, like 33.7531, -84.3853, or leave both empty.'
  }

  const schedule = scheduleJson(parseSchedule(json(form.get('schedule'))))
  const rawLocations = json(form.get('locations'))
  const locations = (Array.isArray(rawLocations) ? rawLocations : []).flatMap((raw, i) => {
    if (!raw || typeof raw !== 'object') return []
    const l = raw as Record<string, unknown>
    const label = typeof l.label === 'string' ? l.label.trim() : ''
    const at = { lat: Number(l.lat), lng: Number(l.lng) }
    if (!label || !inCampusBounds(at.lat, at.lng)) {
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
  const tip = parseTip(form, errors)

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
    checked_on: DATE.test(text(form.get('checked_on'))) ? text(form.get('checked_on')) : null,
    tip,
  })
}


/** A closure for a break or holiday: a label, a date range (both days in), and which eateries */
export function parseClosure(form: FormData) {
  const errors: FieldErrors = {}
  const label = text(form.get('label'))
  const [starts, ends] = form.getAll('dates').map(text)
  const eateries = [...new Set(form.getAll('eateries').map(text).filter(Boolean))]
  if (!label) errors.label = 'Say what it’s for, like winter break.'
  if (!starts || !ends || !DATE.test(starts) || !DATE.test(ends)) errors.dates = 'Pick the first and last days it’s closed.'
  else if (ends < starts) errors.dates = 'The last day comes after the first.'
  if (!eateries.length) errors.eateries = 'Pick at least one eatery.'
  return done(errors, { label, starts_on: starts, ends_on: ends, eateries })
}

/**
 * Groups (eatery areas, resource groups), in order, as the groups editor sends them: each its
 * slug (new ones have none), its words, and with `icons`, one of the card icons
 */
export function parseGroups(list: unknown, { icons = false } = {}) {
  const errors: FieldErrors = {}
  const rows = (Array.isArray(list) ? list : []).map((raw, i) => {
    const a = (raw ?? {}) as Record<string, unknown>
    const title = typeof a.title === 'string' ? a.title.trim() : ''
    const slug = typeof a.slug === 'string' && a.slug ? a.slug : slugify(title)
    if (!title) errors[`area-${i}`] = 'Give it a name.'
    else if (!slug) errors[`area-${i}`] = 'Use a name with letters or numbers in it.'
    const description = typeof a.description === 'string' && a.description.trim() ? a.description.trim() : null
    const icon = typeof a.icon === 'string' && a.icon in CARD_ICONS ? a.icon : ''
    return { slug, title, description, sort: (i + 1) * 10, ...(icons ? { icon } : {}) }
  })
  const seen = new Set<string>()
  rows.forEach((r, i) => {
    if (r.slug && seen.has(r.slug)) errors[`area-${i}`] = 'Another area has this name.'
    seen.add(r.slug)
  })
  if (!rows.length) errors.areas = 'Keep at least one.'
  return done(errors, rows)
}

/** A student resource: its name, group, link, words, and the map place it's in */
export function parseResource(form: FormData, existingSlug: string | null) {
  const errors: FieldErrors = {}
  const label = text(form.get('label'))
  const slug = existingSlug ?? slugify(label)
  const group = text(form.get('group_slug'))
  const href = text(form.get('href'))
  if (!label) errors.label = 'Add a name.'
  else if (!slug) errors.label = 'Use a name with letters or numbers in it.'
  // Whether it's one of the groups, the database checks
  if (!group) errors.group_slug = 'Pick a group.'
  if (!/^(https?:\/\/|mailto:|tel:|\/)/.test(href)) errors.href = 'Use a full link (https://…), an email (mailto:…), or a page here (/…).'
  return done(errors, {
    slug,
    label,
    group_slug: group,
    href,
    description: text(form.get('description')),
    place_id: optional(form.get('place_id')),
    tip: parseTip(form, errors),
    sort: Number(text(form.get('sort')) || 0) || 0,
    published: form.get('published') === 'on',
  })
}

/**
 * One of the club's events. Its times are typed on Atlanta's clock ("2026-04-23T14:00");
 * its id is made from its name and day the first time it's saved, and kept after.
 */
/** The most sessions one event keeps, and tags */
export const EVENT_SESSIONS_MAX = 20
export const EVENT_TAGS_MAX = 8

/**
 * One of the club's events. When it meets is its sessions, sent as JSON (each one's start
 * and end typed on Atlanta's clock, "2026-04-23T14:00", and its place), or a single
 * starts_at, ends_at, and location. Kept as the first start, the last end, and the first
 * place, with every session besides when there's more than one. Its id is made from its name
 * and first day the first time it's saved, and kept after.
 */
export function parseEvent(form: FormData, existingSlug: string | null) {
  const errors: FieldErrors = {}
  const name = text(form.get('name'))
  const href = optional(form.get('href'))
  const image = optional(form.get('image_url'))
  const online = optional(form.get('online_url'))
  const status = text(form.get('status')) || 'scheduled'
  if (!name) errors.name = 'Add a name.'
  if (href && !/^https?:\/\//.test(href)) errors.href = 'Use a full link (https://…).'
  if (image && !/^https:\/\//.test(image)) errors.image_url = 'Use an https:// image link.'
  if (online && !/^https?:\/\//.test(online)) errors.online_url = 'Use a full link (https://…), like a Teams or Zoom invite.'
  if (status !== 'scheduled' && status !== 'cancelled') errors.status = 'Pick whether it’s on or cancelled.'

  // Its sessions as typed, or its one time and place
  const listed = json(form.get('sessions'))
  const typed: { start?: unknown; end?: unknown; location?: unknown }[] = Array.isArray(listed)
    ? listed.filter((s) => s && typeof s === 'object')
    : [{ start: form.get('starts_at'), end: form.get('ends_at'), location: form.get('location') }]
  const sessions: { start: string; end: string; location: string | null }[] = []
  typed.slice(0, EVENT_SESSIONS_MAX).forEach((s, i) => {
    const start = atlantaToIso(typeof s.start === 'string' ? s.start.trim() : '')
    const end = atlantaToIso(typeof s.end === 'string' ? s.end.trim() : '')
    const key = Array.isArray(listed) ? `sessions.${i}` : null
    if (!start) errors[key ? `${key}.start` : 'starts_at'] = 'Pick the day and time it starts.'
    if (!end) errors[key ? `${key}.end` : 'ends_at'] = 'Pick the day and time it ends.'
    else if (start && Date.parse(end) <= Date.parse(start)) errors[key ? `${key}.end` : 'ends_at'] = 'It has to end after it starts.'
    if (start && end) sessions.push({ start, end, location: typeof s.location === 'string' ? s.location.trim() || null : null })
  })
  if (!typed.length) errors.sessions = 'Add when it is.'
  sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const first = sessions[0]
  const lastEnd = sessions.reduce((latest, s) => (Date.parse(s.end) > Date.parse(latest) ? s.end : latest), first?.end ?? '')

  const slug = existingSlug ?? (first ? eventSlug(name, first.start) : '')
  if (name && first && !slug) errors.name = 'Use a name with letters or numbers in it.'
  const tags = [...new Set(form.getAll('tags').map((t) => text(t).toLowerCase()).filter(Boolean))]
  if (tags.length > EVENT_TAGS_MAX) errors.tags = `Keep it to ${EVENT_TAGS_MAX} tags.`
  return done(errors, {
    slug,
    name,
    starts_at: first?.start ?? '',
    ends_at: lastEnd,
    location: first?.location ?? null,
    sessions: sessions.length > 1 ? sessions : [],
    description: text(form.get('description')),
    href,
    image_url: image,
    // Without a picture there's nothing to describe
    image_alt: image ? optional(form.get('image_alt')) : null,
    status: status as EventStatus,
    tags,
    online_url: online,
    published: form.get('published') === 'on',
  })
}

/** An executive: their name, office, words, when they served, and what they share */
export function parseExecutive(form: FormData) {
  const errors: FieldErrors = {}
  const first = text(form.get('first_name'))
  const last = text(form.get('last_name'))
  const role = text(form.get('role'))
  const avatar = optional(form.get('avatar_url'))
  const service = parseService(text(form.get('service')))
  if (!first) errors.first_name = 'Add their first name.'
  if (!last) errors.last_name = 'Add their last name.'
  if (!role) errors.role = 'Pick their office.'
  if (avatar && !/^https:\/\//.test(avatar)) errors.avatar_url = 'Use an https:// image link.'
  if (!service.ok) errors.service = service.error
  else if (!service.spans.length) errors.service = 'Add when they served, like 2025–present.'
  const contact: ExecutiveRow['contact'] = {}
  for (const { key, label } of CONTACT_FIELDS) {
    const value = optional(form.get(`contact.${key}`))
    if (!value) continue
    if (key === 'email' ? !EMAIL.test(value) : key === 'phone' ? (value.match(/\d/g)?.length ?? 0) < 10 : !/^https:\/\//.test(value))
      errors[`contact.${key}`] = key === 'email' ? 'That doesn’t look like an email address.' : key === 'phone' ? 'Use a phone number with its area code.' : `Use the full ${label} link (https://…).`
    contact[key] = key === 'email' ? value.toLowerCase() : value
  }
  return done(errors, {
    first_name: first,
    last_name: last,
    role,
    bio: text(form.get('bio')),
    is_founder: form.get('is_founder') === 'on',
    avatar_url: avatar,
    service: service.ok ? service.spans : [],
    contact,
    published: form.get('published') === 'on',
  })
}

/** "@leadteamgsu", or a link to the profile, as just the handle */
export const instagramHandleFrom = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')

/**
 * An affiliate. Its slug (its page's address) is made from its short name when it's added,
 * unless one is typed, and kept after, so links to its page don't break on a rename.
 */
export function parseAffiliate(form: FormData, existingSlug: string | null) {
  const errors: FieldErrors = {}
  const name = text(form.get('name'))
  const shortName = text(form.get('short_name')) || name
  const slug = existingSlug ?? slugify(text(form.get('slug')) || shortName)
  const top = text(form.get('wordmark_top'))
  const instagram = instagramHandleFrom(text(form.get('instagram')))
  const pinKey = optional(form.get('pin_key'))?.replace(/^https?:\/\/pin\.gsu\.edu\/organization\//i, '').replace(/\/.*$/, '') ?? null
  const logo = optional(form.get('logo_url'))
  const discord = optional(form.get('discord_url'))
  if (!name) errors.name = 'Add its full name.'
  if (!existingSlug && !slug) errors.short_name = 'Use a name with letters or numbers in it.'
  if (!top) errors.wordmark_top = 'Add the wordmark’s bold line, usually its name.'
  if (!/^[A-Za-z0-9._]{1,30}$/.test(instagram)) errors.instagram = 'Use its Instagram handle, like leadteamgsu.'
  if (pinKey && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(pinKey)) errors.pin_key = 'Use the end of its PIN link, like lead-team.'
  if (logo && !/^(https:\/\/|\/)/.test(logo)) errors.logo_url = 'Use an https:// image link.'
  if (discord && !/^https:\/\//.test(discord)) errors.discord_url = 'Use the full invite link (https://discord.gg/…).'
  return done(errors, {
    slug,
    name,
    short_name: shortName,
    wordmark_top: top,
    wordmark_bottom: text(form.get('wordmark_bottom')),
    summary: optional(form.get('summary')),
    description: text(form.get('description')),
    instagram,
    pin_key: pinKey,
    logo_url: logo,
    discord_url: discord,
    published: form.get('published') === 'on',
  })
}

/** The most points one connection's line keeps */
export const CONNECTION_POINTS_MAX = 50

/** "33.7525, -84.3866" a line, as [lat, lng] pairs; null if any line isn't one near campus */
export const parsePath = (value: string): [number, number][] | null => {
  const lines = value
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const path: [number, number][] = []
  for (const line of lines) {
    const m = line.match(/^\[?\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*\]?,?$/)
    if (!m) return null
    const lat = Number(m[1])
    const lng = Number(m[2])
    if (!inCampusBounds(lat, lng)) return null
    path.push([lat, lng])
  }
  return path
}

const optionalNumber = (v: FormDataEntryValue | null) => {
  const t = text(v)
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

/**
 * A skybridge, indoor link, or shortcut. Its slug (the id routes know it by) is made from its
 * name when it's added and kept after. Its line is one "lat, lng" a line, two points or more;
 * its ends, when it has them, are two of the map's buildings.
 */
export function parseConnection(form: FormData, existingSlug: string | null) {
  const errors: FieldErrors = {}
  const name = text(form.get('name'))
  const slug = existingSlug ?? slugify(name)
  const kind = text(form.get('kind'))
  const path = parsePath(text(form.get('path')))
  const ends = [...new Set(form.getAll('ends').map(text).filter(Boolean))]
  const halfWidth = optionalNumber(form.get('half_width'))
  const favor = optionalNumber(form.get('favor'))
  const penalty = optionalNumber(form.get('penalty'))
  const inOsm = form.get('in_osm') === 'on'
  if (!name) errors.name = 'Add a name.'
  else if (!slug) errors.name = 'Use a name with letters or numbers in it.'
  if (kind !== 'skybridge' && kind !== 'indoor' && kind !== 'shortcut') errors.kind = 'Pick what kind it is.'
  if (!path) errors.path = 'Each line takes one spot near campus, like 33.75252, -84.38667.'
  else if (path.length < 2) errors.path = 'Add at least two points: where it starts and where it ends.'
  else if (path.length > CONNECTION_POINTS_MAX) errors.path = `Use ${CONNECTION_POINTS_MAX} points or fewer.`
  if (ends.length !== 0 && ends.length !== 2) errors.ends = 'Pick the two buildings it joins, or none for an outdoor path.'
  else if (ends.some((id) => !BUILDING_IDS.has(id))) errors.ends = 'Pick buildings from the list.'
  if (halfWidth !== null && !(halfWidth > 0 && halfWidth <= 50)) errors.half_width = 'Use a width in meters, like 8.'
  if (favor !== null && !(favor > 0 && favor <= 2)) errors.favor = 'Use a number like 0.85 (under 1 to prefer it).'
  if (penalty !== null && !(penalty >= 0 && penalty <= 1000)) errors.penalty = 'Use extra meters, like 60, or leave it empty.'
  return done(errors, {
    slug,
    name,
    kind: kind as 'skybridge' | 'indoor' | 'shortcut',
    note: text(form.get('note')),
    path: path ?? [],
    in_osm: inOsm,
    half_width: inOsm ? halfWidth : null,
    favor,
    ends,
    stairs: form.get('stairs') === 'on',
    penalty,
    published: form.get('published') === 'on',
  })
}

/** How long each part of a message from the Contact page may be */
export const MESSAGE_LIMITS = { name: 120, subject: 160, body: 5000 } as const

/**
 * A message from the Contact page. `website` is a field people never see (it's hidden), so
 * a form that fills it in is a bot's: the caller drops the message without saying so.
 */
export function parseContactMessage(form: FormData) {
  const errors: FieldErrors = {}
  const name = text(form.get('name'))
  const email = text(form.get('email')).toLowerCase()
  const subject = optional(form.get('subject'))
  const body = text(form.get('body'))
  if (!name) errors.name = 'Add your name.'
  else if (name.length > MESSAGE_LIMITS.name) errors.name = `Keep your name under ${MESSAGE_LIMITS.name} characters.`
  if (!EMAIL.test(email) || email.length > 254) errors.email = 'Add an email address we can reply to.'
  if (subject && subject.length > MESSAGE_LIMITS.subject) errors.subject = `Keep the subject under ${MESSAGE_LIMITS.subject} characters.`
  if (!body) errors.body = 'Write your message.'
  else if (body.length > MESSAGE_LIMITS.body) errors.body = `Keep it under ${MESSAGE_LIMITS.body} characters.`
  return { ...done(errors, { name, email, subject, body }), bot: text(form.get('website')) !== '' }
}

/** The parts of Settings, each saved on its own (a form says which it is in `section`) */
export const SETTINGS_SECTIONS = ['details', 'links', 'banner', 'membership', 'contact', 'sharing', 'checkin'] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

export const BANNER_TONES: readonly BannerTone[] = ['info', 'success', 'warning']
/** The longest a notice, an after-sending line, and the site's description can be (the database checks the same) */
export const SETTINGS_LIMITS = { banner: 200, reply: 300, description: 300 } as const
/** The most a term's dues can be, in dollars */
export const DUES_MAX = 9999

type SettingsValues = Partial<Omit<ClubSettingsRow, 'id' | 'updated_at' | 'updated_by'>>

/** The other places the club is online: the settings column, and what its link looks like */
const LINK_FIELDS = [
  { key: 'x_url', example: 'https://x.com/cseg_gsu' },
  { key: 'pin_url', example: 'https://pin.gsu.edu/organization/cseg' },
  { key: 'groupme_url', example: 'https://groupme.com/join_group/…' },
  { key: 'linktree_url', example: 'https://linktr.ee/…' },
  { key: 'discord_url', example: 'https://discord.gg/…' },
  { key: 'linkedin_url', example: 'https://www.linkedin.com/company/…' },
  { key: 'youtube_url', example: 'https://www.youtube.com/@…' },
] as const

/** "12", "12.5", or "$12.50" as dollars and cents; NaN if it isn't an amount */
const dollars = (v: FormDataEntryValue | null) => {
  const t = text(v).replace(/^\$/, '')
  if (!t) return null
  return /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : NaN
}

/**
 * One part of Settings: only that part's fields come back, so saving the notice leaves the
 * club's details as they are. With no `section`, the club's details (as the form always was).
 */
export function parseSettings(form: FormData): Parsed<SettingsValues> {
  const errors: FieldErrors = {}
  const section = (text(form.get('section')) || 'details') as SettingsSection
  if (!SETTINGS_SECTIONS.includes(section)) return { ok: false, errors: { section: 'Couldn’t tell which settings these are; reload and try again.' } }
  const on = (key: string) => form.get(key) === 'on'

  if (section === 'details') {
    const email = optional(form.get('contact_email'))?.toLowerCase() ?? null
    const instagram = optional(form.get('instagram_url'))
    if (email && !EMAIL.test(email)) errors.contact_email = 'That doesn’t look like an email address.'
    if (instagram && !/^https:\/\/(www\.)?instagram\.com\//.test(instagram)) errors.instagram_url = 'Use a link like https://instagram.com/cseg_gsu.'
    return done(errors, { tagline: optional(form.get('tagline')), meeting_info: optional(form.get('meeting_info')), contact_email: email, instagram_url: instagram })
  }

  if (section === 'links') {
    const values: SettingsValues = {}
    for (const { key, example } of LINK_FIELDS) {
      const link = optional(form.get(key))
      if (link && !/^https:\/\//.test(link)) errors[key] = `Use the full link, like ${example}.`
      values[key] = link
    }
    return done(errors, values)
  }

  if (section === 'banner') {
    const message = optional(form.get('banner_message'))?.replace(/\s+/g, ' ') ?? null
    const href = optional(form.get('banner_href'))
    const tone = (text(form.get('banner_tone')) || 'info') as BannerTone
    const until = optional(form.get('banner_until'))
    if (message && message.length > SETTINGS_LIMITS.banner) errors.banner_message = `Keep it under ${SETTINGS_LIMITS.banner} characters.`
    if (href && !/^(https:\/\/|\/)/.test(href)) errors.banner_href = 'Use a page here (/events) or a full link (https://…).'
    if (!BANNER_TONES.includes(tone)) errors.banner_tone = 'Pick how it looks.'
    if (until && !DATE.test(until)) errors.banner_until = 'Pick its last day.'
    // Without words there's nothing to link or to end
    return done(errors, { banner_message: message, banner_href: message ? href : null, banner_tone: tone, banner_until: message ? until : null })
  }

  if (section === 'membership') {
    const amount = dollars(form.get('dues_amount'))
    if (amount !== null && !(amount >= 0 && amount <= DUES_MAX)) errors.dues_amount = 'Use an amount in dollars, like 15 or 12.50.'
    return done(errors, { accepting_members: on('accepting_members'), dues_amount: amount })
  }

  if (section === 'contact') {
    const reply = optional(form.get('contact_reply'))
    if (reply && reply.length > SETTINGS_LIMITS.reply) errors.contact_reply = `Keep it under ${SETTINGS_LIMITS.reply} characters.`
    return done(errors, { contact_form_open: on('contact_form_open'), contact_reply: reply })
  }

  if (section === 'sharing') {
    const description = optional(form.get('site_description'))?.replace(/\s+/g, ' ') ?? null
    const image = optional(form.get('share_image_url'))
    if (description && description.length > SETTINGS_LIMITS.description) errors.site_description = `Keep it under ${SETTINGS_LIMITS.description} characters.`
    if (image && !/^https:\/\//.test(image)) errors.share_image_url = 'Use an https:// image link.'
    return done(errors, { site_description: description, share_image_url: image })
  }

  // Guests who can't be checked in can't become members that way either
  const walkins = on('walkins_allowed')
  return done(errors, { walkins_allowed: walkins, walkins_become_members: walkins && on('walkins_become_members') })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A semester: its name and its first and last days, as the date range picker sends them */
export function parseTerm(form: FormData) {
  const errors: FieldErrors = {}
  const name = text(form.get('name'))
  const [starts, ends] = form.getAll('dates').map(text)
  if (!name) errors.name = 'Name it, like Fall 2026.'
  else if (name.length > 60) errors.name = 'Keep it under 60 characters.'
  if (!starts || !ends || !DATE.test(starts) || !DATE.test(ends)) errors.dates = 'Pick its first and last days.'
  else if (ends < starts) errors.dates = 'The last day comes after the first.'
  return done(errors, { name, starts_on: starts, ends_on: ends })
}

export const DUES_METHODS: readonly DuesMethod[] = ['cash', 'card', 'transfer', 'waived', 'other']

/** One member's dues for one term. Waived dues count as paid, at nothing. */
export function parseDues(form: FormData) {
  const errors: FieldErrors = {}
  const memberId = text(form.get('member_id'))
  const termId = text(form.get('term_id'))
  const method = (text(form.get('method')) || 'cash') as DuesMethod
  const amount = method === 'waived' ? 0 : dollars(form.get('amount'))
  const paidOn = text(form.get('paid_on'))
  if (!UUID.test(memberId)) errors.member_id = 'Pick a member.'
  if (!UUID.test(termId)) errors.term_id = 'Pick a term.'
  if (!DUES_METHODS.includes(method)) errors.method = 'Pick how they paid.'
  if (amount === null || !(amount >= 0 && amount <= DUES_MAX)) errors.amount = 'Use an amount in dollars, like 15 or 12.50.'
  if (paidOn && !DATE.test(paidOn)) errors.paid_on = 'Pick the day they paid.'
  return done(errors, { member_id: memberId, term_id: termId, amount: amount ?? 0, method, note: optional(form.get('note')), ...(paidOn ? { paid_on: paidOn } : {}) })
}

/** How long each part of a request to join may be */
export const JOIN_LIMITS = { name: 120, major: 120, message: 2000 } as const

/**
 * A request to join, from the Join page. `website` is hidden from people, as on the Contact
 * form: one that fills it in is a bot's, and is dropped without saying so.
 */
export function parseJoinRequest(form: FormData) {
  const errors: FieldErrors = {}
  const name = text(form.get('name'))
  const email = text(form.get('email')).toLowerCase()
  const major = optional(form.get('major'))
  const year = optional(form.get('year')) as MemberYear | null
  const message = optional(form.get('message'))
  if (!name) errors.name = 'Add your name.'
  else if (name.length > JOIN_LIMITS.name) errors.name = `Keep your name under ${JOIN_LIMITS.name} characters.`
  if (!EMAIL.test(email) || email.length > 254) errors.email = 'Add an email address we can reach you at.'
  if (major && major.length > JOIN_LIMITS.major) errors.major = `Keep it under ${JOIN_LIMITS.major} characters.`
  if (year && !YEARS.includes(year)) errors.year = 'Pick a year from the list.'
  if (message && message.length > JOIN_LIMITS.message) errors.message = `Keep it under ${JOIN_LIMITS.message} characters.`
  return { ...done(errors, { name, email, major, year, message }), bot: text(form.get('website')) !== '' }
}

/** An RSVP to one of the club's events, from the Events page (with the same hidden field for bots) */
export function parseRsvp(form: FormData) {
  const errors: FieldErrors = {}
  const eventId = text(form.get('event_id'))
  const name = text(form.get('name'))
  const email = text(form.get('email')).toLowerCase()
  if (!eventId) errors.event_id = 'Missing the event.'
  if (!name) errors.name = 'Add your name.'
  else if (name.length > 120) errors.name = 'Keep your name under 120 characters.'
  if (!EMAIL.test(email) || email.length > 254) errors.email = 'Add your email address.'
  return { ...done(errors, { event_id: eventId, name, email }), bot: text(form.get('website')) !== '' }
}

export const FAQ_LIMITS = { question: 200, answer: 2000 } as const

/** One of /about's common questions. Its answer can link words as [Join](/join). */
export function parseFaq(form: FormData) {
  const errors: FieldErrors = {}
  const question = text(form.get('question')).replace(/\s+/g, ' ')
  const answer = text(form.get('answer'))
  if (!question) errors.question = 'Add the question.'
  else if (question.length > FAQ_LIMITS.question) errors.question = `Keep it under ${FAQ_LIMITS.question} characters.`
  if (!answer) errors.answer = 'Add its answer.'
  else if (answer.length > FAQ_LIMITS.answer) errors.answer = `Keep it under ${FAQ_LIMITS.answer} characters.`
  return done(errors, { question, answer, published: form.get('published') === 'on' })
}

/** The campus guides a collection of picks can be featured on, and what each one's picks are made of */
export const GUIDE_KINDS: Record<GuideKind, { label: string; items: string; shown: string }> = {
  eat: { label: 'Places to eat', items: 'eateries', shown: 'At the top of Places to eat' },
  resources: { label: 'Resources', items: 'resources', shown: 'At the top of Resources' },
  map: { label: 'Campus map', items: 'places', shown: 'Under the campus map' },
}
export const PICK_LIMITS = { title: 80, description: 240, items: 12 } as const

/** A collection of picks: which guide, what it's called, and what's in it (ids, in order) */
export function parseGuidePick(form: FormData) {
  const errors: FieldErrors = {}
  const guide = text(form.get('guide')) as GuideKind
  const title = text(form.get('title')).replace(/\s+/g, ' ')
  const description = optional(form.get('description'))
  const icon = text(form.get('icon'))
  const items = [...new Set(form.getAll('items').map((i) => text(i)).filter(Boolean))]
  if (!Object.hasOwn(GUIDE_KINDS, guide)) errors.guide = 'Pick a guide.'
  if (!title) errors.title = 'Give it a name.'
  else if (title.length > PICK_LIMITS.title) errors.title = `Keep it under ${PICK_LIMITS.title} characters.`
  if (description && description.length > PICK_LIMITS.description) errors.description = `Keep it under ${PICK_LIMITS.description} characters.`
  if (!items.length) errors.items = 'Pick at least one.'
  else if (items.length > PICK_LIMITS.items) errors.items = `Keep it to ${PICK_LIMITS.items}; a short list is the point.`
  return done(errors, { guide, title, description, icon: Object.hasOwn(CARD_ICONS, icon) ? icon : 'star', items, published: form.get('published') === 'on' })
}

/** Addresses the site itself answers, which a redirect can't take over */
const RESERVED_PATHS = /^\/(dashboard|login|auth|og|_next|api)(\/|$)/

/** "/Welcome-Week/" or the whole link, as the path the site matches: "/welcome-week" */
export const redirectPathFrom = (value: string) => {
  let path = value.trim()
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname
  } catch {
    return ''
  }
  path = path.replace(/[?#].*$/, '').toLowerCase()
  if (!path.startsWith('/')) path = `/${path}`
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

/** An old address and where it goes now: a page here, or a full link elsewhere */
export function parseRedirect(form: FormData) {
  const errors: FieldErrors = {}
  const from = redirectPathFrom(text(form.get('from_path')))
  const to = text(form.get('to_path'))
  if (!/^\/[a-z0-9_-]+(\/[a-z0-9_-]+)*$/.test(from) || from.length > 200) errors.from_path = 'Use an address on this site, like /welcome-week.'
  else if (RESERVED_PATHS.test(from)) errors.from_path = 'That address belongs to the site itself.'
  if (!/^(https:\/\/|\/)/.test(to) || to.length > 500) errors.to_path = 'Use a page here (/events) or a full link (https://…).'
  else if (redirectPathFrom(to) === from && to.startsWith('/')) errors.to_path = 'That’s the same address.'
  return done(errors, { from_path: from, to_path: to, note: optional(form.get('note')) })
}

/** The record of a meeting: when, what it was, who came, and what was said */
export function parseMinutes(form: FormData) {
  const errors: FieldErrors = {}
  const heldOn = text(form.get('held_on'))
  const title = text(form.get('title'))
  const file = optional(form.get('file_url'))
  if (!DATE.test(heldOn)) errors.held_on = 'Pick the day it was held.'
  if (!title) errors.title = 'Name the meeting, like General body meeting.'
  else if (title.length > 160) errors.title = 'Keep it under 160 characters.'
  if (file && !/^https:\/\//.test(file)) errors.file_url = 'Use a full link (https://…).'
  return done(errors, {
    held_on: heldOn,
    title,
    attendees: [...new Set(form.getAll('attendees').map(text).filter(Boolean))],
    notes: text(form.get('notes')),
    file_url: file,
  })
}

export const SPONSOR_TIERS: readonly SponsorTier[] = ['presenting', 'partner', 'supporter']

/** A sponsor: who, their link and logo, their tier, and the days they're shown (either end can be open) */
export function parseSponsor(form: FormData) {
  const errors: FieldErrors = {}
  const name = text(form.get('name'))
  const href = optional(form.get('href'))
  const logo = optional(form.get('logo_url'))
  const tier = (text(form.get('tier')) || 'supporter') as SponsorTier
  const blurb = optional(form.get('blurb'))
  const starts = optional(form.get('starts_on'))
  const ends = optional(form.get('ends_on'))
  if (!name) errors.name = 'Add their name.'
  else if (name.length > 120) errors.name = 'Keep it under 120 characters.'
  if (href && !/^https:\/\//.test(href)) errors.href = 'Use a full link (https://…).'
  if (logo && !/^(https:\/\/|\/)/.test(logo)) errors.logo_url = 'Use an https:// image link.'
  if (!SPONSOR_TIERS.includes(tier)) errors.tier = 'Pick a tier.'
  if (blurb && blurb.length > 300) errors.blurb = 'Keep it under 300 characters.'
  if (starts && !DATE.test(starts)) errors.starts_on = 'Pick a day, or leave it empty.'
  if (ends && !DATE.test(ends)) errors.ends_on = 'Pick a day, or leave it empty.'
  else if (starts && ends && ends < starts) errors.ends_on = 'The last day comes after the first.'
  return done(errors, { name, href, logo_url: logo, tier, blurb, starts_on: starts, ends_on: ends, published: form.get('published') === 'on' })
}

/**
 * The homepage's words, sent as one JSON field. Read over the built-in copy (so nothing
 * is missing), trimmed, and checked field by field.
 */
export function parseHomepage(form: FormData): Parsed<HomepageContent> {
  const raw = json(form.get('content'))
  if (raw === null) return { ok: false, errors: { content: 'Couldn’t read the homepage; reload and try again.' } }
  const trimButton = (b: HomeButton | null) => (b ? { label: b.label.trim(), href: b.href.trim() } : null)
  const read = homepageFrom(raw)
  const content: HomepageContent = {
    hero: {
      eyebrow: read.hero.eyebrow.trim(),
      title: read.hero.title.trim(),
      lead: read.hero.lead.trim(),
      primary: trimButton(read.hero.primary) ?? read.hero.primary,
      secondary: trimButton(read.hero.secondary),
    },
    sections: read.sections.map((s) => ({
      ...s,
      name: s.name.trim(),
      eyebrow: s.eyebrow.trim(),
      title: s.title.trim(),
      lead: s.lead.trim(),
      cta: trimButton(s.cta),
      ...(s.quietTitle !== undefined ? { quietTitle: s.quietTitle.trim(), quietLead: (s.quietLead ?? '').trim() } : {}),
    })),
  }
  return done(homepageErrors(content), content)
}

/**
 * The built-in pages' tab titles and search descriptions, sent as one JSON list. One left
 * blank, or the same as the site's own, is saved as null, so it follows the site's own.
 */
export function parsePageMeta(form: FormData): Parsed<{ path: string; title: string | null; description: string | null }[]> {
  const raw = json(form.get('meta'))
  if (!Array.isArray(raw)) return { ok: false, errors: { meta: 'Couldn’t read the titles; reload and try again.' } }
  const errors: FieldErrors = {}
  const rows = BUILT_IN_PAGE_META.map((builtIn) => {
    const sent = raw.find((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && r.path === builtIn.path)
    const field = (key: 'title' | 'description') => {
      const v = sent?.[key]
      const value = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : ''
      if (value.length > META_LIMITS[key]) errors[`${builtIn.path}.${key}`] = `Keep it under ${META_LIMITS[key]} characters.`
      return value && value !== builtIn[key] ? value : null
    }
    return { path: builtIn.path, title: field('title'), description: field('description') }
  })
  return done(errors, rows)
}

/** From least access to most */
export const OFFICER_ROLES: readonly OfficerRole[] = ['editor', 'officer', 'admin']

export function parseOfficer(form: FormData) {
  const errors: FieldErrors = {}
  const email = text(form.get('email')).toLowerCase()
  const role = (text(form.get('role')) || 'officer') as OfficerRole
  if (!EMAIL.test(email)) errors.email = 'Add the Google email they sign in with.'
  if (!OFFICER_ROLES.includes(role)) errors.role = 'Pick a role.'
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
