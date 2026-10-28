import { CalendarHeart, Compass, LifeBuoy, Users, type LucideIcon } from 'lucide-react'

/** What the club offers; shown on the homepage and About page. */
export const CLUB_OFFERINGS: readonly { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Compass,
    title: 'Campus know-how',
    body: 'Where to go, who to ask, and the tips upperclassmen wish they had known as freshmen.',
  },
  {
    Icon: LifeBuoy,
    title: 'Student resources',
    body: 'Connect with GSU services for academics, wellness, finances, and everything in between.',
  },
  {
    Icon: CalendarHeart,
    title: 'Events',
    body: 'Discussions, talent showcases, and meetups that make it easy to show up and get involved.',
  },
  {
    Icon: Users,
    title: 'Community',
    body: 'Meet other Panthers, make friends, and find your people on campus.',
  },
]

/** How joining works; shown on the homepage and Join page. */
export const JOIN_STEPS: readonly { title: string; body: string }[] = [
  { title: 'Join on PIN', body: 'Request membership on our Panther Involvement Network page.' },
  { title: 'Come to an event', body: 'Drop by a meeting or event and meet the officers and members.' },
  { title: 'Get involved', body: 'Help plan events, share what you know, and grow with the group.' },
]
