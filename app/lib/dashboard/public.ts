import { draftMode } from 'next/headers'
import { cache } from 'react'

import { clubDetailsFrom, type ClubDetails } from '@/lib/clubDetails'
import { EATERIES } from '@/lib/data/eats'
import type { Executive } from '@/(page)/executives/components/types'
import { EXECUTIVES } from '@/(page)/executives/data'
import { getUpcomingEvents, type ClubEvent } from '@/lib/data/events'
import { BUILT_IN_EVENTS, eventFromRow, splitEvents } from '@/lib/events'
import { executiveFromRow, sortExecutives } from '@/lib/executives'
import { BUILDINGS_AND_SPACES, type Place, type PlaceCategory } from '@/lib/data/places'
import { applyClosures, areaFromRow, atlantaToday, BUILT_IN_AREAS, eateryFromRow, type Eatery, type EateryArea } from '@/lib/eateries'
import { BUILT_IN_HOMEPAGE, homepageFrom, type HomepageContent } from '@/lib/homepage'
import { builtInMeta, withSaved, type PagePath } from '@/lib/pageMeta'
import type { SiteContent } from '@/lib/references'
import { BUILT_IN_RESOURCE_GROUPS, BUILT_IN_RESOURCES, resourceFromRow, resourceGroupFromRow, type Resource, type ResourceGroup } from '@/lib/resources'
import { plainText } from '@/lib/richtext'
import type { SearchEntry } from '@/lib/search'
import { affiliateFromRow } from '@/lib/affiliates'
import { connectionFromRow } from '@/lib/connections'
import { AFFILIATES, affiliateHref, type Affiliate } from '@/lib/data/affiliates'
import { CONNECTIONS } from '@/lib/data/connections'
import type { Connection } from '@/lib/wayfinding'
import { pageHref, SITE_PAGES } from '@/lib/sitePages'
import { createClient, createPublicClient } from '@/lib/supabase/server'
import { sortSponsors, sponsorActive } from './terms'
import type { GuideKind, GuidePickRow, AffiliateRow, ClubEventRow, ClubSettingsRow, FaqRow, MapConnectionRow, RedirectRow, SponsorRow, EateryAreaRow, ExecutiveRow, EateryClosureRow, EateryRow, HomepageRow, MapPlaceRow, PageMetaRow, PageRedirectRow, PageRow, PostRow, ResourceGroupRow, ResourceRow } from '@/lib/supabase/types'

/**
 * What the public site reads from the dashboard: published posts, pages, and map pins.
 * No session, so these pages can be cached; only an officer previewing drafts (draft mode,
 * which skips the cache) reads as themselves. Without Supabase configured (or if it's
 * unreachable) they read as empty, so the site still works.
 */

const quietly = async <T>(fallback: T, run: () => PromiseLike<{ data: T | null; error: unknown }>): Promise<T> => {
  try {
    const { data, error } = await run()
    return error || data === null ? fallback : data
  } catch {
    return fallback
  }
}

export const getPublishedPosts = cache(async () => {
  const supabase = createPublicClient()
  if (!supabase) return []
  return quietly([], () =>
    supabase
      .from('posts')
      .select('slug, title, excerpt, cover_image_url, published_at, updated_at, category, featured, author_name')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
  )
})

/** Up to three more to read after a post: its own category first, then the newest */
export async function getRelatedPosts(post: Pick<PostRow, 'slug' | 'category'>) {
  const others = (await getPublishedPosts()).filter((p) => p.slug !== post.slug)
  const same = post.category ? others.filter((p) => p.category === post.category) : []
  return [...same, ...others.filter((p) => !same.includes(p))].slice(0, 3)
}

