/**
 * The site's own pages (About, Join, Contact, Resources, Places to Eat) as dashboard pages:
 * the same words, laid out in sections of the editor's blocks (cards, an FAQ, steps, a
 * callout, buttons, a list, live References). seed-site-pages.ts writes them to Supabase as
 * drafts; once an officer publishes one, it shows at the page's own path in place of the
 * code's version.
 *
 * Built from the same data the code's pages use, so the two say the same thing.
 */
import { randomUUID } from 'node:crypto'

import { BookOpen, Building2, GraduationCap, HeartHandshake, HeartPulse, Sparkles, Users, Wallet, type LucideIcon } from 'lucide-react'

import { JOIN_STEPS } from '../app/globals/config/club'
import { CLUB_DESCRIPTION } from '../app/globals/config/site'
import { CONTACT_EMAIL, SOCIAL_LINKS } from '../app/globals/config/social'
import { EAT_LINKS, EAT_TIPS, EATS_CHECKED, MORE_EATS } from '../app/lib/data/eats'
import { EAT_AREA_LIST, EAT_AREAS, type EatArea, type EateryKind } from '../app/lib/eateries'
import { eateriesRef } from '../app/lib/references'
import { GROUP_CHATS, RESOURCE_GROUPS } from '../app/lib/data/resources'

// ── Lexical's saved JSON, written by hand ───────────────────────────────────

type Inline = Record<string, unknown>
type Block = Record<string, unknown>

const element = { direction: null, format: '', indent: 0, version: 1 }
const text = (t: string, bold = false): Inline => ({ type: 'text', version: 1, text: t, format: bold ? 1 : 0, style: '', mode: 'normal', detail: 0 })
const link = (url: string, words: string): Inline => ({ ...element, type: 'link', url, rel: null, target: null, title: null, children: [text(words)] })
/** A run of words: strings are plain text, [words, url] pairs are links */
const inline = (...parts: (string | [string, string])[]): Inline[] => parts.map((p) => (typeof p === 'string' ? text(p) : link(p[1], p[0])))
const paragraph = (...parts: (string | [string, string])[]): Block => ({ ...element, type: 'paragraph', textFormat: 0, textStyle: '', children: inline(...parts) })
const callout = (tone: 'info' | 'tip' | 'warning', ...parts: (string | [string, string])[]): Block => ({ ...element, type: 'callout', tone, children: inline(...parts) })
const buttons = (list: { label: string; href: string; style?: 'primary' | 'outline' }[]): Block => ({
  type: 'buttons',
  version: 1,
  align: 'start',
  buttons: list.map((b) => ({ style: 'primary', ...b })),
})
const steps = (items: readonly { title: string; body: string }[]): Block => ({ type: 'steps', version: 1, items: items.map((s) => ({ title: s.title, text: s.body })) })
type Card = { title: string; text: string; href?: string; icon?: string }
/** Cards, six to a block (the most one holds) */
const cards = (items: readonly Card[]): Block[] => {
  const out: Block[] = []
  for (let i = 0; i < items.length; i += 6) out.push({ type: 'cards', version: 1, items: items.slice(i, i + 6).map((c) => ({ href: '', icon: '', ...c })) })
  return out
}
const faq = (items: { q: string; a: (string | [string, string])[] }[]): Block => ({
  ...element,
  type: 'faq',
  children: items.map(({ q, a }) => ({
    ...element,
    type: 'faq-item',
    children: [
      { ...element, type: 'faq-question', children: [text(q)] },
      { ...element, type: 'faq-answer', children: [paragraph(...a)] },
    ],
  })),
})
const bullets = (items: readonly (string | [string, string])[][]): Block => ({
  ...element,
  type: 'list',
  listType: 'bullet',
  start: 1,
  tag: 'ul',
  children: items.map((parts, i) => ({ ...element, type: 'listitem', value: i + 1, children: inline(...parts) })),
})
const doc = (...blocks: (Block | Block[])[]) => JSON.stringify({ root: { ...element, type: 'root', children: blocks.flat() } })

export interface SitePageSeed {
  slug: string
  title: string
  subtitle: string
  description: string
  sections: { id: string; title: string; subtitle: string; anchor: string; body: string }[]
}

const section = (title: string, subtitle: string, body: string, anchor = '') => ({ id: randomUUID(), title, subtitle, anchor, body })

