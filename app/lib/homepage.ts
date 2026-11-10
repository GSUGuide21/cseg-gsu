/**
 * The homepage's words, edited in the dashboard: the hero, and its sections in order (each
 * can be hidden). The layout stays in code; what each section shows (the offerings, the next
 * events, the join steps, the social links) does too. Until officers save it, or for anything
 * a saved copy leaves out, the built-in words below are used.
 *
 * A lead can link words as [PIN](https://pin.gsu.edu/…) or [reach out](/contact).
 */
// Relative, so the seed script (scripts/seed-homepage.ts) can load this too
import { SOCIAL_LINKS } from '../globals/config/social'
import { CLUB_DESCRIPTION, HERO, SITE_NAME } from '../globals/config/site'

export type HomeButton = { label: string; href: string }

export type HomeSectionId = 'offerings' | 'events' | 'join' | 'connect'

export type HomeSection = {
  id: HomeSectionId
  /** What officers call it in the dashboard */
  name: string
  shown: boolean
  eyebrow: string
  title: string
  lead: string
  /** The outline button under it; null for none */
  cta: HomeButton | null
  /** Events only: the title and lead while nothing's scheduled (recent events show instead) */
  quietTitle?: string
  quietLead?: string
}

export type HomepageContent = {
  hero: { eyebrow: string; title: string; lead: string; primary: HomeButton; secondary: HomeButton | null }
  sections: HomeSection[]
}

/** What each section shows under its words, for the dashboard */
export const HOME_SECTIONS: Record<HomeSectionId, { shows: string }> = {
  offerings: { shows: 'The four cards on what the club offers.' },
  events: { shows: 'The next two events from PIN, or the two most recent while none are scheduled.' },
  join: { shows: 'The three steps to join.' },
  connect: { shows: 'The club’s social links.' },
}

export const BUILT_IN_HOMEPAGE: HomepageContent = {
  hero: {
    eyebrow: HERO.eyebrow,
    title: HERO.title,
    lead: `${CLUB_DESCRIPTION.tagline} ${SITE_NAME} helps you navigate campus, discover underutilized resources, and make it all the way to graduation.`,
    primary: { label: 'Join CSEG →', href: '/join' },
    secondary: { label: 'Follow on Instagram', href: SOCIAL_LINKS.instagram },
  },
  sections: [
    {
      id: 'offerings',
      name: 'What we do',
      shown: true,
      eyebrow: 'What we do',
      title: 'Making Georgia State feel like home',
      lead: CLUB_DESCRIPTION.purpose,
      cta: { label: 'About CSEG →', href: '/about' },
    },
    {
      id: 'events',
      name: 'Events',
      shown: true,
      eyebrow: 'Events',
      title: 'Coming up',
      lead: `RSVP on [PIN](${SOCIAL_LINKS.pin}) and announced on Instagram.`,
      quietTitle: 'Show up, meet people, learn the ropes',
      quietLead: `Discussions, talent showcases, and more. Upcoming events are posted on [PIN](${SOCIAL_LINKS.pin}) and announced on Instagram.`,
      cta: { label: 'See all events →', href: '/events' },
    },
    {
      id: 'join',
      name: 'Join us',
      shown: true,
      eyebrow: 'Join us',
      title: 'Getting started takes three steps',
      lead: 'Every Panther is welcome, whether it’s your first semester or your last.',
      cta: { label: 'How to join →', href: '/join' },
    },
    {
      id: 'connect',
      name: 'Connect',
      shown: true,
      eyebrow: 'Connect',
      title: 'Stay in the loop',
      lead: 'Follow us on social, or [reach out to the officers](/contact) with any questions.',
      cta: null,
    },
  ],
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback)
const button = (v: unknown, fallback: HomeButton | null): HomeButton | null => {
  if (v === null) return null
  if (!isObject(v)) return fallback
  return { label: str(v.label, fallback?.label ?? ''), href: str(v.href, fallback?.href ?? '') }
}

/**
 * A saved copy over the built-in one: fields it has win, ones it doesn't fall back, sections
 * keep its order (any it doesn't list, a newer one say, go at the end), and unknown ones drop.
 */