/** Every published page's address and when it last changed, for the sitemap */
export async function getPublishedPageList() {
  const supabase = createPublicClient()
  if (!supabase) return []
  const rows = await quietly<(Pick<PageRow, 'id' | 'slug' | 'updated_at'> & Partial<Pick<PageRow, 'parent_id'>>)[]>([], () => supabase.from('pages').select('*').eq('status', 'published'))
  const slugOf = new Map(rows.map((r) => [r.id, r.slug]))
  return rows.map((r) => ({ slug: r.slug, updated_at: r.updated_at, href: pageHref(r.slug, r.parent_id ? slugOf.get(r.parent_id) : null) }))
}

/** A page as the site's menu and breadcrumbs name it */
export type PageLink = { href: string; label: string; description?: string }

/** A page's menu details; older rows (before the columns existed) read as not in the menu */
type NavRow = Pick<PageRow, 'id' | 'slug' | 'title' | 'description' | 'subtitle'> & Partial<Pick<PageRow, 'parent_id' | 'nav_placement' | 'nav_label' | 'nav_sort'>>

const linkOf = (row: NavRow, parentSlug?: string | null): PageLink => ({
  href: pageHref(row.slug, parentSlug),
  label: row.nav_label?.trim() || row.title,
  description: row.subtitle ?? row.description ?? undefined,
})

const byMenuOrder = (a: NavRow, b: NavRow) => (a.nav_sort ?? 0) - (b.nav_sort ?? 0) || a.title.localeCompare(b.title)

/** Every published page, once per request: the menu, breadcrumbs, and addresses all read it */
const getPageRows = cache(async (): Promise<NavRow[]> => {
  const supabase = createPublicClient()
  if (!supabase) return []
  // Named columns, not the pages' writing; before their migration runs this reads as no pages
  return quietly<NavRow[]>([], () => supabase.from('pages').select('id, slug, title, description, subtitle, parent_id, nav_placement, nav_label, nav_sort').eq('status', 'published'))
})

/** The pages officers put in the site's menu: the header's More menu, and the footer */
export const getNavPages = cache(async (): Promise<{ header: PageLink[]; footer: PageLink[] }> => {
  const rows = await getPageRows()
  const slugOf = new Map(rows.map((r) => [r.id, r.slug]))
  const listed = (where: 'header' | 'footer') =>
    rows
      .filter((r) => r.nav_placement === where || r.nav_placement === 'both')
      .sort(byMenuOrder)
      .map((r) => linkOf(r, r.parent_id ? slugOf.get(r.parent_id) : null))
  return { header: listed('header'), footer: listed('footer') }
})

/** The page a page sits under, and the pages that sit under it, for its breadcrumb and "In this section" */
export async function getPageFamily(page: Pick<PageRow, 'id'> & Partial<Pick<PageRow, 'parent_id'>>): Promise<{ parent: PageLink | null; subpages: PageLink[] }> {
  const rows = await getPageRows()
  const self = rows.find((r) => r.id === page.id)
  const parent = page.parent_id ? rows.find((r) => r.id === page.parent_id) : undefined
  return {
    parent: parent ? { ...linkOf(parent), label: parent.title } : null,
    subpages: self
      ? rows
          .filter((r) => r.parent_id === page.id)
          .sort(byMenuOrder)
          .map((r) => ({ ...linkOf(r, self.slug), label: r.title }))
      : [],
  }
}

/**
 * The page at an address made of one or two parts (/guides, /guides/parking), and the
 * address it should be read at: a page under another answers only at /parent/page, so its
 * short address (and a wrong parent) forward there.
 */
export async function getPageAt(path: readonly string[]): Promise<{ page: PageRow; href: string } | null> {
  if (path.length < 1 || path.length > 2) return null
  const page = await getPublishedPage(path[path.length - 1])
  if (!page) return null
  let parentSlug: string | null = null
  if (page.parent_id) {
    // The parent's own draft counts while previewing, as the page's does
    const preview = await previewClient()
    const supabase = preview ?? createPublicClient()
    const parent = supabase ? await quietly<Pick<PageRow, 'slug'> | null>(null, () => supabase.from('pages').select('slug').eq('id', page.parent_id!).maybeSingle()) : null
    parentSlug = parent?.slug ?? null
  }
  return { page, href: pageHref(page.slug, parentSlug) }
}

