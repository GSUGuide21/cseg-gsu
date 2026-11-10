/**
 * The affiliates on /affiliates. Edited in the dashboard (the affiliates table); the list in
 * ./data/affiliates is what the site shows until it has any.
 */
import type { Affiliate } from './data/affiliates'
import type { AffiliateRow, Database } from './supabase/types'

/** Paragraphs as they're typed: a blank line between each */
export const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

export const affiliateFromRow = (row: AffiliateRow): Affiliate => ({
  slug: row.slug,
  name: row.name,
  shortName: row.short_name,
  wordmark: { top: row.wordmark_top, bottom: row.wordmark_bottom },
  summary: row.summary ?? undefined,
  description: paragraphs(row.description),
  instagram: row.instagram,
  pinKey: row.pin_key ?? undefined,
  logo: row.logo_url ?? undefined,
  discord: row.discord_url ?? undefined,
})

export const affiliateToRow = (a: Affiliate, sort: number): Database['public']['Tables']['affiliates']['Insert'] => ({
  slug: a.slug,
  name: a.name,
  short_name: a.shortName,
  wordmark_top: a.wordmark.top,
  wordmark_bottom: a.wordmark.bottom,
  summary: a.summary ?? null,
  description: a.description.join('\n\n'),
  instagram: a.instagram,
  pin_key: a.pinKey ?? null,
  logo_url: a.logo ?? null,
  discord_url: a.discord ?? null,
  sort,
  published: true,
})
