/**
 * Copies the campus map's built-in places (app/lib/data/places.ts: buildings, study spots,
 * MARTA, parking, …) into the dashboard's map_places table, keeping their ids as slugs, so
 * map links, routes, tours, and eateries' and resources' places keep working. Once the table
 * has any, the map shows the table's instead, and officers edit them under Map. Food pins
 * aren't copied: they come from the eateries (npm run eateries:seed). Room directories stay
 * in code, matched by slug.
 *
 *   npm run places:seed            shows what it would add
 *   npm run places:seed -- --write adds them
 *
 * It never changes a place that's already there (one with the same slug is left alone).
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local, so run it only on your machine.
 */
import { BUILDINGS_AND_SPACES, PLACE_CATEGORIES, type PlaceCategory } from '../app/lib/data/places'
import { adminClient } from './supabase-admin'

// The database's checks on map_places (validate.ts's CAMPUS_BOUNDS, which scripts can't import)
const inCampusBounds = (lat: number, lng: number) => lat >= 33.7 && lat <= 33.8 && lng >= -84.43 && lng <= -84.33

async function main() {
  const write = process.argv.includes('--write')
  const supabase = adminClient()

  const { data: existing, error } = await supabase.from('map_places').select('slug')
  if (error) throw new Error(`${error.message} (has the map_place_slugs migration been applied?)`)
  const taken = new Set((existing ?? []).map((p) => p.slug))

  const outside = BUILDINGS_AND_SPACES.filter((p) => !inCampusBounds(p.lat, p.lng))
  if (outside.length) throw new Error(`Outside the database's campus bounds: ${outside.map((p) => p.id).join(', ')}`)

  const rows = BUILDINGS_AND_SPACES.map((p) => ({
    slug: p.id,
    name: p.name,
    category: p.category,
    also_in: [...(p.alsoIn ?? [])],
    lat: p.lat,
    lng: p.lng,
    address: p.address ?? null,
    description: p.description,
    aliases: [...(p.aliases ?? [])],
    published: true,
  }))
  const fresh = rows.filter((r) => !taken.has(r.slug))
  for (const category of Object.keys(PLACE_CATEGORIES) as PlaceCategory[]) {
    const inCategory = rows.filter((r) => r.category === category)
    if (!inCategory.length) continue
    const adding = fresh.filter((r) => r.category === category).length
    console.log(`${write ? 'add' : 'would add'}  ${category}: ${adding} of ${inCategory.length}${adding < inCategory.length ? ` (${inCategory.length - adding} already there)` : ''}`)
  }
  if (!write) return console.log(`\nNothing written. Run with --write to add ${fresh.length}.`)
  if (!fresh.length) return console.log('\nNothing to add.')
  const { error: insertError } = await supabase.from('map_places').insert(fresh)
  if (insertError) throw insertError
  console.log(`\nAdded ${fresh.length} places.`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