/** Officers' collections for one of the campus guides, in order */
export const getGuidePicks = cache(async (guide: GuideKind): Promise<GuidePickRow[]> => {
  const supabase = createPublicClient()
  if (!supabase) return []
  return quietly<GuidePickRow[]>([], () => supabase.from('guide_picks').select('*').eq('guide', guide).eq('published', true).order('sort').order('title'))
})

/** What the site's search looks through */
export async function getSearchIndex(): Promise<SearchEntry[]> {
  const supabase = createPublicClient()
  const [posts, pages, eateries, { resources }, affiliates] = await Promise.all([
    supabase ? quietly<Pick<PostRow, 'slug' | 'title' | 'excerpt' | 'body'>[]>([], () => supabase.from('posts').select('slug, title, excerpt, body').eq('status', 'published')) : [],
    supabase ? quietly<Pick<PageRow, 'slug' | 'title' | 'description' | 'body' | 'layout' | 'sections'>[]>([], () => supabase.from('pages').select('slug, title, description, body, layout, sections').eq('status', 'published')) : [],
    getEateries(),
    getResources(),
    getAffiliates(),
  ])
  const managed = new Set(pages.map((p) => pageHref(p.slug)))
  return [
    ...SEARCH_ROUTES.filter((r) => !managed.has(r.href)).map((r) => ({ ...r, kind: 'Page' })),
    ...affiliates.map((a) => ({ title: a.shortName, href: affiliateHref(a), kind: 'Page', summary: a.summary ?? `A CSEG affiliate: ${a.name}.` })),
    ...pages.map((p) => ({
      title: p.title,
      href: pageHref(p.slug),
      kind: 'Page',
      summary: p.description,
      text: p.layout === 'sections' ? p.sections.flatMap((s) => [s.title, plainText(s.body)]).join('\n') : plainText(p.body),
    })),
    ...posts.map((p) => ({ title: p.title, href: `/posts/${p.slug}`, kind: 'Post', summary: p.excerpt, text: plainText(p.body) })),
    ...resources.map((r) => ({ title: r.label, href: r.href, kind: 'Resource', summary: r.description })),
    ...eateries.map((e) => ({ title: e.name, href: `${SITE_PAGES.eat.path}#${e.id}`, kind: 'Place to eat', summary: e.description, text: e.address })),
  ]
}

/** The site's own pages, as search finds them until officers write their own */
const SEARCH_ROUTES: Omit<SearchEntry, 'kind'>[] = [
  { title: 'About CSEG', href: SITE_PAGES.about.path, summary: 'Who we are, what we do, and common questions.' },
  { title: 'Join CSEG', href: SITE_PAGES.join.path, summary: 'How to become a member.' },
  { title: 'Contact', href: SITE_PAGES.contact.path, summary: 'Email the officers, or find us online.' },
  { title: 'Student resources', href: SITE_PAGES.resources.path, summary: 'Georgia State services for academics, wellness, and finances.' },
  { title: 'Constitution', href: SITE_PAGES.constitution.path, summary: 'How CSEG is organized and run.' },
  { title: 'Affiliates', href: '/affiliates', summary: 'The student organizations CSEG partners with.' },
  { title: 'Places to eat', href: SITE_PAGES.eat.path, summary: 'Food on and around campus, and what’s open now.' },
  { title: 'Events', href: '/events', summary: 'What’s coming up, and what’s happened.' },
  { title: 'Campus map', href: '/map', summary: 'Buildings, spaces, and walking directions.' },
  { title: 'News from CSEG', href: '/posts', summary: 'Announcements, recaps, and what’s coming up.' },
]

/**
 * In draft mode (an officer previewing, from the editor), a client acting as them: their
 * drafts show, at the page's own address. Anyone else (or without draft mode) gets null.
 */
