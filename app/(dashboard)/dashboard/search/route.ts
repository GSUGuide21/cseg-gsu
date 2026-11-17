import type { NextRequest } from 'next/server'

import { getDashboardSearchIndex } from '@/lib/dashboard/searchIndex'
import { asResult, searchWithTotal, type SearchEntry, type SearchResult } from '@/lib/search'

const MAX_QUERY = 200
const MAX_RESULTS = 40

/** Lifts what officers look for most: people, and what's being written */
const BOOST: Readonly<Record<string, number>> = { Member: 2, 'Join request': 2, Post: 1, Page: 1, Event: 1 }

/** What was changed most recently, of what's being written: before anything's typed */
const recent = (entries: readonly SearchEntry[]): SearchResult[] =>
  entries
    .filter((e) => (e.kind === 'Post' || e.kind === 'Page' || e.kind === 'Presentation') && e.date)
    .sort((a, b) => Date.parse(b.date!) - Date.parse(a.date!))
    .slice(0, 6)
    .map((e) => asResult(e))

/**
 * The dashboard's search, for its full-screen search box: /dashboard/search?q=fall. Officers
 * only (anyone else is sent to sign in), reading as the officer asking, so what they can't
 * see isn't found. Nothing is kept between searches: it's private, and drafts change often.
 * With no search, what was changed most recently.
 */
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, MAX_QUERY)
  // Only one kind's results (from a filter chip); the counts still cover them all
  const kind = request.nextUrl.searchParams.get('kind')?.slice(0, 40) || null
  const headers = { 'Cache-Control': 'private, no-store' }
  const index = await getDashboardSearchIndex()
  if (!query) return Response.json({ query, results: [], total: 0, kinds: {}, suggested: recent(index) }, { headers })
  return Response.json({ query, kind, ...searchWithTotal(index, query, { limit: MAX_RESULTS, boost: BOOST, kind }) }, { headers })
}