export function homepageFrom(saved: unknown): HomepageContent {
  const base = BUILT_IN_HOMEPAGE
  if (!isObject(saved)) return base
  const h = isObject(saved.hero) ? saved.hero : {}
  const hero: HomepageContent['hero'] = {
    eyebrow: str(h.eyebrow, base.hero.eyebrow),
    title: str(h.title, base.hero.title),
    lead: str(h.lead, base.hero.lead),
    primary: button(h.primary, base.hero.primary) ?? base.hero.primary,
    secondary: 'secondary' in h ? button(h.secondary, base.hero.secondary) : base.hero.secondary,
  }
  const listed = Array.isArray(saved.sections) ? saved.sections.filter(isObject) : []
  const sections: HomeSection[] = []
  for (const s of listed) {
    const fallback = base.sections.find((b) => b.id === s.id)
    if (!fallback || sections.some((x) => x.id === fallback.id)) continue
    sections.push({
      ...fallback,
      name: str(s.name, fallback.name),
      shown: typeof s.shown === 'boolean' ? s.shown : fallback.shown,
      eyebrow: str(s.eyebrow, fallback.eyebrow),
      title: str(s.title, fallback.title),
      lead: str(s.lead, fallback.lead),
      cta: 'cta' in s ? button(s.cta, fallback.cta) : fallback.cta,
      ...(fallback.quietTitle !== undefined ? { quietTitle: str(s.quietTitle, fallback.quietTitle), quietLead: str(s.quietLead, fallback.quietLead ?? '') } : {}),
    })
  }
  for (const b of base.sections) if (!sections.some((s) => s.id === b.id)) sections.push(b)
  return { hero, sections }
}

/** A lead's [words](link) pieces, in order: plain text, or a link */
export type LeadPart = string | { text: string; href: string }

export function leadParts(lead: string): LeadPart[] {
  const parts: LeadPart[] = []
  let at = 0
  for (const m of lead.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    if (m.index > at) parts.push(lead.slice(at, m.index))
    parts.push({ text: m[1], href: m[2] })
    at = m.index + m[0].length
  }
  if (at < lead.length) parts.push(lead.slice(at))
  return parts
}

/** A link officers can use: a page here, a full https link, or an email */
export const isHomeHref = (href: string) => /^(\/(?!\/)|https:\/\/|mailto:)/.test(href)

/** Each field's problem, keyed by its path (hero.title, events.cta.href), for the form to show in place */
export function homepageErrors(c: HomepageContent): Record<string, string> {
  const errors: Record<string, string> = {}
  const need = (key: string, value: string, what: string, max: number) => {
    if (!value.trim()) errors[key] = `Add ${what}.`
    else if (value.length > max) errors[key] = `Keep it under ${max} characters.`
  }
  const link = (key: string, b: HomeButton | null) => {
    if (!b) return
    need(`${key}.label`, b.label, 'the button’s words', 40)
    if (!isHomeHref(b.href.trim())) errors[`${key}.href`] = 'Use a page here (/join), a full link (https://…), or an email (mailto:…).'
  }
  const leadLinks = (key: string, lead: string) => {
    if (errors[key]) return
    const bad = leadParts(lead).find((p) => typeof p !== 'string' && !isHomeHref(p.href))
    if (bad && typeof bad !== 'string') errors[key] = `“${bad.text}” links to ${bad.href}; use a page here (/…), https://…, or mailto:….`
  }
  need('hero.eyebrow', c.hero.eyebrow, 'a line above the title', 60)
  need('hero.title', c.hero.title, 'a title', 80)
  need('hero.lead', c.hero.lead, 'a line under the title', 300)
  leadLinks('hero.lead', c.hero.lead)
  link('hero.primary', c.hero.primary)
  link('hero.secondary', c.hero.secondary)
  for (const s of c.sections) {
    need(`${s.id}.name`, s.name, 'a name', 40)
    need(`${s.id}.eyebrow`, s.eyebrow, 'a label', 40)
    need(`${s.id}.title`, s.title, 'a title', 80)
    if (s.lead.length > 400) errors[`${s.id}.lead`] = 'Keep it under 400 characters.'
    leadLinks(`${s.id}.lead`, s.lead)
    link(`${s.id}.cta`, s.cta)
    if (s.quietTitle !== undefined) need(`${s.id}.quietTitle`, s.quietTitle, 'a title for when nothing’s scheduled', 80)
    if (s.quietLead !== undefined) {
      if (s.quietLead.length > 400) errors[`${s.id}.quietLead`] = 'Keep it under 400 characters.'
      leadLinks(`${s.id}.quietLead`, s.quietLead)
    }
  }
  if (!c.sections.some((s) => s.shown)) errors.sections = 'Show at least one section.'
  return errors
}