const previewClient = async () => ((await draftMode()).isEnabled ? await createClient() : null)

/** A post: its draft while an officer previews, else the published one */
export async function getPublishedPost(slug: string) {
  const preview = await previewClient()
  if (preview) return quietly<PostRow | null>(null, () => preview.from('posts').select('*').eq('slug', slug).maybeSingle())
  const supabase = createPublicClient()
  if (!supabase) return null
  return quietly<PostRow | null>(null, () => supabase.from('posts').select('*').eq('status', 'published').eq('slug', slug).maybeSingle())
}

/** A page: its draft while an officer previews, else the published one */
export async function getPublishedPage(slug: string) {
  const preview = await previewClient()
  if (preview) return quietly<PageRow | null>(null, () => preview.from('pages').select('*').eq('slug', slug).maybeSingle())
  const supabase = createPublicClient()
  if (!supabase) return null
  return quietly<PageRow | null>(null, () => supabase.from('pages').select('*').eq('status', 'published').eq('slug', slug).maybeSingle())
}

/**
 * A dashboard place as a campus map place. A seeded one keeps its built-in id (and its room
 * directory, which stays in code); a club pin's id is prefixed so it never clashes with one.
 */
export const toPlace = (row: MapPlaceRow): Place => {
  const place = {
    name: row.name,
    category: row.category as PlaceCategory,
    alsoIn: row.also_in.length ? (row.also_in as PlaceCategory[]) : undefined,
    lat: row.lat,
    lng: row.lng,
    address: row.address ?? undefined,
    tip: row.tip ?? undefined,
  }
  if (!row.slug) return { ...place, id: `club-${row.id}`, description: row.description || 'Added by CSEG officers.', aliases: ['CSEG', 'club', ...row.aliases] }
  const builtIn = BUILDINGS_AND_SPACES.find((p) => p.id === row.slug)
  return { ...place, id: row.slug, description: row.description, aliases: row.aliases.length ? row.aliases : undefined, floors: builtIn?.floors }
}

/** A row that's one of the map's own places (seeded from the built-in list), not a club pin */
export const isMapBuilding = (row: Pick<MapPlaceRow, 'slug'>) => row.slug !== null

/**
 * The places to eat the site shows (the /eat page, References, the map's Food pins): the
 * dashboard's published ones, in each area's order, or the built-in list until the eateries
 * table has any (or when Supabase isn't set up). Ones a closure covers today show closed.
 */
export const getEateries = cache(async (): Promise<readonly Eatery[]> => {
  const supabase = createPublicClient()
  if (!supabase) return EATERIES
  const today = atlantaToday()
  const [rows, closures] = await Promise.all([
    quietly<EateryRow[]>([], () => supabase.from('eateries').select('*').eq('published', true).order('sort').order('name')),
    quietly<EateryClosureRow[]>([], () => supabase.from('eatery_closures').select('*').lte('starts_on', today).gte('ends_on', today)),
  ])
  return applyClosures(rows.length ? rows.map(eateryFromRow) : EATERIES, closures, today)
})

/** The areas places to eat are grouped in, in the page's order: the dashboard's, or the built-in ones until it has any */
export const getEatAreas = cache(async (): Promise<readonly EateryArea[]> => {
  const supabase = createPublicClient()
  if (!supabase) return BUILT_IN_AREAS
  const rows = await quietly<EateryAreaRow[]>([], () => supabase.from('eatery_areas').select('*').order('sort').order('title'))
  return rows.length ? rows.map(areaFromRow) : BUILT_IN_AREAS
})

/**
 * The student resources and their groups, in order: the dashboard's published ones, or the
 * built-in list until the tables have any (or when Supabase isn't set up)
 */
