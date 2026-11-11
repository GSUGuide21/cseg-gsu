/**
 * Student resources: links to Georgia State services, in groups, for the /resources page
 * and References. Edited in the dashboard (the resources and resource_groups tables); the
 * list in ./data/resources is what the site shows until they have any, and what seeds them.
 */
import { BookOpen, Building2, GraduationCap, HeartHandshake, HeartPulse, Sparkles, Users, Wallet, type LucideIcon } from 'lucide-react'

import { slugify } from '../components/Form/Slug/slugify'
import { GROUP_CHATS, RESOURCE_GROUPS } from './data/resources'
import type { Database, ResourceGroupRow, ResourceRow } from './supabase/types'

export type ResourceGroup = {
  /** Its #link (/resources#money), and what References point at */
  readonly slug: string
  readonly title: string
  readonly description?: string
  /** One of the card icons (book, money, chat, …), or "" */
  readonly icon: string
}

export type Resource = {
  /** What References point at */
  readonly id: string
  readonly group: string
  readonly label: string
  readonly href: string
  readonly description: string
  /** The map place it's in, for "Show on map" */
  readonly placeId?: string
  /** A short tip in a student's voice */
  readonly tip?: string
}

/** The group chats' group: on /resources with a word of caution, and the header's #chats link */
export const CHATS_GROUP = 'chats'

/** The built-in groups' icons, as the card icons' names */
const ICON_NAMES = new Map<LucideIcon, string>([
  [BookOpen, 'book'],
  [Wallet, 'money'],
  [HeartPulse, 'health'],
  [HeartHandshake, 'support'],
  [Building2, 'building'],
  [Users, 'people'],
  [Sparkles, 'sparkle'],
  [GraduationCap, 'school'],
])

export const BUILT_IN_RESOURCE_GROUPS: readonly ResourceGroup[] = [
  ...RESOURCE_GROUPS.map((g) => ({ slug: g.id, title: g.title, description: g.description, icon: ICON_NAMES.get(g.Icon) ?? '' })),
  {
    slug: CHATS_GROUP,
    title: 'Group chats',
    description: 'Student-run GroupMe chats. Be kind, and never share personal or financial info with someone you haven’t met.',
    icon: 'chat',
  },
]

export const BUILT_IN_RESOURCES: readonly Resource[] = [
  ...RESOURCE_GROUPS.flatMap((g) => g.links.map((l) => ({ group: g.id, l }))),
  ...GROUP_CHATS.map((l) => ({ group: CHATS_GROUP, l })),
].map(({ group, l }) => ({ id: slugify(l.label), group, label: l.label, href: l.href, description: l.description, placeId: l.placeId }))

export const resourcesIn = (resources: readonly Resource[], group: string) => resources.filter((r) => r.group === group)

// ── The tables ───────────────────────────────────────────────────────────────

export const resourceFromRow = (row: ResourceRow): Resource => ({
  id: row.slug,
  group: row.group_slug,
  label: row.label,
  href: row.href,
  description: row.description,
  placeId: row.place_id ?? undefined,
  tip: row.tip ?? undefined,
})

export const resourceGroupFromRow = (row: ResourceGroupRow): ResourceGroup => ({ slug: row.slug, title: row.title, description: row.description ?? undefined, icon: row.icon })

/** A resource as a row of the resources table, `sort` placing it in its group */
export const resourceToRow = (r: Resource, sort: number): Database['public']['Tables']['resources']['Insert'] => ({
  slug: r.id,
  group_slug: r.group,
  label: r.label,
  href: r.href,
  description: r.description,
  place_id: r.placeId ?? null,
  sort,
  published: true,
  ...(r.tip ? { tip: r.tip } : {}),
})
