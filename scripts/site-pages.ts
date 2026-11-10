/**
 * The site's own pages (About, Join, Contact, Resources, Places to Eat, Constitution) as dashboard pages:
 * the same words, laid out in sections of the editor's blocks (cards, an FAQ, steps, a
 * callout, buttons, a list, live References). seed-site-pages.ts writes them to Supabase as
 * drafts; once an officer publishes one, it shows at the page's own path in place of the
 * code's version.
 *
 * Built from the same data the code's pages use, so the two say the same thing.
 */
import { randomUUID } from 'node:crypto'

import { JOIN_STEPS } from '../app/globals/config/club'
import { CLUB_DESCRIPTION } from '../app/globals/config/site'
import { CONTACT_EMAIL, SOCIAL_LINKS } from '../app/globals/config/social'
import { formatDate } from '../app/lib/dashboard/format'
import {
  articleHeading,
  articleId,
  CONSTITUTION_ARTICLES,
  CONSTITUTION_GLOSSARY,
  CONSTITUTION_HISTORY,
  CONSTITUTION_TERM,
  type ConstitutionBlock,
  type ConstitutionItem,
  GLOSSARY_ID,
  HISTORY_ID,
  sectionHeading,
  withLinks,
} from '../app/lib/data/constitution'
import { EAT_LINKS, EAT_TIPS, EATERIES, EATS_CHECKED, MORE_EATS } from '../app/lib/data/eats'
import { getPlace } from '../app/lib/data/places'
import { BUILT_IN_AREAS, eateryMapId, findArea, type EatArea, type EateryKind } from '../app/lib/eateries'
import { eateriesRef } from '../app/lib/references'
import { BUILT_IN_RESOURCE_GROUPS } from '../app/lib/resources'

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
  /** Lists its sections under the title ("On this page") */
  showToc?: boolean
  sections: { id: string; title: string; subtitle: string; anchor: string; body: string }[]
}

const section = (title: string, subtitle: string, body: string, anchor = '') => ({ id: randomUUID(), title, subtitle, anchor, body })

// ── The pages ────────────────────────────────────────────────────────────────

/** About's core values: a Core values block, under the #values link */
export const CORE_VALUES_SECTION = () =>
  section('Our core values', 'What guides everything CSEG does, and spells where we do it.', doc({ type: 'core-values', version: 1 }), 'values')

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
    // The Core values block draws them from the site's own list, as the code's page does
    CORE_VALUES_SECTION(),
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
  groupme: { label: 'GroupMe', detail: 'Chat with members' },
  linktree: { label: 'Linktree', detail: 'Every CSEG link' },
  discord: { label: 'Discord', detail: 'Chat with members' },
  linkedin: { label: 'LinkedIn', detail: 'Alumni and news' },
  youtube: { label: 'YouTube', detail: 'Recordings and recaps' },
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

const resources: SitePageSeed = {
  slug: 'resources',
  title: 'Student resources',
  subtitle:
    'Georgia State offers more support than most students ever use. These are the links we point Panthers to most, from registering for classes to finding free food.',
  description: 'Links to Georgia State services for academics, money, health, housing, and getting involved, plus GSU colleges and student group chats.',
  sections: [
    // Each group live from the dashboard's resources, keeping its #link (the header's Resources menu links to them)
    ...BUILT_IN_RESOURCE_GROUPS.map((g) => section(g.title, g.description ?? '', doc({ type: 'reference', version: 1, items: [{ kind: 'resources', ref: g.slug }] }), g.slug)),
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
    eaterySection('Dining halls', findArea(BUILT_IN_AREAS, 'campus')?.description ?? '', 'campus', 'dining-halls', 'campus'),
    eaterySection('On-campus eateries & cafés', '', 'campus', 'others'),
    ...BUILT_IN_AREAS.filter((a) => a.slug !== 'campus').map((a) => eaterySection(a.title, a.description ?? '', a.slug, 'all', a.slug)),
    section('A little farther', '', doc(paragraph('Also in the Downtown Atlanta directory: ', MORE_EATS.map((m) => `${m.name} (${m.address})`).join(', '), '.'))),
    section('Quick tips', '', doc(bullets(EAT_TIPS.map((t) => [t])))),
    section('Useful links', '', doc(bullets(EAT_LINKS.map((l) => [[l.label, l.href]])))),
  ],
}

/** A numbered list; an item with its own list holds it as Lexical does, in an item of its own after it */
const numbered = (items: readonly ConstitutionItem[]): Block => ({
  ...element,
  type: 'list',
  listType: 'number',
  start: 1,
  tag: 'ol',
  children: items.flatMap((item, i) => {
    const words = { ...element, type: 'listitem', value: i + 1, children: inline(...withLinks(typeof item === 'string' ? item : item.text)) }
    return typeof item === 'string' ? [words] : [words, { ...element, type: 'listitem', value: i + 2, children: [numbered(item.items)] }]
  }),
})
const heading = (tag: 'h3', words: string): Block => ({ ...element, type: 'heading', tag, children: [text(words)] })
const constitutionBlocks = (blocks: readonly ConstitutionBlock[]) => blocks.map((b) => (typeof b === 'string' ? paragraph(...withLinks(b)) : numbered(b.items)))

