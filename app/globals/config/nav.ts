export type NavLink = {
  readonly href: string
  readonly label: string
}

export type NavMenuLink = NavLink & {
  /** One line under the label in the desktop subnav */
  readonly description?: string
}

export type NavItem = NavLink & {
  /** Full-width subnav shown under the header on desktop, nested links on mobile */
  readonly menu?: {
    /** Intro line in the subnav's first column */
    readonly description: string
    readonly links: readonly NavMenuLink[]
  }
}

export const NAV_LINKS: readonly NavItem[] = [
  { href: '/', label: 'Home' },
  {
    href: '/about',
    label: 'About',
    menu: {
      description: 'A student organization helping Panthers make the most of campus life.',
      links: [
        { href: '/about', label: 'About CSEG', description: 'Mission, vision, and what we do' },
        { href: '/executives', label: 'Executives', description: 'The students who lead CSEG' },
        { href: '/about#faq', label: 'FAQ', description: 'Common questions, answered' },
        { href: '/constitution', label: 'Constitution', description: 'How CSEG is organized and run' },
        { href: '/affiliates', label: 'Affiliates', description: 'The organizations we partner with' },
        { href: '/contact', label: 'Contact', description: 'Get in touch with the officers' },
      ],
    },
  },
  { href: '/events', label: 'Events' },
  {
    href: '/map',
    label: 'Map',
    menu: {
      description: 'Find your way around Georgia State’s downtown campus.',
      links: [
        { href: '/map', label: 'Campus map', description: 'Buildings, parking, MARTA, and more' },
        { href: '/eat', label: 'Places to eat', description: 'Dining halls and food near campus' },
      ],
    },
  },
  {
    href: '/resources',
    label: 'Resources',
    menu: {
      description: 'The GSU services and student communities we point Panthers to most.',
      links: [
        { href: '/resources', label: 'Student resources', description: 'Academics, money, health, and campus life' },
        { href: '/resources#student-life', label: 'Student Life', description: 'Orientation, organizations, and campus programs' },
        { href: '/resources#colleges', label: 'Colleges & schools', description: 'Find your college or department' },
        { href: '/resources#chats', label: 'Group chats', description: 'Student GroupMe communities' },
      ],
    },
  },
  { href: '/join', label: 'Join' },
  { href: '/contact', label: 'Contact' },
] as const

export type FooterNavSection = { readonly title: string; readonly links: readonly NavLink[] }

export const FOOTER_NAV_SECTIONS: readonly FooterNavSection[] = [
  {
    title: 'About',
    links: [
      { href: '/about', label: 'About CSEG' },
      { href: '/executives', label: 'Executives' },
      { href: '/constitution', label: 'Constitution' },
      { href: '/affiliates', label: 'Affiliates' },
      { href: '/about#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Campus',
    links: [
      { href: '/map', label: 'Campus map' },
      { href: '/eat', label: 'Places to eat' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/resources', label: 'Student resources' },
      { href: '/resources#student-life', label: 'Student Life' },
      { href: '/resources#colleges', label: 'Colleges & schools' },
      { href: '/resources#chats', label: 'Group chats' },
    ],
  },
  {
    title: 'Get involved',
    links: [
      { href: '/events', label: 'Events' },
      { href: '/join', label: 'Join' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Officers',
    links: [{ href: '/dashboard', label: 'Dashboard' }],
  },
]

/**
 * The menu with the pages officers added from the dashboard: one page is its own item, and
 * more than one share a More menu (which opens the first of them when clicked itself).
 */
export const navWithPages = (links: readonly NavItem[], pages: readonly NavMenuLink[]): readonly NavItem[] => {
  if (!pages.length) return links
  if (pages.length === 1) return [...links, { href: pages[0].href, label: pages[0].label }]
  return [...links, { href: pages[0].href, label: 'More', menu: { description: 'More from CSEG, written by the officers.', links: pages } }]
}

/** The footer's sections (the built-in ones unless given), with a More section for the pages officers listed there */
export const footerWithPages = (pages: readonly NavLink[], sections: readonly FooterNavSection[] = FOOTER_NAV_SECTIONS) => (pages.length ? [...sections, { title: 'More', links: pages }] : sections)

export const isNavActive = (pathname: string, href: string): boolean =>
  href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`)
