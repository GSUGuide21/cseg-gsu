/**
 * What frames every page, kept as data so the dashboard can change it: the Navigation (the
 * site's menus), the Header and Footer (which each have places a menu goes, as a WordPress
 * theme has menu locations), and Search (the search page's words). The layout stays in
 * code. Until officers save a part, or for anything a saved copy leaves out, the built-in
 * copy below is used.
 *
 * Each part has its type, its built-in copy, a reader (a saved copy over the built-in one),
 * and a checker (each field's problem, keyed by its path, for a form to show in place).
 */
// Relative, so scripts can load this too
import { FOOTER_NAV_SECTIONS, NAV_LINKS, type FooterNavSection, type NavItem, type NavLink, type NavMenuLink } from '../globals/config/nav'
import { isHomeHref, type HomeButton } from './homepage'

/** A menu: a named list of links, put on the site by giving it to a location */
export type NavMenu = {
  /** What locations point at; kept when the menu is renamed */
  id: string
  /** What officers call it, and its heading where a location shows one (a footer column) */
  name: string
  /** In order; one with a `menu` opens links under it (where the location shows them) */
  links: NavItem[]
}

export type NavigationContent = { menus: NavMenu[] }

export type HeaderContent = {
  /** Location: the menu across the top (a menu's id) */
  menu: string
  /** The search button */
  search: boolean
  /** The light and dark switch */
  themeToggle: boolean
  /** The button after the menu (its page is left out of the desktop menu); null for none */
  cta: HomeButton | null
}

export type FooterContent = {
  /** Location: the link columns, a menu each, in order (pages officers list in the footer follow, under More) */
  columns: string[]
  /** Location: the small links in the bottom bar; null for none */
  bottom: string | null
  /** The card across the top */
  cta: { shown: boolean; eyebrow: string; title: string; text: string; button: HomeButton | null }
}

export type SearchContent = {
  /** The search page's heading and the line under it */
  title: string
  lead: string
  placeholder: string
  /** Shown when a search finds nothing */
  emptyTitle: string
  emptyText: string
  /** Searches to offer before anything's typed */
  suggestions: string[]
}

export type SiteChrome = { navigation: NavigationContent; header: HeaderContent; footer: FooterContent; search: SearchContent }

export type ChromePart = keyof SiteChrome

export const CHROME_PARTS: Record<ChromePart, { name: string; holds: string }> = {
  navigation: { name: 'Navigation', holds: 'The site’s menus. A menu shows on the site once the Header or Footer gives it a place.' },
  search: { name: 'Search', holds: 'The search page’s words and suggested searches.' },
  header: { name: 'Header', holds: 'The top of every page: which menu it shows, and what sits beside it.' },
  footer: { name: 'Footer', holds: 'The bottom of every page: which menus make its columns, and the card above them.' },
}

export const isChromePart = (v: unknown): v is ChromePart => typeof v === 'string' && Object.hasOwn(CHROME_PARTS, v)

/** The places a menu can go, for the dashboard to name */
export const MENU_LOCATIONS = {
  'header.menu': { part: 'header', name: 'Main menu', holds: 'Across the top of every page. Links under an item open as a panel on wide screens.' },
  'footer.columns': { part: 'footer', name: 'Link columns', holds: 'Each menu is a column, under its name. Links under an item aren’t shown here.' },
  'footer.bottom': { part: 'footer', name: 'Bottom bar', holds: 'Small links on the last line, beside the copyright.' },
} as const

const MAIN_MENU = 'main'
const footerMenuId = (title: string) => `footer-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`

export const BUILT_IN_CHROME: SiteChrome = {
  navigation: {
    menus: [
      { id: MAIN_MENU, name: 'Main menu', links: NAV_LINKS.map((l) => ({ ...l })) },
      ...FOOTER_NAV_SECTIONS.map((s) => ({ id: footerMenuId(s.title), name: s.title, links: s.links.map((l) => ({ ...l })) })),
    ],
  },
  header: { menu: MAIN_MENU, search: true, themeToggle: true, cta: { label: 'Join', href: '/join' } },
  footer: {
    columns: FOOTER_NAV_SECTIONS.map((s) => footerMenuId(s.title)),
    bottom: null,
    cta: {
      shown: true,
      eyebrow: 'Open to all Panthers',
      title: 'New to campus?',
      text: 'We’ll help you find your way around, find your people, and find the resources you need.',
      button: { label: 'Join CSEG →', href: '/join' },
    },
  },
  search: {
    title: 'Find it on the site',
    lead: 'Posts, pages, campus resources, and places to eat.',
    placeholder: 'Try “financial aid” or “late night food”',
    emptyTitle: 'Nothing found',
    emptyText: 'Try a shorter search, or different words.',
    suggestions: [],
  },
}

