/**
 * The executives on /executives. Edited in the dashboard (the executives table); the list in
 * (page)/executives/data is what the site shows until it has any.
 */
import type { Executive, ExecutiveContact } from '../(page)/executives/components/types'
import { OFFICER_TITLES } from './data/constitution'
import type { Database, ExecutiveRow, ServiceSpan } from './supabase/types'

/** The contact fields an executive can share, in the order the dashboard asks for them */
export const CONTACT_FIELDS: readonly { key: keyof ExecutiveContact; label: string; placeholder: string }[] = [
  { key: 'email', label: 'Email', placeholder: 'name@student.gsu.edu' },
  { key: 'phone', label: 'Phone', placeholder: '(404) 555-0123' },
  { key: 'linkedIn', label: 'LinkedIn', placeholder: 'https://www.linkedin.com/in/…' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://www.instagram.com/…' },
  { key: 'twitter', label: 'X', placeholder: 'https://x.com/…' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://www.facebook.com/…' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://www.youtube.com/@…' },
  { key: 'website', label: 'Website', placeholder: 'https://…' },
]

export const executiveFromRow = (row: ExecutiveRow): Executive => ({
  firstName: row.first_name,
  lastName: row.last_name,
  role: row.role,
  bio: row.bio,
  isFounder: row.is_founder,
  avatarSrc: row.avatar_url ?? undefined,
  serviceIntervals: row.service,
  contact: row.contact,
})

export const executiveToRow = (e: Executive): Database['public']['Tables']['executives']['Insert'] => ({
  first_name: e.firstName,
  last_name: e.lastName,
  role: e.role,
  bio: e.bio,
  is_founder: e.isFounder,
  avatar_url: e.avatarSrc ?? null,
  service: e.serviceIntervals,
  contact: e.contact ?? {},
  published: true,
})

const rank = (role: string) => {
  const i = (OFFICER_TITLES as readonly string[]).indexOf(role)
  return i < 0 ? OFFICER_TITLES.length : i
}
const lastServed = (e: Pick<Executive, 'serviceIntervals'>) => Math.max(0, ...e.serviceIntervals.map((s) => s.endYear ?? Infinity))

/** In the page's order: the most recently serving first, then by office as the constitution lists them, then by name */
export const sortExecutives = <T extends Pick<Executive, 'role' | 'lastName' | 'firstName' | 'serviceIntervals'>>(list: readonly T[]) =>
  [...list].sort(
    (a, b) => lastServed(b) - lastServed(a) || rank(a.role) - rank(b.role) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
  )

const YEAR = /^(19|20)\d{2}$/
const SPAN = /^(\d{4})\s*(?:[-–—]|to)\s*(\d{4}|present|now)?$/i

/**
 * When someone served, as typed: "2022–2024, 2025–present" (an open end, or "present", is
 * serving now; a lone year is that one year). The spans, oldest first, or an error to show.
 */
export const parseService = (text: string): { ok: true; spans: ServiceSpan[] } | { ok: false; error: string } => {
  const parts = text
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean)
  const spans: ServiceSpan[] = []
  for (const part of parts) {
    if (YEAR.test(part)) {
      spans.push({ startYear: Number(part), endYear: Number(part) })
      continue
    }
    const m = part.match(SPAN)
    if (!m || !YEAR.test(m[1]) || (m[2] && /^\d/.test(m[2]) && !YEAR.test(m[2]))) return { ok: false, error: `“${part}” isn’t a year or a span like 2024–2025.` }
    const start = Number(m[1])
    const end = m[2] && /^\d/.test(m[2]) ? Number(m[2]) : null
    if (end !== null && end < start) return { ok: false, error: `${part} ends before it starts.` }
    spans.push({ startYear: start, endYear: end })
  }
  spans.sort((a, b) => a.startYear - b.startYear)
  if (spans.filter((s) => s.endYear == null).length > 1) return { ok: false, error: 'Only one span can run on to now.' }
  return { ok: true, spans }
}

/** The spans as they're typed: "2022–2024, 2025–present" */
export const serviceText = (spans: readonly ServiceSpan[]) =>
  spans.map(({ startYear, endYear }) => (endYear === startYear ? `${startYear}` : `${startYear}–${endYear ?? 'present'}`)).join(', ')
