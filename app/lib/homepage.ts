/**
 * The homepage, edited in the dashboard: the hero, and its sections in order (each can be
 * hidden), with what each holds: the offering cards, how many events show, the steps to
 * join (the Join page shows them too), and which ways to connect. The layout stays in code,
 * as do the events themselves and the social links (from Settings). Until officers save it,
 * or for anything a saved copy leaves out, the built-in words below are used.
 *
 * A lead can link words as [PIN](https://pin.gsu.edu/…) or [reach out](/contact).
 */
// Relative, so the seed script (scripts/seed-homepage.ts) can load this too
import { SOCIAL_LINKS } from '../globals/config/social'
import { CLUB_DESCRIPTION, HERO, SITE_NAME } from '../globals/config/site'

export type HomeButton = { label: string; href: string }

export type HomeSectionId = 'offerings' | 'events' | 'join' | 'connect'

/** A card (offerings) or a step (join): its words, and for a card, an icon by name (one of the card icons, or "" for none) */
export type HomeItem = { icon: string; title: string; body: string }

/** How many cards or steps a section can have, and how long their words can be */
export const HOME_ITEMS = { offerings: { min: 1, max: 8, noun: 'card' }, join: { min: 1, max: 6, noun: 'step' } } as const
export const HOME_ITEM_TITLE_MAX = 60
export const HOME_ITEM_BODY_MAX = 240
/** How many events the Events section can show */
export const HOME_EVENTS_MAX = 4
/** What the Connect section can show: each network (once it has a link in Settings), and the officers' email */
export const HOME_CONNECT_KEYS = ['instagram', 'x', 'pin', 'groupme', 'linktree', 'discord', 'linkedin', 'youtube', 'email'] as const

export const BUILT_IN_OFFERINGS: HomeItem[] = [
  { icon: 'compass', title: 'Campus know-how', body: 'Where to go, who to ask, and the tips upperclassmen wish they had known as freshmen.' },
  { icon: 'help', title: 'Student resources', body: 'Connect with GSU services for academics, wellness, finances, and everything in between.' },
  { icon: 'event', title: 'Events', body: 'Discussions, talent showcases, and meetups that make it easy to show up and get involved.' },
  { icon: 'people', title: 'Community', body: 'Meet other Panthers, make friends, and find your people on campus.' },
]

export const BUILT_IN_JOIN_STEPS: HomeItem[] = [
  { icon: '', title: 'Join on PIN', body: 'Request membership on our Panther Involvement Network page.' },
  { icon: '', title: 'Come to an event', body: 'Drop by a meeting or event and meet the officers and members.' },
  { icon: '', title: 'Get involved', body: 'Help plan events, share what you know, and grow with the group.' },
]

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
  /** Offerings: its cards. Join: its steps. */
  items?: HomeItem[]
  /** Events only: how many show (1 to HOME_EVENTS_MAX) */
  count?: number
  /** Events only: with nothing scheduled, the most recent show (otherwise just the words) */
  showPast?: boolean
  /** Connect only: the networks (or "email") left out */
  hidden?: string[]
}

/** A button in the hero: solid (the main one) or outlined */
export type HeroButton = HomeButton & { style: 'primary' | 'outline' }

/** A picture in the hero: an image, or one of a slideshow's. `alt` describes it; blank, it's decoration. */
export type HeroSlide = { src: string; alt: string }

/** What's behind the hero's words: nothing (the brand glow), a picture, a video, or pictures in turn */
export type HeroMediaKind = 'none' | 'image' | 'video' | 'slideshow'

/** Every kind's settings are kept, so switching kinds and back loses nothing; `kind` says which shows */
export type HeroMedia = {
  kind: HeroMediaKind
  image: HeroSlide
  /** A video file's address (mp4 or webm), and a picture shown before it plays, or instead of it when motion is reduced */
  video: { src: string; poster: string }
  slides: HeroSlide[]
  /** Seconds each slide shows */
  interval: number
}

export type HomeHero = {
  /** A short line above the title (optional) */
  eyebrow: string
  title: string
  /** A larger line right under the title (optional) */
  subtitle: string
  /** The description: a sentence or two under that, which can link words */
  lead: string
  buttons: HeroButton[]
  media: HeroMedia
}

export type HomepageContent = {
  hero: HomeHero
  sections: HomeSection[]
}

/** How many buttons and slides the hero can have, and how long each slide can show */
export const HERO_LIMITS = { buttons: 4, slides: { min: 2, max: 8 }, interval: { min: 3, max: 15 } } as const
const HERO_INTERVAL = 6

