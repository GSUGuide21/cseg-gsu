import { cache } from 'react'

import { TOURS, type Tour } from '@/lib/data/tour'
import { atlantaToday } from '@/lib/eateries'
import { createPublicClient } from '@/lib/supabase/server'

import type { AlbumRow, DocumentRow, FormRow, OpportunityRow, PollResults, PollRow, TestimonialRow, TourRow } from './types'

/**
 * What the public site reads of the smaller kinds of content: only what's shown. No session,
 * so these pages can be cached. Without Supabase (or before a migration has run) each reads
 * as empty, so the site still works.
 */

const quietly = async <T>(fallback: T, run: () => PromiseLike<{ data: T | null; error: unknown }>): Promise<T> => {
  try {
    const { data, error } = await run()
    return error || data === null ? fallback : data
  } catch {
    return fallback
  }
}

/** Shown albums, newest first */
export const getAlbums = cache(async (): Promise<AlbumRow[]> => {
  const supabase = createPublicClient()
  if (!supabase) return []
  return quietly<AlbumRow[]>([], () => supabase.from('albums').select('*').eq('published', true).order('taken_on', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }))
})

export async function getAlbum(slug: string): Promise<AlbumRow | null> {
  const supabase = createPublicClient()
  if (!supabase) return null
  return quietly<AlbumRow | null>(null, () => supabase.from('albums').select('*').eq('published', true).eq('slug', slug).maybeSingle())
}

/** A tour as officers keep it, in the shape the map reads */
export const tourFromRow = (row: Pick<TourRow, 'slug' | 'title' | 'label' | 'intro' | 'stops'>): Tour => ({
  id: row.slug,
  title: row.title,
  label: row.label,
  intro: row.intro,
  stops: (Array.isArray(row.stops) ? row.stops : []).map((s) => ({ placeId: s.placeId, title: s.title, why: s.why, ...(s.tip ? { tip: s.tip } : {}) })),
})

/** The map's tours: the dashboard's, in order; until there are any, the ones built into the site */
export const getTours = cache(async (): Promise<readonly Tour[]> => {
  const supabase = createPublicClient()
  if (!supabase) return TOURS
  const rows = await quietly<TourRow[]>([], () => supabase.from('tours').select('*').eq('published', true).order('sort').order('title'))
  const tours = rows.map(tourFromRow).filter((t) => t.stops.length)
  return tours.length ? tours : TOURS
})

/** The library: shown documents, in their categories' order */
export const getDocuments = cache(async (): Promise<DocumentRow[]> => {
  const supabase = createPublicClient()
  if (!supabase) return []
  return quietly<DocumentRow[]>([], () => supabase.from('documents').select('*').eq('published', true).order('category').order('sort').order('title'))
})

export const getTestimonials = cache(async (): Promise<TestimonialRow[]> => {
  const supabase = createPublicClient()
  if (!supabase) return []
  return quietly<TestimonialRow[]>([], () => supabase.from('testimonials').select('*').eq('published', true).order('sort').order('name'))
})

/** Opportunities still open: no deadline, or one that hasn't passed, the soonest first */
export const getOpportunities = cache(async (): Promise<OpportunityRow[]> => {
  const supabase = createPublicClient()
  if (!supabase) return []
  const today = atlantaToday()
  const rows = await quietly<OpportunityRow[]>([], () => supabase.from('opportunities').select('*').eq('published', true).order('deadline', { ascending: true, nullsFirst: false }).order('title'))
  return rows.filter((o) => !o.deadline || o.deadline >= today)
})

/** Shown polls and quizzes, newest first */
export const getPolls = cache(async (): Promise<PollRow[]> => {
  const supabase = createPublicClient()
  if (!supabase) return []
  return quietly<PollRow[]>([], () => supabase.from('polls').select('*').eq('published', true).order('created_at', { ascending: false }))
})

export async function getPoll(slug: string): Promise<PollRow | null> {
  const supabase = createPublicClient()
  if (!supabase) return null
  return quietly<PollRow | null>(null, () => supabase.from('polls').select('*').eq('published', true).eq('slug', slug).maybeSingle())
}

/** How everyone answered a poll, when it shares that; null when it doesn't */
export async function getPollResults(pollId: string): Promise<PollResults | null> {
  const supabase = createPublicClient()
  if (!supabase) return null
  return quietly<PollResults | null>(null, async () => {
    const { data, error } = await supabase.rpc('poll_results', { p_poll: pollId })
    return { data: data as PollResults | null, error }
  })
}

export async function getForm(slug: string): Promise<FormRow | null> {
  const supabase = createPublicClient()
  if (!supabase) return null
  return quietly<FormRow | null>(null, () => supabase.from('forms').select('*').eq('published', true).eq('slug', slug).maybeSingle())
}