// ── Reading a saved copy ────────────────────────────────────────────────────

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback)
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
const button = (v: unknown, fallback: HomeButton | null): HomeButton | null => {
  if (v === null) return null
  if (!isObject(v)) return fallback
  return { label: str(v.label, fallback?.label ?? ''), href: str(v.href, fallback?.href ?? '') }
}

const menuLinks = (v: unknown): NavMenuLink[] =>
  Array.isArray(v)
    ? v.filter(isObject).map((l) => ({ href: str(l.href, ''), label: str(l.label, ''), ...(typeof l.description === 'string' && l.description ? { description: l.description } : {}) }))
    : []

/** The links in a saved menu: anything that isn't a link drops, and so does a set of sub-links with nothing in it */
const navItems = (v: unknown): NavItem[] =>
  Array.isArray(v)
    ? v.filter(isObject).map((l): NavItem => {
        const sub = isObject(l.menu) ? menuLinks(l.menu.links) : []
        return { href: str(l.href, ''), label: str(l.label, ''), ...(isObject(l.menu) && sub.length ? { menu: { description: str(l.menu.description, ''), links: sub } } : {}) }
      })
    : []

/** Saved menus replace the built-in ones whole (they're the officers' now); none saved keeps the built-in */
export function navigationFrom(saved: unknown): NavigationContent {
  const base = BUILT_IN_CHROME.navigation
  if (!isObject(saved) || !Array.isArray(saved.menus)) return base
  const menus: NavMenu[] = []
  for (const m of saved.menus.filter(isObject)) {
    // A menu needs an id of its own for a location to point at
    if (typeof m.id !== 'string' || !m.id || menus.some((x) => x.id === m.id)) continue
    menus.push({ id: m.id, name: str(m.name, ''), links: navItems(m.links) })
  }
  return menus.length ? { menus } : base
}

export function headerFrom(saved: unknown): HeaderContent {
  const base = BUILT_IN_CHROME.header
  if (!isObject(saved)) return base
  return {
    menu: str(saved.menu, base.menu),
    search: bool(saved.search, base.search),
    themeToggle: bool(saved.themeToggle, base.themeToggle),
    cta: 'cta' in saved ? button(saved.cta, base.cta) : base.cta,
  }
}

/** Saved columns replace the built-in ones whole (none is a footer without link columns); the card's fields fall back one by one */
export function footerFrom(saved: unknown): FooterContent {
  const base = BUILT_IN_CHROME.footer
  if (!isObject(saved)) return base
  const c = isObject(saved.cta) ? saved.cta : {}
  return {
    columns: Array.isArray(saved.columns) ? saved.columns.filter((id): id is string => typeof id === 'string' && !!id) : base.columns,
    bottom: 'bottom' in saved ? (typeof saved.bottom === 'string' && saved.bottom ? saved.bottom : null) : base.bottom,
    cta: {
      shown: bool(c.shown, base.cta.shown),
      eyebrow: str(c.eyebrow, base.cta.eyebrow),
      title: str(c.title, base.cta.title),
      text: str(c.text, base.cta.text),
      button: 'button' in c ? button(c.button, base.cta.button) : base.cta.button,
    },
  }
}

export function searchFrom(saved: unknown): SearchContent {
  const base = BUILT_IN_CHROME.search
  if (!isObject(saved)) return base
  return {
    title: str(saved.title, base.title),
    lead: str(saved.lead, base.lead),
    placeholder: str(saved.placeholder, base.placeholder),
    emptyTitle: str(saved.emptyTitle, base.emptyTitle),
    emptyText: str(saved.emptyText, base.emptyText),
    suggestions: Array.isArray(saved.suggestions) ? saved.suggestions.filter((s): s is string => typeof s === 'string') : base.suggestions,
  }
}