// ── The pages ────────────────────────────────────────────────────────────────

const about: SitePageSeed = {
  slug: 'about',
  title: 'About CSEG',
  subtitle: CLUB_DESCRIPTION.short,
  description: CLUB_DESCRIPTION.oneLiner,
  sections: [
    section(
      'Mission & purpose',
      '',
      doc(
        cards([
          { title: 'Mission', text: CLUB_DESCRIPTION.mission },
          { title: 'Purpose', text: CLUB_DESCRIPTION.purpose },
        ])
      )
    ),
    section(
      'What we focus on',
      'How CSEG helps Panthers from day one to graduation.',
      doc(
        cards([
          { icon: 'map', title: 'Navigating campus', text: 'The social and physical sides of Georgia State: where things are, how they work, and how to find your place.' },
          { icon: 'steps', title: 'Getting things done', text: 'Help with the necessary tasks for getting through college, so the paperwork and processes never hold you back.' },
          { icon: 'book', title: 'Underutilized resources', text: 'GSU offers more support than most students ever use. We help you understand what is out there and how to use it.', href: '/resources' },
          { icon: 'school', title: 'Graduating', text: 'Everything we do points toward the finish line: helping Panthers stay on track all the way to graduation.' },
        ])
      )
    ),
    section(
      'Common questions',
      '',
      doc(
        faq([
          { q: 'Who can join?', a: ['Any Georgia State student. CSEG is open to every major and every year, whether you are brand new to campus or almost done.'] },
          {
            q: 'Is CSEG only for freshmen?',
            a: ['No. New students get a lot out of CSEG, but transfer students, commuters, and upperclassmen are just as welcome, and experienced members help newer ones find their footing.'],
          },
          { q: 'How do I join?', a: ['Request membership on our ', ['PIN page', SOCIAL_LINKS.pin], ', then come to an event. See ', ['Join', '/join'], ' for details.'] },
          { q: 'How do I hear about events?', a: ['Events are posted on ', ['PIN', SOCIAL_LINKS.pin], ' and announced on ', ['Instagram', SOCIAL_LINKS.instagram], '.'] },
        ]),
        callout('info', 'Still have questions? ', ['Send the officers a message', '/contact'], '. We’re happy to help.')
      ),
      // The header's FAQ link goes to /about#faq
      'faq'
    ),
    section(
      'Ready to get involved?',
      'Every Panther is welcome. Come find your footing with us.',
      doc(
        buttons([
          { label: 'Join CSEG', href: '/join' },
          { label: 'See events', href: '/events', style: 'outline' },
        ])
      )
    ),
  ],
}

const join: SitePageSeed = {
  slug: 'join',
  title: 'Join CSEG',
  subtitle: 'Membership is open to every Georgia State student. No experience or application essay required, just a willingness to show up.',
  description: 'How to become a member of the Campus Survival and Engagement Group at Georgia State.',
  sections: [
    section(
      'How it works',
      '',
      doc(
        steps(JOIN_STEPS),
        buttons([
          { label: 'Join on PIN', href: SOCIAL_LINKS.pin },
          { label: 'Read the FAQ', href: '/about#faq', style: 'outline' },
        ])
      )
    ),
    section('Questions before you join?', 'Reach out to the officers and we’ll get back to you.', doc(buttons([{ label: 'Contact us', href: '/contact', style: 'outline' }]))),
  ],
}

const SOCIAL: Record<keyof typeof SOCIAL_LINKS, { label: string; detail: string }> = {
  instagram: { label: 'Instagram', detail: '@cseg_gsu' },
  x: { label: 'X (Twitter)', detail: '@cseg_gsu' },
  pin: { label: 'PIN', detail: 'Panther Involvement Network' },
}

const contact: SitePageSeed = {
  slug: 'contact',
  title: 'Get in touch',
  subtitle: 'Questions, partnerships, or ideas for an event? Email is the best way to reach the officers.',
  description: 'Reach the Campus Survival and Engagement Group by email or on social media.',
  sections: [
    section('Email the officers', '', doc(cards([{ icon: 'mail', title: CONTACT_EMAIL, text: 'The best way to reach us. We read every message.', href: `mailto:${CONTACT_EMAIL}` }]))),
    section(
      'Find us online',
      '',
      doc(
        cards(
          (Object.keys(SOCIAL_LINKS) as (keyof typeof SOCIAL_LINKS)[])
            .filter((n) => SOCIAL_LINKS[n])
            .map((n) => ({ title: SOCIAL[n].label, text: SOCIAL[n].detail, href: SOCIAL_LINKS[n] }))
        )
      )
    ),
  ],
}