/** What each section shows under its words, for the dashboard */
export const HOME_SECTIONS: Record<HomeSectionId, { shows: string }> = {
  offerings: { shows: 'Cards on what the club offers.' },
  events: { shows: 'The next events from the Events list, or the most recent while none are scheduled.' },
  join: { shows: 'The steps to join. The Join page shows the same steps.' },
  connect: { shows: 'The club’s social links, as set in Settings, and its email.' },
}

export const BUILT_IN_HOMEPAGE: HomepageContent = {
  hero: {
    eyebrow: HERO.eyebrow,
    title: HERO.title,
    subtitle: '',
    lead: `${CLUB_DESCRIPTION.tagline} ${SITE_NAME} helps you navigate campus, discover underutilized resources, and make it all the way to graduation.`,
    buttons: [
      { label: 'Join CSEG →', href: '/join', style: 'primary' },
      { label: 'Follow on Instagram', href: SOCIAL_LINKS.instagram, style: 'outline' },
    ],
    media: { kind: 'none', image: { src: '', alt: '' }, video: { src: '', poster: '' }, slides: [], interval: HERO_INTERVAL },
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
      items: BUILT_IN_OFFERINGS,
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
      count: 2,
      showPast: true,
    },
    {
      id: 'join',
      name: 'Join us',
      shown: true,
      eyebrow: 'Join us',
      title: 'Getting started takes three steps',
      lead: 'Every Panther is welcome, whether it’s your first semester or your last.',
      cta: { label: 'How to join →', href: '/join' },
      items: BUILT_IN_JOIN_STEPS,
    },
    {
      id: 'connect',
      name: 'Connect',
      shown: true,
      eyebrow: 'Connect',
      title: 'Stay in the loop',
      lead: 'Follow us on social, or [reach out to the officers](/contact) with any questions.',
      cta: null,
      hidden: [],
    },
  ],
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback)
/** Saved cards or steps; anything that isn't one drops, and a list left with none falls back */
const itemsOf = (v: unknown, fallback: HomeItem[]): HomeItem[] => {
  if (!Array.isArray(v)) return fallback
  const read = v.filter(isObject).map((i) => ({ icon: str(i.icon, ''), title: str(i.title, ''), body: str(i.body, '') }))
  return read.length ? read : fallback
}
const button = (v: unknown, fallback: HomeButton | null): HomeButton | null => {
  if (v === null) return null
  if (!isObject(v)) return fallback
  return { label: str(v.label, fallback?.label ?? ''), href: str(v.href, fallback?.href ?? '') }
}

/**
 * The hero's buttons as saved. A copy from before the list (a main button and maybe a second)
 * becomes one: the main solid, the second outlined.
 */
const heroButtons = (h: Record<string, unknown>, fallback: HeroButton[]): HeroButton[] => {
  if (Array.isArray(h.buttons))
    return h.buttons
      .filter(isObject)
      .slice(0, HERO_LIMITS.buttons)
      .map((b) => ({ label: str(b.label, ''), href: str(b.href, ''), style: b.style === 'primary' ? 'primary' : 'outline' }))
  if (!('primary' in h) && !('secondary' in h)) return fallback
  const [main, second] = fallback
  const primary = button(h.primary, main) ?? main
  const secondary = 'secondary' in h ? button(h.secondary, second ?? null) : (second ?? null)
  return [{ ...primary, style: 'primary' }, ...(secondary ? [{ ...secondary, style: 'outline' as const }] : [])]
}

const slideOf = (v: unknown): HeroSlide => (isObject(v) ? { src: str(v.src, ''), alt: str(v.alt, '') } : { src: '', alt: '' })
const MEDIA_KINDS: readonly HeroMediaKind[] = ['none', 'image', 'video', 'slideshow']

/** What's behind the hero, as saved: each kind's settings kept, an unknown kind as none, and the interval in range */
const heroMedia = (v: unknown, fallback: HeroMedia): HeroMedia => {
  if (!isObject(v)) return fallback
  const video = isObject(v.video) ? v.video : {}
  const seconds = typeof v.interval === 'number' && Number.isFinite(v.interval) ? Math.round(v.interval) : fallback.interval
  return {
    kind: MEDIA_KINDS.includes(v.kind as HeroMediaKind) ? (v.kind as HeroMediaKind) : 'none',
    image: slideOf(v.image),
    video: { src: str(video.src, ''), poster: str(video.poster, '') },
    slides: Array.isArray(v.slides) ? v.slides.slice(0, HERO_LIMITS.slides.max).map(slideOf) : [],
    interval: Math.min(HERO_LIMITS.interval.max, Math.max(HERO_LIMITS.interval.min, seconds)),
  }
}