const READERS: { [P in ChromePart]: (saved: unknown) => SiteChrome[P] } = { navigation: navigationFrom, header: headerFrom, footer: footerFrom, search: searchFrom }

/** One part, a saved copy over the built-in one */
export const chromePartFrom = <P extends ChromePart>(part: P, saved: unknown): SiteChrome[P] => READERS[part](saved)

/** All four, from the saved row (each part its own column) */
export function siteChromeFrom(saved: unknown): SiteChrome {
  const row = isObject(saved) ? saved : {}
  return { navigation: navigationFrom(row.navigation), header: headerFrom(row.header), footer: footerFrom(row.footer), search: searchFrom(row.search) }
}

// ── What each location shows ────────────────────────────────────────────────

export const menuById = (navigation: NavigationContent, id: string | null): NavMenu | undefined => (id ? navigation.menus.find((m) => m.id === id) : undefined)

/** The header's menu; the built-in one if the menu it was given is gone, so the site always has a way around */
export const headerLinks = (chrome: Pick<SiteChrome, 'navigation' | 'header'>): readonly NavItem[] => (menuById(chrome.navigation, chrome.header.menu) ?? BUILT_IN_CHROME.navigation.menus[0]).links

const flat = (links: readonly NavItem[]): NavLink[] => links.map(({ href, label }) => ({ href, label }))

/** The footer's columns, a menu each under its name; one whose menu is gone, or has no links, is left out */
export const footerColumns = (chrome: Pick<SiteChrome, 'navigation' | 'footer'>): FooterNavSection[] =>
  chrome.footer.columns.flatMap((id) => {
    const menu = menuById(chrome.navigation, id)
    return menu?.links.length ? [{ title: menu.name, links: flat(menu.links) }] : []
  })

/** The footer's bottom bar links, if it has a menu */
export const footerBottomLinks = (chrome: Pick<SiteChrome, 'navigation' | 'footer'>): NavLink[] => flat(menuById(chrome.navigation, chrome.footer.bottom)?.links ?? [])

/** Where a menu shows: "Header: Main menu", "Footer: Link columns" */
export const menuUses = (chrome: Pick<SiteChrome, 'header' | 'footer'>, id: string): string[] => [
  ...(chrome.header.menu === id ? [`Header: ${MENU_LOCATIONS['header.menu'].name}`] : []),
  ...(chrome.footer.columns.includes(id) ? [`Footer: ${MENU_LOCATIONS['footer.columns'].name}`] : []),
  ...(chrome.footer.bottom === id ? [`Footer: ${MENU_LOCATIONS['footer.bottom'].name}`] : []),
]

/** The menus a part's locations point at that aren't there (any more), by the field that names them */
export function missingMenus<P extends 'header' | 'footer'>(part: P, content: SiteChrome[P], navigation: NavigationContent): Record<string, string> {
  const gone = (id: string | null) => !!id && !menuById(navigation, id)
  const errors: Record<string, string> = {}
  if (part === 'header') {
    if (gone((content as HeaderContent).menu)) errors.menu = 'That menu isn’t there any more; pick another.'
  } else {
    const footer = content as FooterContent
    footer.columns.forEach((id, i) => {
      if (gone(id)) errors[`columns.${i}`] = 'That menu isn’t there any more; pick another or remove the column.'
    })
    if (gone(footer.bottom)) errors.bottom = 'That menu isn’t there any more; pick another, or none.'
  }
  return errors
}

// ── Checking what officers save ─────────────────────────────────────────────

export const CHROME_LIMITS = { menus: 12, links: 12, subLinks: 8, footerColumns: 6, suggestions: 8 } as const

type Errors = Record<string, string>

const HREF_HELP = 'Use a page here (/join), a full link (https://…), or an email (mailto:…).'
const MENU_ID = /^[a-z0-9][a-z0-9-]{0,59}$/

