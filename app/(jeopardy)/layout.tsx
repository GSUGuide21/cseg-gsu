import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Jeopardy',
  description: 'CSEG’s campus trivia game, for club meetings and events: teams, a board of clues, and Final Jeopardy.',
  // Never in search results, even if a dev build is reachable
  robots: { index: false, follow: false },
}

/**
 * The jeopardy game, full screen for a projector: none of the site's header or footer
 * (those are the (page) group's). The html and body are the site's root layout's.
 *
 * Only served by `next dev`, as the /dev pages are: Next sets NODE_ENV to "production" for
 * builds, so the live site answers /jeopardy (and /jeopardy/game) with a 404. Run it from
 * `npm run dev` on the computer at the projector.
 */
export default function JeopardyLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== 'development') notFound()
  return children
}
