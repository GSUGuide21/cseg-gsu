/**
 * References: a block that points at things already on the site (an eatery, an area's
 * eateries, a map place, a resource, a group's resources, a post, or a page) and draws them
 * as live cards, so a page never holds a copy that goes stale. Saved as which kind and which
 * one (its id, slug, area, or group); what it shows is looked up where the page is drawn.
 */
import type { ClubEvent } from './data/events'
import { placesWithEateries, mapHref, type Place } from './data/places'
import { EATERY_KINDS, eateriesIn, findArea, type EatArea, type Eatery, type EateryArea, type EateryKind } from './eateries'
import type { Schedule } from './hours'
import { resourcesIn, type Resource, type ResourceGroup } from './resources'
import { pageHref } from './sitePages'

export type ReferenceKind = 'eateries' | 'eatery' | 'place' | 'resources' | 'resource' | 'post' | 'page'

export const REFERENCE_KINDS: Record<ReferenceKind, string> = {
  eateries: 'Eateries in an area',
  eatery: 'Eatery',
  place: 'Map place',
  resources: 'Resources in a group',
  resource: 'Resource',
  post: 'Post',
  page: 'Page',
}

export type ReferenceItem = { kind: ReferenceKind; ref: string }

export const REFERENCES_MAX = 6

const isKind = (value: unknown): value is ReferenceKind => typeof value === 'string' && Object.hasOwn(REFERENCE_KINDS, value)

/** Saved references, dropping any that aren't one, and repeats */
export const parseReferences = (value: unknown): ReferenceItem[] => {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value
    .flatMap((raw): ReferenceItem[] => {
      if (!raw || typeof raw !== 'object') return []
      const { kind, ref } = raw as Record<string, unknown>
      if (!isKind(kind) || typeof ref !== 'string' || !ref.trim() || ref.length > 500) return []
      const key = `${kind}:${ref}`
      if (seen.has(key)) return []
      seen.add(key)
      return [{ kind, ref: ref.trim() }]
    })
    .slice(0, REFERENCES_MAX)
}

// ── An area's eateries ───────────────────────────────────────────────────────

/** An area's eateries as a reference: "campus", or "campus:dining-halls" for some of them */
export const eateriesRef = (area: EatArea, kind: EateryKind = 'all') => (kind === 'all' ? area : `${area}:${kind}`)

/** An area's eateries reference read back; null when the area's gone or it isn't one */
const readEateriesRef = (ref: string, areas: readonly EateryArea[]): { area: EateryArea; kind: EateryKind } | null => {
  const [slug, kind = 'all'] = ref.split(':')
  const area = findArea(areas, slug)
  return area && Object.hasOwn(EATERY_KINDS, kind) ? { area, kind: kind as EateryKind } : null
}

// ── Looking them up ──────────────────────────────────────────────────────────

/** What's published on the site that references can point at */
export type SiteContent = {
  eateries: readonly Eatery[]
  /** The areas eateries are grouped in, in the page's order */
  areas: readonly EateryArea[]
  resources: readonly Resource[]
  /** The groups resources are in, in the page's order */
  resourceGroups: readonly ResourceGroup[]
  posts: readonly { slug: string; title: string; excerpt: string | null }[]
  pages: readonly { slug: string; title: string; description: string | null; subtitle: string | null }[]
  /** Upcoming events (PIN's and the club's), soonest first, for the Upcoming events block */
  events?: readonly ClubEvent[]
  /** Past events, newest first, for the block when nothing's coming up and for chips to ones that have ended */
  pastEvents?: readonly ClubEvent[]
}

export const NO_SITE_CONTENT: SiteContent = { eateries: [], areas: [], resources: [], resourceGroups: [], posts: [], pages: [] }

/** The map's buildings and spaces, by id (eateries are a kind of their own) */
const BUILDING_IDS = new Set(placesWithEateries([]).map((p) => p.id))
/** The map's buildings and spaces, with dining halls' hours from these eateries */
const placesFor = (content: SiteContent) => placesWithEateries(content.eateries).filter((p) => BUILDING_IDS.has(p.id))

/** A thing drawn as a card of the general kind */
export type CardResolved = {
  kind: Exclude<ReferenceKind, 'eatery' | 'eateries' | 'resources'>
  /** Above the title: "Map place", "Resource · Money & aid" */
  label: string
  title: string
  text: string
  href: string
  /** For "Open now" */
  schedule?: Schedule
  /** "Show on map", for a resource in a building */
  mapHref?: string
  /** One of the card icons, in place of the kind's own (a resource's group's) */
  icon?: string
  /** A short tip in a student's voice, under the text */
  tip?: string
  /** Which of the guides' colors its icon takes: a resource's group's place in the page's order */
  accent?: number
}

