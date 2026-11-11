/**
 * Curated picks for the campus guides: short collections ("First-week essentials",
 * "Open late") featured at the top of Places to eat and Resources, and under the map.
 * Officers make them in the dashboard (the guide_picks table); until a guide has any, it
 * shows the built-in ones below, which are drawn from what the site already lists.
 */
import { mapHref, type Place } from './data/places'
import type { Eatery } from './eateries'
import type { Resource } from './resources'
import type { GuideKind, GuidePickRow } from './supabase/types'

export type PickItem = {
  id: string
  label: string
  href: string
  /** Leaves the site (a resource's own link) */
  external?: boolean
}

export type GuidePick = {
  id: string
  title: string
  description?: string
  /** One of the site's card icons, by name */
  icon: string
  items: PickItem[]
}

/** What a guide's picks are picked from */
export type GuideData = { eateries?: readonly Eatery[]; resources?: readonly Resource[]; places?: readonly Place[] }

/** Everything a guide's picks can hold, as the items they'd show */
export const pickChoices = (guide: GuideKind, { eateries = [], resources = [], places = [] }: GuideData): PickItem[] =>
  guide === 'eat'
    ? eateries.map((e) => ({ id: e.id, label: e.name, href: `/eat#${e.id}` }))
    : guide === 'resources'
      ? resources.map((r) => ({ id: r.id, label: r.label, href: r.href, external: !r.href.startsWith('/') }))
      : places.map((p) => ({ id: p.id, label: p.name, href: mapHref(p) }))

/** The latest a schedule ever closes, in minutes after midnight; closing past midnight counts as later still */
const latestClose = (e: Eatery) =>
  Math.max(
    -1,
    ...(e.schedule ?? []).map(({ open, close }) => {
      const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
      return mins(close) <= mins(open) ? mins(close) + 24 * 60 : mins(close)
    })
  )

const LATE = 22 * 60

type BuiltIn = { id: string; title: string; description: string; icon: string; pick: (data: Required<GuideData>) => string[] }

const inCategory = (category: Place['category']) => (data: Required<GuideData>) => data.places.filter((p) => p.category === category || p.alsoIn?.includes(category)).map((p) => p.id)

/** The picks each guide starts with. Each is chosen by a rule or by name from the site's own lists, so it stays true as those change. */
const BUILT_IN: Record<GuideKind, BuiltIn[]> = {
  eat: [
    {
      id: 'dining-halls',
      title: 'All you can eat',
      description: 'The dining halls: one swipe or one price, and stay as long as you like.',
      icon: 'food',
      pick: ({ eateries }) => eateries.filter((e) => e.diningHall).map((e) => e.id),
    },
    {
      id: 'open-late',
      title: 'Open late',
      description: 'Still serving at 10 p.m. at least one night a week, for after a night class or a long study session.',
      icon: 'sparkle',
      pick: ({ eateries }) => eateries.filter((e) => !e.status && latestClose(e) >= LATE).map((e) => e.id),
    },
  ],
  resources: [
    {
      id: 'first-week',
      title: 'First-week essentials',
      description: 'The handful to bookmark before classes start.',
      icon: 'compass',
      pick: () => ['paws', 'icollege', 'panthercard', 'university-advisement', 'parking-transportation', 'panther-involvement-network-pin'],
    },
    {
      id: 'tight-budget',
      title: 'When money’s tight',
      description: 'Free food, aid, scholarships, and jobs on campus.',
      icon: 'money',
      pick: () => ['panther-pantry', 'scholarship-resource-center', 'student-employment', 'apply-for-financial-aid-fafsa', 'panther-book-access-program'],
    },
    {
      id: 'someone-to-talk-to',
      title: 'Someone to talk to',
      description: 'People whose job is to help when things get hard.',
      icon: 'support',
      pick: () => ['counseling-center', 'office-of-the-dean-of-students', 'access-and-accommodations-center', 'student-victim-assistance'],
    },
  ],
  map: [
    { id: 'study', title: 'Where to study', description: 'Libraries and study spaces across campus.', icon: 'book', pick: inCategory('study') },
    { id: 'marta', title: 'MARTA near campus', description: 'The stations closest to class.', icon: 'transit', pick: inCategory('transit') },
    { id: 'outdoors', title: 'Fresh air', description: 'Parks and plazas for a break between classes.', icon: 'heart', pick: inCategory('outdoors') },
  ],
}

/** The most a pick shows; a short list is the point */
export const PICK_ITEMS_SHOWN = 8

/**
 * A guide's picks, ready to show: officers' own (in their order), or the built-in ones while
 * there are none. An item that's gone from the site (renamed, hidden, deleted) is left out,
 * and a pick left with nothing in it isn't shown.
 */
export function picksFor(guide: GuideKind, rows: readonly Pick<GuidePickRow, 'id' | 'title' | 'description' | 'icon' | 'items'>[], data: GuideData): GuidePick[] {
  const full: Required<GuideData> = { eateries: data.eateries ?? [], resources: data.resources ?? [], places: data.places ?? [] }
  const choices = new Map(pickChoices(guide, full).map((c) => [c.id, c]))
  const itemsOf = (ids: readonly string[]) => ids.flatMap((id) => choices.get(id) ?? []).slice(0, PICK_ITEMS_SHOWN)
  const picks: GuidePick[] = rows.length
    ? rows.map((r) => ({ id: r.id, title: r.title, description: r.description ?? undefined, icon: r.icon, items: itemsOf(r.items) }))
    : BUILT_IN[guide].map((b) => ({ id: b.id, title: b.title, description: b.description, icon: b.icon, items: itemsOf(b.pick(full)) }))
  return picks.filter((p) => p.items.length)
}