/** A picture or video address the site will load: https, or a path here */
export const isMediaSrc = (src: string) => /^https:\/\//i.test(src) || (src.startsWith('/') && !src.startsWith('//'))

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
    subtitle: str(h.subtitle, base.hero.subtitle),
    lead: str(h.lead, base.hero.lead),
    buttons: heroButtons(h, base.hero.buttons),
    media: heroMedia(h.media, base.hero.media),
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
      ...(fallback.items ? { items: itemsOf(s.items, fallback.items) } : {}),
      ...(fallback.count !== undefined
        ? {
            count: typeof s.count === 'number' && Number.isInteger(s.count) ? Math.min(HOME_EVENTS_MAX, Math.max(1, s.count)) : fallback.count,
            showPast: typeof s.showPast === 'boolean' ? s.showPast : fallback.showPast,
          }
        : {}),
      ...(fallback.hidden
        ? { hidden: Array.isArray(s.hidden) ? [...new Set(s.hidden.filter((k): k is string => (HOME_CONNECT_KEYS as readonly unknown[]).includes(k)))] : fallback.hidden }
        : {}),
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
  const most = (key: string, value: string, max: number) => {
    if (value.length > max) errors[key] = `Keep it under ${max} characters.`
  }
  const { hero } = c
  most('hero.eyebrow', hero.eyebrow, 60)
  need('hero.title', hero.title, 'a title', 80)
  most('hero.subtitle', hero.subtitle, 120)
  most('hero.lead', hero.lead, 300)
  leadLinks('hero.lead', hero.lead)
  if (hero.buttons.length > HERO_LIMITS.buttons) errors['hero.buttons'] = `Up to ${HERO_LIMITS.buttons} buttons.`
  hero.buttons.forEach((b, i) => link(`hero.buttons.${i}`, b))
  // Only what shows is checked: another kind's settings can wait half-done
  const picture = (key: string, s: HeroSlide, what: string) => {
    if (!s.src.trim()) errors[`${key}.src`] = `Add ${what}.`
    else if (!isMediaSrc(s.src.trim())) errors[`${key}.src`] = 'Use an https:// address, or upload one.'
    most(`${key}.alt`, s.alt, 200)
  }
  const { media } = hero
  if (media.kind === 'image') picture('hero.media.image', media.image, 'an image')
  if (media.kind === 'video') {
    const src = media.video.src.trim()
    if (!src) errors['hero.media.video.src'] = 'Add the video’s address.'
    else if (!isMediaSrc(src)) errors['hero.media.video.src'] = 'Use an https:// address.'
    else if (!/\.(mp4|webm)(\?|#|$)/i.test(src)) errors['hero.media.video.src'] = 'Use a video file ending in .mp4 or .webm (a YouTube page won’t play here).'
    if (media.video.poster.trim() && !isMediaSrc(media.video.poster.trim())) errors['hero.media.video.poster'] = 'Use an https:// address, or upload one.'
  }
  if (media.kind === 'slideshow') {
    if (media.slides.length < HERO_LIMITS.slides.min) errors['hero.media.slides'] = `Add at least ${HERO_LIMITS.slides.min} pictures.`
    else if (media.slides.length > HERO_LIMITS.slides.max) errors['hero.media.slides'] = `Up to ${HERO_LIMITS.slides.max} pictures.`
    media.slides.forEach((s, i) => picture(`hero.media.slides.${i}`, s, 'a picture'))
  }
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
    if (s.items && (s.id === 'offerings' || s.id === 'join')) {
      const { min, max, noun } = HOME_ITEMS[s.id]
      if (s.items.length < min) errors[`${s.id}.items`] = `Add at least ${min} ${noun}.`
      else if (s.items.length > max) errors[`${s.id}.items`] = `Up to ${max} ${noun}s.`
      s.items.forEach((item, i) => {
        need(`${s.id}.items.${i}.title`, item.title, 'a title', HOME_ITEM_TITLE_MAX)
        if (item.body.length > HOME_ITEM_BODY_MAX) errors[`${s.id}.items.${i}.body`] = `Keep it under ${HOME_ITEM_BODY_MAX} characters.`
      })
    }
  }
  if (!c.sections.some((s) => s.shown)) errors.sections = 'Show at least one section.'
  return errors
}
