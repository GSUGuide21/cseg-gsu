/**
 * The student organizations CSEG partners with, from the club's "Join CSEG and their
 * affiliates" flyer. Descriptions and logos are each organization's own, from its PIN page
 * (pin.gsu.edu/organization/<pinKey>); Outspoken@GSU has no public PIN page, so it has
 * only what the flyer gives.
 *
 * Officers edit them under Dashboard → Affiliates (the affiliates table); this list is what
 * the site shows until that has any, and what `npm run affiliates:seed` copies in.
 */

export type Affiliate = {
  /** Its page: /affiliates/<slug> */
  readonly slug: string
  /** Its full name, as PIN gives it */
  readonly name: string
  /** What it goes by, as the flyer names it */
  readonly shortName: string
  /** Its wordmark's two lines: the bold one, and the script one under it */
  readonly wordmark: { readonly top: string; readonly bottom: string }
  /** One line, for the list of affiliates */
  readonly summary?: string
  /** Its PIN description, a paragraph to a string */
  readonly description: readonly string[]
  /** Instagram handle, without the @ */
  readonly instagram: string
  /** Its PIN page's key */
  readonly pinKey?: string
  /** Its logo, a square image under public/ (its PIN profile picture, saved here) */
  readonly logo?: string
  readonly discord?: string
}

export const AFFILIATES: readonly Affiliate[] = [
  {
    slug: 'lead-team',
    name: 'Lead Team',
    shortName: 'LEAD Team',
    wordmark: { top: 'Lead', bottom: 'Team' },
    summary: 'Students developing leadership skills in a team-focused environment.',
    description: [
      'Do you have what it takes? Lead Team is a student organization bringing together students who are interested in developing leadership skills in a team-focused environment. Members are dedicated to the self-growth of each student by organizing and participating in workshops, meaningful events that impact the community, and networking within and beyond Lead Team.',
      'We are guided by values of S.E.R.V.I.C.E., which are essential for effective leadership in college and career: Support, Excellence, Respect, Vision, Integrity, Collaboration, and Empowerment.',
      'Lead Team is open to any student regardless of class level or major! Visit the Leadership Programs Office in Student Center West, Suite 475 for more information.',
    ],
    instagram: 'leadteamgsu',
    pinKey: 'lead-team',
    logo: '/affiliates/lead-team.jpg',
  },
  {
    slug: 'serve-at-state',
    name: 'Serve@State',
    shortName: 'Serve@State',
    wordmark: { top: 'Serve', bottom: '@State' },
    summary: 'Community service projects and leadership experiences for GSU students.',
    description: [
      'The purpose of this registered student organization is to provide students with opportunities to partake in leadership experiences, service projects, and address social issues in the community.',
      'Serve@State is determined to provide students with meaningful service and leadership opportunities to assist them in achieving their dreams, learning necessary life skills using service as the vehicle.',
    ],
    instagram: 'serveatstate.gsu',
    pinKey: 'serve',
    logo: '/affiliates/serve-at-state.jpg',
  },
  {
    slug: 'dream',
    name: 'DREAM: Disability Rights, Education, Activism, and Mentoring at Georgia State',
    shortName: 'DREAM @ GSU',
    wordmark: { top: 'DREAM', bottom: 'at Georgia State' },
    summary: 'A cultural and community center for students with disabilities.',
    description: [
      'DREAM is an organization that serves as a cultural/community center for students with disabilities. DREAM strongly advocates for disability rights, pride, representation, and inclusion.',
    ],
    instagram: 'dream_gsu',
    pinKey: 'dream',
    logo: '/affiliates/dream.jpg',
  },
  {
    slug: 'outspoken',
    name: 'Outspoken@GSU',
    shortName: 'Outspoken@GSU',
    wordmark: { top: 'Outspoken', bottom: '@GSU' },
    description: [],
    instagram: 'outspoken_gsu',
  },
  {
    slug: 'alliance',
    name: 'Alliance for Sexual and Gender Diversity',
    shortName: 'Alliance @ GSU',
    wordmark: { top: 'Alliance', bottom: 'at GSU' },
    summary: 'One of the oldest LGBTQ+ alliances in Georgia, supporting LGBTQ+ students on campus.',
    description: [
      'The Alliance for Sexual and Gender Diversity comprises of individuals from many backgrounds and represents a vast array of sexual, gender, and ethnic identities, all with a common purpose: to achieve queer liberation and provide for LGBTQ+ students on campus.',
      'Founded in 1982, the Alliance for Sexual and Gender Diversity is the oldest LGBTQ+ alliance in the state of Georgia. Created to cater to the queer student population at Georgia State University, Alliance at GSU is one of the largest chartered student organizations on campus, now with over 700 members!',
      'So come out and see all that Alliance has to offer you today!',
    ],
    instagram: 'allianceatstate',
    pinKey: 'alliance-for-sexual-and-gender-diversity',
    logo: '/affiliates/alliance.jpg',
    discord: 'https://discord.gg/SZ6ypEkTMK',
  },
]

export const getAffiliate = (slug: string) => AFFILIATES.find((a) => a.slug === slug)

export const affiliateHref = (a: Pick<Affiliate, 'slug'>) => `/affiliates/${a.slug}`
export const affiliateInstagram = (a: Pick<Affiliate, 'instagram'>) => `https://www.instagram.com/${a.instagram}/`
export const affiliatePin = (a: Pick<Affiliate, 'pinKey'>) => (a.pinKey ? `https://pin.gsu.edu/organization/${a.pinKey}` : undefined)
/** Its logo's address on the site */
export const affiliateLogo = (a: Pick<Affiliate, 'logo'>) => a.logo