// Each article a section, with its own sections under headings, then the appendix
const constitution: SitePageSeed = {
  slug: 'constitution',
  title: 'Constitution',
  subtitle: `The document that sets out how CSEG is organized and run, as registered with Georgia State. This is the ${CONSTITUTION_TERM} constitution.`,
  description: 'The constitution of the Campus Survival and Engagement Group at Georgia State.',
  showToc: true,
  sections: [
    ...CONSTITUTION_ARTICLES.map((a, i) =>
      section(
        articleHeading(i, a),
        '',
        doc(...constitutionBlocks(a.blocks ?? []), ...(a.sections ?? []).flatMap((s, j) => [heading('h3', sectionHeading(j, s)), ...constitutionBlocks(s.blocks)])),
        articleId(i)
      )
    ),
    section(
      'Glossary',
      '',
      doc(
        bullets(
          CONSTITUTION_GLOSSARY.map(({ term, definition }) => [`${term}: `, ...withLinks(definition)])
        )
      ),
      GLOSSARY_ID
    ),
    section(
      'Amendments and history',
      '',
      doc(bullets(CONSTITUTION_HISTORY.map(({ date, note }) => [`${formatDate(date)}: ${note}`]))),
      HISTORY_ID
    ),
  ],
}

export const SITE_PAGE_SEEDS: readonly SitePageSeed[] = [about, join, contact, resources, eat, constitution]

// ── Starter pages: new pages of the dashboard's own, not the site's ────────────

type Pick = { title: string; subtitle: string; description: string }

/** The longest a pick's line under its title is kept (RANKING_SUBTITLE_MAX in app/lib/richtext/blocks/ranking.tsx) */
const PICK_SUBTITLE_MAX = 150

/** A Ranking block: its picks in order, best first */
const ranking = (items: readonly Pick[]): Block => ({ type: 'ranking', version: 1, items })

/**
 * A pick from the site's own data, so its words match the rest of the site: an eatery's
 * name, its address and official hours (hours only where a source gives them), what it is,
 * and a link to its pin. Hours that don't fit beside the address go with the description.
 */
const eateryPick = (id: string, why = ''): Pick => {
  const e = EATERIES.find((x) => x.id === id)
  if (!e) throw new Error(`No eatery ${id} in app/lib/data/eats.ts`)
  const map = eateryMapId(e)
  const withHours = e.hours ? `${e.address} · ${e.hours}` : e.address
  const fits = withHours.length <= PICK_SUBTITLE_MAX
  return {
    title: e.name,
    subtitle: fits ? withHours : e.address.slice(0, PICK_SUBTITLE_MAX),
    description: [why, e.description, !fits && e.hours ? `**Hours:** ${e.hours}` : '', map ? `[Show on map](/map?place=${map})` : ''].filter(Boolean).join(' '),
  }
}

/** A place on the campus map, as a pick */
const placePick = (id: string, why = ''): Pick => {
  const p = getPlace(id)
  if (!p) throw new Error(`No place ${id} in app/lib/data/places.ts`)
  return { title: p.name, subtitle: p.address ?? '', description: [why, p.description, `[Show on map](/map?place=${p.id})`].filter(Boolean).join(' ') }
}

/**
 * Panther Picks, at /pages/panther-picks: the club's top lists, each a Ranking. The picks
 * and their words come from the site's data; the order is a starting point for officers
 * to settle before it's published.
 */
const pantherPicks: SitePageSeed = {
  slug: 'panther-picks',
  title: 'Panther Picks',
  subtitle: 'CSEG’s top lists for getting through the semester: where to eat late, where to get coffee, and where to study.',
  description: 'CSEG’s ranked picks for late-night food, coffee, and study spots around Georgia State’s downtown campus.',
  sections: [
    section(
      'Before you go',
      '',
      doc(
        callout('info', 'These are our picks, not an official list. Hours change by semester and break, so check before you head out. ', ['Every place to eat', '/eat'], ' has more.')
      )
    ),
    section(
      'Late-night eats',
      'For when the library closes and you’re still hungry.',
      doc(
        ranking([
          eateryPick('piedmont-central-dining', 'The only all-night option on campus, on weeknights.'),
          eateryPick('shahs-halal', 'Open until 2 a.m. on weekends.'),
          eateryPick('saxbys', 'Right in the library, open until midnight most weeknights.'),
          eateryPick('anatolia-cafe', 'Open until 2 a.m. Fridays and Saturdays.'),
          eateryPick('hungry-af'),
          eateryPick('stoners-pizza'),
        ])
      ),
      'late-night'
    ),
    section(
      'Coffee on and near campus',
      'Between classes, or before an 8 a.m.',
      doc(
        ranking([
          eateryPick('saxbys', 'Inside the library, so it’s on the way to studying.'),
          eateryPick('costa-coffee', 'Four self-serve spots in campus buildings.'),
          eateryPick('highland-bakery', 'Right on Woodruff Park.'),
          eateryPick('hansel-and-gretel'),
          eateryPick('land-of-a-thousand-hills'),
          eateryPick('legal-grounds'),
        ])
      ),
      'coffee'
    ),
    section(
      'Places to study',
      'Where to settle in for a few hours.',
      doc(
        ranking([
          placePick('library-north', 'The default for a reason: space, computers, printing, and coffee downstairs.'),
          placePick('library-south'),
          placePick('curve', 'For group projects with data or maps.'),
        ])
      ),
      'study'
    ),
  ],
}

/** New pages to start the dashboard with; they show at /pages/<slug> once published */
export const STARTER_PAGE_SEEDS: readonly SitePageSeed[] = [pantherPicks]
