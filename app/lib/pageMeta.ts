/**
 * Each built-in page's browser-tab title and search description. Officers can change them
 * in the dashboard (the page_meta table, by path); a blank field there keeps the one here.
 * A page officers took over in Pages (About, Join, …) uses that page's own title and
 * description while it's published, and these only until then.
 *
 * The site appends " | Campus Survival and Engagement Group" to every title (app/layout.tsx).
 */
import { CLUB_DESCRIPTION } from '../globals/config/site'
import type { SitePageSlug } from './sitePages'

export type PageMeta = {
  path: string
  /** What the dashboard calls it */
  name: string
  title: string
  description: string
  /** A page officers can take over in Pages; its title wins while it's published */
  sitePage?: SitePageSlug
}

export const BUILT_IN_PAGE_META: readonly PageMeta[] = [
  { path: '/', name: 'Homepage', title: 'Home', description: CLUB_DESCRIPTION.oneLiner },
  { path: '/about', name: 'About', title: 'About', description: CLUB_DESCRIPTION.oneLiner, sitePage: 'about' },
  { path: '/join', name: 'Join', title: 'Join', description: 'How to become a member of the Campus Survival and Engagement Group at Georgia State.', sitePage: 'join' },
  { path: '/events', name: 'Events', title: 'Events', description: 'Talks, showcases, and meetups from the Campus Survival and Engagement Group.' },
  { path: '/posts', name: 'Posts', title: 'Posts', description: 'News and announcements from CSEG.' },
  { path: '/map', name: 'Campus map', title: 'Campus Map', description: 'Find buildings, study spots, food, parking, and MARTA stations on Georgia State’s Atlanta campus.' },
  {
    path: '/eat',
    name: 'Places to eat',
    title: 'Places to Eat',
    description: 'Campus dining halls, on-campus eateries, and nearby restaurants, cafés, and late-night spots around Georgia State’s downtown campus.',
    sitePage: 'eat',
  },
  {
    path: '/resources',
    name: 'Resources',
    title: 'Resources',
    description: 'Links to Georgia State services for academics, money, health, housing, and getting involved, plus GSU colleges and student group chats.',
    sitePage: 'resources',
  },
  { path: '/affiliates', name: 'Affiliates', title: 'Affiliates', description: 'The student organizations the Campus Survival and Engagement Group partners with at Georgia State.' },
  { path: '/constitution', name: 'Constitution', title: 'Constitution', description: 'The constitution of the Campus Survival and Engagement Group at Georgia State.', sitePage: 'constitution' },
  { path: '/contact', name: 'Contact', title: 'Contact', description: 'Reach the Campus Survival and Engagement Group by email or on social media.', sitePage: 'contact' },
]

export type PagePath = (typeof BUILT_IN_PAGE_META)[number]['path']

export const builtInMeta = (path: string) => BUILT_IN_PAGE_META.find((m) => m.path === path)

/** Long enough for a tab; search results cut titles off around 60 characters and descriptions around 160 */
export const META_LIMITS = { title: 60, description: 200 } as const

/** A saved title or description over the built-in one: blank keeps the built-in */
export const withSaved = (builtIn: PageMeta, saved?: { title: string | null; description: string | null } | null) => ({
  title: saved?.title?.trim() || builtIn.title,
  description: saved?.description?.trim() || builtIn.description,
})