const need = (errors: Errors, key: string, value: string, what: string, max: number) => {
  if (!value.trim()) errors[key] = `Add ${what}.`
  else if (value.length > max) errors[key] = `Keep it under ${max} characters.`
}
const optional = (errors: Errors, key: string, value: string, max: number) => {
  if (value.length > max) errors[key] = `Keep it under ${max} characters.`
}
const checkLink = (errors: Errors, key: string, link: NavLink, labelMax = 40) => {
  need(errors, `${key}.label`, link.label, 'the link’s words', labelMax)
  if (!isHomeHref(link.href.trim())) errors[`${key}.href`] = HREF_HELP
}
const checkButton = (errors: Errors, key: string, b: HomeButton | null) => {
  if (b) checkLink(errors, key, b)
}

export function navigationErrors(c: NavigationContent): Errors {
  const errors: Errors = {}
  if (!c.menus.length) errors.menus = 'Keep at least one menu.'
  else if (c.menus.length > CHROME_LIMITS.menus) errors.menus = `Keep it to ${CHROME_LIMITS.menus} menus.`
  c.menus.forEach((menu, m) => {
    const at = `menus.${m}`
    need(errors, `${at}.name`, menu.name, 'a name', 40)
    if (!MENU_ID.test(menu.id) || c.menus.findIndex((x) => x.id === menu.id) !== m) errors[at] = 'Couldn’t read this menu; reload and try again.'
    if (menu.links.length > CHROME_LIMITS.links) errors[`${at}.links`] = `Keep a menu to ${CHROME_LIMITS.links} links; the rest fit under one of them.`
    menu.links.forEach((l, i) => {
      checkLink(errors, `${at}.links.${i}`, l)
      if (!l.menu) return
      optional(errors, `${at}.links.${i}.menu.description`, l.menu.description, 160)
      if (l.menu.links.length > CHROME_LIMITS.subLinks) errors[`${at}.links.${i}.menu`] = `Keep it to ${CHROME_LIMITS.subLinks} links under “${l.label}”.`
      l.menu.links.forEach((s, j) => {
        checkLink(errors, `${at}.links.${i}.menu.links.${j}`, s)
        optional(errors, `${at}.links.${i}.menu.links.${j}.description`, s.description ?? '', 120)
      })
    })
  })
  return errors
}

export function headerErrors(c: HeaderContent): Errors {
  const errors: Errors = {}
  if (!c.menu) errors.menu = 'Pick a menu.'
  checkButton(errors, 'cta', c.cta)
  return errors
}

export function footerErrors(c: FooterContent): Errors {
  const errors: Errors = {}
  if (c.columns.length > CHROME_LIMITS.footerColumns) errors.columns = `Keep it to ${CHROME_LIMITS.footerColumns} columns.`
  c.columns.forEach((id, i) => {
    if (c.columns.indexOf(id) !== i) errors[`columns.${i}`] = 'That menu is already a column.'
  })
  if (c.cta.shown) {
    optional(errors, 'cta.eyebrow', c.cta.eyebrow, 40)
    need(errors, 'cta.title', c.cta.title, 'a title', 60)
    optional(errors, 'cta.text', c.cta.text, 200)
  }
  checkButton(errors, 'cta.button', c.cta.button)
  return errors
}

export function searchErrors(c: SearchContent): Errors {
  const errors: Errors = {}
  need(errors, 'title', c.title, 'a title', 80)
  optional(errors, 'lead', c.lead, 200)
  optional(errors, 'placeholder', c.placeholder, 80)
  need(errors, 'emptyTitle', c.emptyTitle, 'a title for when nothing’s found', 60)
  optional(errors, 'emptyText', c.emptyText, 200)
  if (c.suggestions.length > CHROME_LIMITS.suggestions) errors.suggestions = `Keep it to ${CHROME_LIMITS.suggestions} suggestions.`
  c.suggestions.forEach((s, i) => need(errors, `suggestions.${i}`, s, 'a search, or remove it', 40))
  return errors
}

const CHECKERS: { [P in ChromePart]: (content: SiteChrome[P]) => Errors } = { navigation: navigationErrors, header: headerErrors, footer: footerErrors, search: searchErrors }

/** One part's problems, keyed by field path (menus.0.links.2.label, cta.button.href) */
export const chromePartErrors = <P extends ChromePart>(part: P, content: SiteChrome[P]): Errors => CHECKERS[part](content)