export const getResources = cache(async (): Promise<{ groups: readonly ResourceGroup[]; resources: readonly Resource[] }> => {
  const builtIn = { groups: BUILT_IN_RESOURCE_GROUPS, resources: BUILT_IN_RESOURCES }
  const supabase = createPublicClient()
  if (!supabase) return builtIn
  const [groups, rows] = await Promise.all([
    quietly<ResourceGroupRow[]>([], () => supabase.from('resource_groups').select('*').order('sort').order('title')),
    quietly<ResourceRow[]>([], () => supabase.from('resources').select('*').eq('published', true).order('sort').order('label')),
  ])
  return groups.length && rows.length ? { groups: groups.map(resourceGroupFromRow), resources: rows.map(resourceFromRow) } : builtIn
})

/** The club's own events, published: the dashboard's, or the built-in list until it has any */
const getClubEvents = cache(async (): Promise<readonly ClubEvent[]> => {
  const supabase = createPublicClient()
  if (!supabase) return BUILT_IN_EVENTS
  const rows = await quietly<ClubEventRow[]>([], () => supabase.from('events').select('*').eq('published', true).order('starts_at', { ascending: false }))
  return rows.length ? rows.map(eventFromRow) : BUILT_IN_EVENTS
})

/** Every event: what hasn't ended (PIN's and the club's), soonest first, and what has, newest first */
export const getEvents = cache(async () => {
  const [own, pin] = await Promise.all([getClubEvents(), getUpcomingEvents()])
  return splitEvents(own, pin)
})

/** The executives, in the page's order: the dashboard's published ones, or the built-in list until it has any */
export const getExecutives = cache(async (): Promise<readonly Executive[]> => {
  const supabase = createPublicClient()
  if (!supabase) return sortExecutives(EXECUTIVES)
  const rows = await quietly<ExecutiveRow[]>([], () => supabase.from('executives').select('*').eq('published', true))
  return sortExecutives(rows.length ? rows.map(executiveFromRow) : EXECUTIVES)
})

/** The affiliates, in the page's order: the dashboard's published ones, or the built-in list until it has any */
export const getAffiliates = cache(async (): Promise<readonly Affiliate[]> => {
  const supabase = createPublicClient()
  if (!supabase) return AFFILIATES
  const rows = await quietly<AffiliateRow[]>([], () => supabase.from('affiliates').select('*').eq('published', true).order('sort').order('short_name'))
  return rows.length ? rows.map(affiliateFromRow) : AFFILIATES
})

/** One affiliate by its page's address, or undefined */
export const getAffiliate = async (slug: string) => (await getAffiliates()).find((a) => a.slug === slug)

/**
 * The map's skybridges, indoor links, and shortcuts: the dashboard's published ones, or the
 * built-in list until it has any
 */
export const getConnections = cache(async (): Promise<readonly Connection[]> => {
  const supabase = createPublicClient()
  if (!supabase) return CONNECTIONS
  const rows = await quietly<MapConnectionRow[]>([], () => supabase.from('map_connections').select('*').eq('published', true).order('sort').order('name'))
  return rows.length ? rows.map(connectionFromRow) : CONNECTIONS
})

/** The details officers set in Settings, over the site's own */
export const getClubDetails = cache(async (): Promise<ClubDetails> => {
  const supabase = createPublicClient()
  return clubDetailsFrom(supabase ? await quietly<ClubSettingsRow | null>(null, () => supabase.from('club_settings').select('*').eq('id', 1).maybeSingle()) : null)
})

/** What References blocks draw from: the eateries and their areas, the resources, and the published posts and pages */
export const getSiteContent = cache(async (): Promise<SiteContent> => {
  const supabase = createPublicClient()
  const [eateries, areas, { groups: resourceGroups, resources }, posts, pages, { upcoming, past }] = await Promise.all([
    getEateries(),
    getEatAreas(),
    getResources(),
    supabase ? quietly<SiteContent['posts']>([], () => supabase.from('posts').select('slug, title, excerpt').eq('status', 'published')) : [],
    supabase ? quietly<SiteContent['pages']>([], () => supabase.from('pages').select('slug, title, description, subtitle').eq('status', 'published')) : [],
    getEvents(),
  ])
  return { eateries, areas, resources, resourceGroups, posts, pages, events: upcoming, pastEvents: past }
})

