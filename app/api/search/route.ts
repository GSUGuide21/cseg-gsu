import type { NextRequest } from 'next/server'

import { SITE_BOOST } from '@/globals/Search/siteBoost'
import { getSearchIndex } from '@/lib/dashboard/public'
import { asResult, searchWithTotal, type SearchEntry } from '@/lib/search'

/** How long the site's index is kept between searches; what's published shows within this */
const KEEP_MS = 5 * 60 * 1000
const MAX_QUERY = 200
const MAX_RESULTS = 40

let kept: { at: number; index: Promise<SearchEntry[]> } | null = null

/** The site's index, built once and kept a few minutes: a search runs on each keystroke */
const index = () => {
  if (!kept || Date.now() - kept.at > KEEP_MS) {
    const building = getSearchIndex()
    kept = { at: Date.now(), index: building }
    // A failed build isn't kept, so the next search tries again
    building.catch(() => {
      if (kept?.index === building) kept = null
    })
  }
  return kept.index
}

/**
 * What's worth showing before anything's typed: the next few events, the latest news, and
 * the newest photos, mixed
 */
const suggested = (entries: readonly SearchEntry[], now = Date.now()) => {
  const at = (e: SearchEntry) => Date.parse(e.date ?? '') || 0
  const events = entries.filter((e) => e.kind === 'Event' && at(e) >= now - 6 * 3600 * 1000).sort((a, b) => at(a) - at(b))
  const posts = entries.filter((e) => e.kind === 'Post').sort((a, b) => at(b) - at(a))
  const photos = entries.filter((e) => e.kind === 'Photos').sort((a, b) => at(b) - at(a))
  // Nothing coming up: the most recent ones instead, so there's still something on to show
  const shownEvents = events.length ? events.slice(0, 3) : entries.filter((e) => e.kind === 'Event').sort((a, b) => at(b) - at(a)).slice(0, 2)
  return [...shownEvents, ...posts.slice(0, 2), ...photos.slice(0, 1)].map((e) => asResult(e))
}

/**
 * The site's search, for the full-screen search box: /api/search?q=parking. Only what's
 * published, so anyone may ask. Answers with the best matches (each with what a result can
 * show: a picture, a date, a line of detail) and how many matched in all. With no search,
 * what's worth suggesting: the next events, the latest news and photos.
 */
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY)
  // Only one kind's results (from a filter chip); the counts still cover them all
  const kind = request.nextUrl.searchParams.get('kind')?.slice(0, 40) || null
  const headers = { 'Cache-Control': 'public, max-age=60' }
  if (!query) return Response.json({ query, results: [], total: 0, kinds: {}, suggested: suggested(await index()) }, { headers })
  return Response.json({ query, kind, ...searchWithTotal(await index(), query, { limit: MAX_RESULTS, boost: SITE_BOOST, kind }) }, { headers })
}