/** Each resource group's icon, as a card icon */
const GROUP_ICON = new Map<LucideIcon, string>([
  [BookOpen, 'book'],
  [Wallet, 'money'],
  [HeartPulse, 'health'],
  [HeartHandshake, 'support'],
  [Building2, 'building'],
  [Users, 'people'],
  [Sparkles, 'sparkle'],
  [GraduationCap, 'school'],
])

const resources: SitePageSeed = {
  slug: 'resources',
  title: 'Student resources',
  subtitle:
    'Georgia State offers more support than most students ever use. These are the links we point Panthers to most, from registering for classes to finding free food.',
  description: 'Links to Georgia State services for academics, money, health, housing, and getting involved, plus GSU colleges and student group chats.',
  sections: [
    // Each group keeps its #link (the header's Resources menu links to them)
    ...RESOURCE_GROUPS.map((g) =>
      section(g.title, g.description, doc(cards(g.links.map((l) => ({ title: l.label, text: l.description, href: l.href, icon: GROUP_ICON.get(g.Icon) ?? '' })))), g.id)
    ),
    section(
      'Group chats',
      'Student-run GroupMe chats. Be kind, and never share personal or financial info with someone you haven’t met.',
      doc(cards(GROUP_CHATS.map((l) => ({ title: l.label, text: l.description, href: l.href, icon: 'chat' })))),
      'chats'
    ),
    section('Can’t find what you need?', 'Tell us what you’re looking for and we’ll point you in the right direction.', doc(buttons([{ label: 'Ask the officers', href: '/contact', style: 'outline' }]))),
  ],
}

/**
 * An area's places to eat, as a References block: drawn live from the dashboard's eateries
 * (with "Open now" and map links), so the page never holds a copy of them
 */
const eateries = (area: EatArea, kind: EateryKind = 'all'): Block => ({ type: 'reference', version: 1, items: [{ kind: 'eateries', ref: eateriesRef(area, kind) }] })

const eaterySection = (title: string, subtitle: string, area: EatArea, kind: EateryKind = 'all', anchor = '') => section(title, subtitle, doc(eateries(area, kind)), anchor)

const eat: SitePageSeed = {
  slug: 'eat',
  title: 'Places to eat',
  subtitle: 'Campus dining halls, on-campus eateries, and nearby restaurants, cafés, quick bites, and late-night spots around Georgia State’s downtown campus.',
  description: 'Campus dining halls, on-campus eateries, and nearby restaurants, cafés, and late-night spots around Georgia State’s downtown campus.',
  sections: [
    section(
      'Before you head out',
      '',
      doc(
        callout(
          'info',
          `Checked ${EATS_CHECKED}. Restaurants, hours, and menus change by semester, holiday, and break. Every place here was confirmed open against PantherDining or the Downtown Atlanta dining directory, but check today’s hours before you walk over. Hours are only listed where an official source gives them.`
        ),
        buttons([
          { label: 'See food on the map', href: '/map?category=food' },
          { label: 'PantherDining hours', href: 'https://dining.gsu.edu/locations-and-hours/', style: 'outline' },
        ])
      )
    ),
    // Each area keeps its #link from the code's page
    eaterySection('Dining halls', EAT_AREAS.campus.description ?? '', 'campus', 'dining-halls', 'campus'),
    eaterySection('On-campus eateries & cafés', '', 'campus', 'others'),
    ...EAT_AREA_LIST.filter((a) => a !== 'campus').map((a) => eaterySection(EAT_AREAS[a].title, EAT_AREAS[a].description ?? '', a, 'all', a)),
    section('A little farther', '', doc(paragraph('Also in the Downtown Atlanta directory: ', MORE_EATS.map((m) => `${m.name} (${m.address})`).join(', '), '.'))),
    section('Quick tips', '', doc(bullets(EAT_TIPS.map((t) => [t])))),
    section('Useful links', '', doc(bullets(EAT_LINKS.map((l) => [[l.label, l.href]])))),
  ],
}

export const SITE_PAGE_SEEDS: readonly SitePageSeed[] = [about, join, contact, resources, eat]