/** Officers' tab titles and search descriptions, once per request */
const getPageMetaRows = cache(async (): Promise<PageMetaRow[]> => {
  const supabase = createPublicClient()
  if (!supabase) return []
  return quietly<PageMetaRow[]>([], () => supabase.from('page_meta').select('*'))
})

/** A built-in page's tab title and search description: the dashboard's, or the site's own */
export async function pageMetadata(path: PagePath): Promise<{ title: string; description: string }> {
  const builtIn = builtInMeta(path)
  if (!builtIn) throw new Error(`No built-in title for ${path}`)
  return withSaved(builtIn, (await getPageMetaRows()).find((r) => r.path === path))
}

/**
 * Where a page's old web address points now: the slug of the page it forwards to, while that
 * page is live (the page's own rules decide that), or null
 */
export async function getPageRedirect(slug: string): Promise<string | null> {
  const supabase = createPublicClient()
  if (!supabase) return null
  const redirect = await quietly<Pick<PageRedirectRow, 'page_id'> | null>(null, () => supabase.from('page_redirects').select('page_id').eq('from_slug', slug).maybeSingle())
  if (!redirect) return null
  const page = await quietly<Pick<PageRow, 'slug'> | null>(null, () => supabase.from('pages').select('slug').eq('id', redirect.page_id).eq('status', 'published').maybeSingle())
  return page && page.slug !== slug ? page.slug : null
}

/** The homepage's words: the dashboard's, over the built-in ones (which are all there is until officers save) */
export const getHomepage = cache(async (): Promise<HomepageContent> => {
  const supabase = createPublicClient()
  if (!supabase) return BUILT_IN_HOMEPAGE
  const row = await quietly<Pick<HomepageRow, 'content'> | null>(null, () => supabase.from('homepage').select('content').eq('id', 1).maybeSingle())
  return homepageFrom(row?.content)
})

/**
 * The dashboard's published map places: the map's buildings and spaces (undefined until any
 * are seeded, so the map keeps its built-in list) and the club's own pins.
 */
export async function getPublishedPlaces(): Promise<{ buildings?: Place[]; clubPlaces: Place[] }> {
  const supabase = createPublicClient()
  if (!supabase) return { clubPlaces: [] }
  const rows = await quietly<MapPlaceRow[]>([], () => supabase.from('map_places').select('*').eq('published', true).order('name'))
  const buildings = rows.filter(isMapBuilding).map(toPlace)
  return { buildings: buildings.length ? buildings : undefined, clubPlaces: rows.filter((r) => !isMapBuilding(r)).map(toPlace) }
}

/** /about's common questions officers wrote, in order; none until they add any (the page keeps its own) */
export const getFaqs = cache(async (): Promise<Pick<FaqRow, 'id' | 'question' | 'answer'>[]> => {
  const supabase = createPublicClient()
  if (!supabase) return []
  return quietly([], () => supabase.from('faqs').select('id, question, answer').eq('published', true).order('sort').order('question'))
})

/** The sponsors shown today (published, and inside their dates), the highest tier first */
export const getSponsors = cache(async (): Promise<SponsorRow[]> => {
  const supabase = createPublicClient()
  if (!supabase) return []
  const rows = await quietly<SponsorRow[]>([], () => supabase.from('sponsors').select('*').eq('published', true))
  const today = atlantaToday()
  return sortSponsors(rows.filter((s) => sponsorActive(s, today)))
})

/** Where an old address on the site goes now (a path here or a full link), or null */
export async function getRedirect(path: string): Promise<string | null> {
  const supabase = createPublicClient()
  if (!supabase) return null
  const row = await quietly<Pick<RedirectRow, 'to_path'> | null>(null, () => supabase.from('redirects').select('to_path').eq('from_path', path).maybeSingle())
  return row?.to_path ?? null
}
