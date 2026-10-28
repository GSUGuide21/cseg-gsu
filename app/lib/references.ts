/**
 * References: a block that points at things already on the site (an eatery, an area's
 * eateries, a map place, a resource, a post, or a page) and draws them as live cards, so a
 * page never holds a copy that goes stale. Saved as which kind and which one (its id, slug,
 * area, or for a resource its link); what it shows is looked up where the page is drawn.
 */
import { placesWithEateries, mapHref, type Place } from './data/places'
import { GROUP_CHATS, RESOURCE_GROUPS, type ResourceLink } from './data/resources'
import { EAT_AREA_LIST, EAT_AREAS, EATERY_KINDS, eateriesIn, isEatArea, type EatArea, type Eatery, type EateryKind } from './eateries'
import type { Schedule } from './hours'
import { pageHref } from './sitePages'

export type ReferenceKind = 'eateries' | 'eatery' | 'place' | 'resource' | 'post' | 'page'

export const REFERENCE_KINDS: Record<ReferenceKind, string> = {
  eateries: 'Eateries in an area',
  eatery: 'Eatery',
  place: 'Map place',
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

const readEateriesRef = (ref: string): { area: EatArea; kind: EateryKind } | null => {
  const [area, kind = 'all'] = ref.split(':')
  return isEatArea(area) && Object.hasOwn(EATERY_KINDS, kind) ? { area, kind: kind as EateryKind } : null
}

// ── Looking them up ──────────────────────────────────────────────────────────

/** What's published on the site that references can point at */
export type SiteContent = {
  eateries: readonly Eatery[]
  posts: readonly { slug: string; title: string; excerpt: string | null }[]
  pages: readonly { slug: string; title: string; description: string | null; subtitle: string | null }[]
}

export const NO_SITE_CONTENT: SiteContent = { eateries: [], posts: [], pages: [] }

/** The map's buildings and spaces, by id (eateries are a kind of their own) */
const BUILDING_IDS = new Set(placesWithEateries([]).map((p) => p.id))
/** The map's buildings and spaces, with dining halls' hours from these eateries */
const placesFor = (content: SiteContent) => placesWithEateries(content.eateries).filter((p) => BUILDING_IDS.has(p.id))
const RESOURCES: readonly (ResourceLink & { group: string })[] = [
  ...RESOURCE_GROUPS.flatMap((g) => g.links.map((l) => ({ ...l, group: g.title }))),
  ...GROUP_CHATS.map((l) => ({ ...l, group: 'Group chats' })),
]

/** A referenced thing, ready to draw: eateries' own cards, or a card of the general kind */
export type Resolved =
  | { kind: 'eatery'; eatery: Eatery }
  /** An area's eateries, as they are now (none yet is still the area) */
  | { kind: 'eateries'; title: string; eateries: readonly Eatery[] }
  | {
      kind: Exclude<ReferenceKind, 'eatery' | 'eateries'>
      /** Above the title: "Map place", "Resource · Money & aid" */
      label: string
      title: string
      text: string
      href: string
      /** For "Open now" */
      schedule?: Schedule
      /** "Show on map", for a resource in a building */
      mapHref?: string
    }

const placeCard = (p: Place): Resolved => ({ kind: 'place', label: REFERENCE_KINDS.place, title: p.name, text: p.address ? `${p.address}. ${p.description}` : p.description, href: mapHref(p), schedule: p.schedule })

/** What a reference points at, or null when it's gone (deleted, unpublished, renamed away) */
export function resolveReference({ kind, ref }: ReferenceItem, content: SiteContent): Resolved | null {
  switch (kind) {
    case 'eateries': {
      const at = readEateriesRef(ref)
      return at ? { kind, title: EAT_AREAS[at.area].title, eateries: eateriesIn(content.eateries, at.area, at.kind) } : null
    }
    case 'eatery': {
      const eatery = content.eateries.find((e) => e.id === ref)
      return eatery ? { kind, eatery } : null
    }
    case 'place': {
      const place = placesFor(content).find((p) => p.id === ref)
      return place ? placeCard(place) : null
    }
    case 'resource': {
      const r = RESOURCES.find((l) => l.href === ref)
      if (!r) return null
      const place = r.placeId ? placesFor(content).find((p) => p.id === r.placeId) : undefined
      return { kind, label: `${REFERENCE_KINDS.resource} · ${r.group}`, title: r.label, text: r.description, href: r.href, mapHref: place ? mapHref(place) : undefined }
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

/** Each area, and for one with dining halls, its halls alone and everything else, in the page's order */
const areaOptions = (content: SiteContent): Option[] =>
  EAT_AREA_LIST.flatMap((area) => {
    const { title } = EAT_AREAS[area]
    const count = (kind: EateryKind) => eateriesIn(content.eateries, area, kind).length
    const option = (kind: EateryKind, label: string): Option => ({ value: eateriesRef(area, kind), label, description: `${count(kind)} ${count(kind) === 1 ? 'place' : 'places'}` })
    return count('dining-halls') ? [option('all', title), option('dining-halls', `${title}: dining halls`), option('others', `${title}: all but dining halls`)] : [option('all', title)]
  })

/** Everything of a kind that can be picked, for the editor: areas in the page's order, the rest A–Z */
export function referenceOptions(kind: ReferenceKind, content: SiteContent): Option[] {
  if (kind === 'eateries') return areaOptions(content)
  const list =
    kind === 'eatery'
      ? content.eateries.map((e) => ({ value: e.id, label: e.name, description: e.address }))
      : kind === 'place'
        ? placesFor(content).map((p) => ({ value: p.id, label: p.name, description: p.address }))
        : kind === 'resource'
          ? RESOURCES.map((r) => ({ value: r.href, label: r.label, description: r.group }))
          : kind === 'post'
            ? content.posts.map((p) => ({ value: p.slug, label: p.title }))
            : content.pages.map((p) => ({ value: p.slug, label: p.title, description: pageHref(p.slug) }))
  return list.sort((a, b) => a.label.localeCompare(b.label))
}
