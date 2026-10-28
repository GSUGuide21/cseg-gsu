import { cache } from 'react'

import { EATERIES } from '@/lib/data/eats'
import type { Place, PlaceCategory } from '@/lib/data/places'
import { eateryFromRow, type Eatery } from '@/lib/eateries'
import type { SiteContent } from '@/lib/references'
import { createPublicClient } from '@/lib/supabase/server'
import type { EateryRow, MapPlaceRow, PageRow, PostRow } from '@/lib/supabase/types'

/**
 * What the public site reads from the dashboard: published posts, pages, and map pins.
 * No session, so these pages can be cached. Without Supabase configured (or if it's
 * unreachable) they read as empty, so the site still works.
 */

const quietly = async <T>(fallback: T, run: () => PromiseLike<{ data: T | null; error: unknown }>): Promise<T> => {
  try {
    const { data, error } = await run()
    return error || data === null ? fallback : data
  } catch {
    return fallback
  }
}

export async function getPublishedPosts() {
  const supabase = createPublicClient()
  if (!supabase) return []
  return quietly([], () =>
    supabase.from('posts').select('slug, title, excerpt, cover_image_url, published_at').eq('status', 'published').order('published_at', { ascending: false })
  )
}

export async function getPublishedPost(slug: string) {
  const supabase = createPublicClient()
  if (!supabase) return null
  return quietly<PostRow | null>(null, () => supabase.from('posts').select('*').eq('status', 'published').eq('slug', slug).maybeSingle())
}

export async function getPublishedPage(slug: string) {
  const supabase = createPublicClient()
  if (!supabase) return null
  return quietly<PageRow | null>(null, () => supabase.from('pages').select('*').eq('status', 'published').eq('slug', slug).maybeSingle())
}

/** A dashboard pin as a campus map place; its id is prefixed so it never clashes with a built-in one */
export const toPlace = (row: MapPlaceRow): Place => ({
  id: `club-${row.id}`,
  name: row.name,
  category: row.category as PlaceCategory,
  lat: row.lat,
  lng: row.lng,
  address: row.address ?? undefined,
  description: row.description || 'Added by CSEG officers.',
  aliases: ['CSEG', 'club'],
})

/**
 * The places to eat the site shows (the /eat page, Eateries blocks, the map's Food pins):
 * the dashboard's published ones, in each area's order, or the built-in list until the
 * eateries table has any (or when Supabase isn't set up).
 */
export const getEateries = cache(async (): Promise<readonly Eatery[]> => {
  const supabase = createPublicClient()
  if (!supabase) return EATERIES
  const rows = await quietly<EateryRow[]>([], () => supabase.from('eateries').select('*').eq('published', true).order('sort').order('name'))
  if (!rows.length) return EATERIES
  return rows.map(eateryFromRow).filter((e): e is Eatery => e !== null)
})

/** What the Eateries and References blocks draw from: the eateries, and the published posts and pages */
export const getSiteContent = cache(async (): Promise<SiteContent> => {
  const supabase = createPublicClient()
  const [eateries, posts, pages] = await Promise.all([
    getEateries(),
    supabase ? quietly<SiteContent['posts']>([], () => supabase.from('posts').select('slug, title, excerpt').eq('status', 'published')) : [],
    supabase ? quietly<SiteContent['pages']>([], () => supabase.from('pages').select('slug, title, description, subtitle').eq('status', 'published')) : [],
  ])
  return { eateries, posts, pages }
})

export async function getPublishedPlaces(): Promise<Place[]> {
  const supabase = createPublicClient()
  if (!supabase) return []
  const rows = await quietly<MapPlaceRow[]>([], () => supabase.from('map_places').select('*').eq('published', true))
  return rows.map(toPlace)
}
