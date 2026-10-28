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
        { href: '/about#faq', label: 'FAQ', description: 'Common questions, answered' },
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

export const FOOTER_NAV_SECTIONS: readonly { title: string; links: readonly NavLink[] }[] = [
  {
    title: 'Explore',
    links: [
      { href: '/', label: 'Home' },
      { href: '/about', label: 'About' },
      { href: '/events', label: 'Events' },
      { href: '/map', label: 'Campus map' },
      { href: '/eat', label: 'Places to eat' },
      { href: '/resources', label: 'Resources' },
      { href: '/about#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Get involved',
    links: [
      { href: '/join', label: 'Join' },
      { href: '/contact', label: 'Contact' },
    ],
  },
]

export const isNavActive = (pathname: string, href: string): boolean =>
  href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`)
