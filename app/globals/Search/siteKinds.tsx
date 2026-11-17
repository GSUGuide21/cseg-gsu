import { BarChart3, Briefcase, CalendarDays, Camera, ClipboardCheck, FileText, Link2, Mail, MapPin, MessagesSquare, Newspaper, Presentation, School, Share2, Utensils } from 'lucide-react'
import { FaDiscord, FaInstagram, FaLinkedin, FaXTwitter, FaYoutube } from 'react-icons/fa6'

import type { SearchKind } from '@/components'

/**
 * How the site's search shows each kind of result: its badge's color, its filter chip, and
 * what stands in for a picture. Events say whether they're upcoming or past.
 */
export const SITE_KINDS: Readonly<Record<string, SearchKind>> = {
  Page: { label: 'Pages', icon: <FileText /> },
  Event: { label: 'Events', icon: <CalendarDays />, tone: 'brand', dated: true, layout: 'media' },
  Post: { label: 'News', icon: <Newspaper />, tone: 'brand', layout: 'media' },
  Presentation: { label: 'Presentations', icon: <Presentation />, layout: 'media' },
  Photos: { label: 'Photos', icon: <Camera />, layout: 'media' },
  'On the map': { label: 'On the map', icon: <MapPin /> },
  'Place to eat': { label: 'Places to eat', icon: <Utensils /> },
  Resource: { label: 'Resources', icon: <Link2 /> },
  Opportunity: { label: 'Opportunities', icon: <Briefcase /> },
  Poll: { label: 'Polls', icon: <BarChart3 /> },
  Quiz: { label: 'Quizzes', icon: <ClipboardCheck /> },
  Social: { label: 'Socials', icon: <Share2 />, tone: 'accent', layout: 'chip' },
  Popular: { label: 'Popular', tone: 'brand' },
}

/** The filter chips' order */
export const SITE_ORDER = ['Popular', 'Event', 'Page', 'Post', 'Social', 'Presentation', 'Photos', 'On the map', 'Place to eat', 'Resource', 'Opportunity', 'Poll', 'Quiz'] as const

/** The icons a result can name: each social network's own */
export const SITE_ICONS = {
  instagram: <FaInstagram />,
  x: <FaXTwitter />,
  discord: <FaDiscord />,
  linkedin: <FaLinkedin />,
  youtube: <FaYoutube />,
  pin: <School />,
  groupme: <MessagesSquare />,
  linktree: <Link2 />,
  email: <Mail />,
}