/** A referenced thing, ready to draw: eateries' own cards, or cards of the general kind */
export type Resolved =
  | { kind: 'eatery'; eatery: Eatery }
  /** An area's eateries, as they are now (none yet is still the area) */
  | { kind: 'eateries'; title: string; eateries: readonly Eatery[] }
  /** A group's resources, likewise */
  | { kind: 'resources'; title: string; cards: readonly CardResolved[] }
  | CardResolved

const placeCard = (p: Place): CardResolved => ({ kind: 'place', label: REFERENCE_KINDS.place, title: p.name, text: p.address ? `${p.address}. ${p.description}` : p.description, href: mapHref(p), schedule: p.schedule, tip: p.tip })

const resourceCard = (r: Resource, content: SiteContent): CardResolved => {
  const group = content.resourceGroups.find((g) => g.slug === r.group)
  const place = r.placeId ? placesFor(content).find((p) => p.id === r.placeId) : undefined
  return {
    kind: 'resource',
    label: group ? `${REFERENCE_KINDS.resource} · ${group.title}` : REFERENCE_KINDS.resource,
    title: r.label,
    text: r.description,
    href: r.href,
    mapHref: place ? mapHref(place) : undefined,
    icon: group?.icon || undefined,
    tip: r.tip,
    accent: group ? content.resourceGroups.indexOf(group) : undefined,
  }
}

/** What a reference points at, or null when it's gone (deleted, unpublished, renamed away) */
export function resolveReference({ kind, ref }: ReferenceItem, content: SiteContent): Resolved | null {
  switch (kind) {
    case 'eateries': {
      const at = readEateriesRef(ref, content.areas)
      return at ? { kind, title: at.area.title, eateries: eateriesIn(content.eateries, at.area.slug, at.kind) } : null
    }
    case 'eatery': {
      const eatery = content.eateries.find((e) => e.id === ref)
      return eatery ? { kind, eatery } : null
    }
    case 'place': {
      const place = placesFor(content).find((p) => p.id === ref)
      return place ? placeCard(place) : null
    }
    case 'resources': {
      const group = content.resourceGroups.find((g) => g.slug === ref)
      return group ? { kind, title: group.title, cards: resourcesIn(content.resources, group.slug).map((r) => resourceCard(r, content)) } : null
    }
    case 'resource': {
      // By its id; references from before resources had ids are by their link
      const r = content.resources.find((l) => l.id === ref) ?? content.resources.find((l) => l.href === ref)
      return r ? resourceCard(r, content) : null
    }
    case 'post': {
      const post = content.posts.find((p) => p.slug === ref)
      return post ? { kind, label: REFERENCE_KINDS.post, title: post.title, text: post.excerpt ?? '', href: `/posts/${post.slug}` } : null
    }
    case 'page': {
      const page = content.pages.find((p) => p.slug === ref)
      return page ? { kind, label: REFERENCE_KINDS.page, title: page.title, text: page.subtitle ?? page.description ?? '', href: pageHref(page.slug) } : null
    }
  }
}

type Option = { value: string; label: string; description?: string }

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Each area, and for one with dining halls, its halls alone and everything else, in the page's order */
const areaOptions = (content: SiteContent): Option[] =>
  content.areas.flatMap(({ slug: area, title }) => {
    const n = (kind: EateryKind) => eateriesIn(content.eateries, area, kind).length
    const option = (kind: EateryKind, label: string): Option => ({ value: eateriesRef(area, kind), label, description: count(n(kind), 'place', 'places') })
    return n('dining-halls') ? [option('all', title), option('dining-halls', `${title}: dining halls`), option('others', `${title}: all but dining halls`)] : [option('all', title)]
  })

/** Everything of a kind that can be picked, for the editor: areas and groups in the page's order, the rest A–Z */
export function referenceOptions(kind: ReferenceKind, content: SiteContent): Option[] {
  if (kind === 'eateries') return areaOptions(content)
  if (kind === 'resources') return content.resourceGroups.map((g) => ({ value: g.slug, label: g.title, description: count(resourcesIn(content.resources, g.slug).length, 'resource', 'resources') }))
  const groupTitle = (slug: string) => content.resourceGroups.find((g) => g.slug === slug)?.title
  const list =
    kind === 'eatery'
      ? content.eateries.map((e) => ({ value: e.id, label: e.name, description: e.address }))
      : kind === 'place'
        ? placesFor(content).map((p) => ({ value: p.id, label: p.name, description: p.address }))
        : kind === 'resource'
          ? content.resources.map((r) => ({ value: r.id, label: r.label, description: groupTitle(r.group) }))
          : kind === 'post'
            ? content.posts.map((p) => ({ value: p.slug, label: p.title }))
            : content.pages.map((p) => ({ value: p.slug, label: p.title, description: pageHref(p.slug) }))
  return list.sort((a, b) => a.label.localeCompare(b.label))
}
