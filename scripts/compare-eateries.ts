/**
 * Compares the built-in places to eat (app/lib/data/eats.ts, what seed-eateries copies) with
 * the eateries table, and lists the ones that won't show as a pin on the campus map. Read-only:
 * it reports, and changes nothing.
 *
 *   npm run eateries:compare
 *
 * The table is what the site shows, so a difference may be an officer's newer edit rather than
 * a mistake. Uses SUPABASE_SERVICE_ROLE_KEY from .env.local (to see hidden rows too), so run it
 * only on your machine.
 */
import { EATERIES } from '../app/lib/data/eats'
import { eateryFromRow, eateryToRow } from '../app/lib/eateries'
import { adminClient } from './supabase-admin'

/** JSON with its keys in order, since the database doesn't keep the order they were saved in */
const stable = (value: unknown): string =>
  JSON.stringify(value ?? null, (_, v) =>
    v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v
  )

/** How a row's stored values compare; `sort` is left out, since officers reorder freely */
const comparable = (row: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => !['id', 'sort', 'published', 'created_at', 'updated_at'].includes(key))
      .map(([key, value]) => [key, stable(value)])
  )

async function main() {
  const supabase = adminClient()
  const [{ data, error }, { data: placeRows, error: placeError }] = await Promise.all([
    supabase.from('eateries').select('*').order('name'),
    supabase.from('map_places').select('slug'),
  ])
  if (error) throw error
  if (placeError) throw placeError
  const rows = data ?? []
  const inTable = new Map(rows.map((r) => [r.slug, r]))
  // An eatery can sit inside a building or another eatery (the Hub's counters)
  const places = new Set([...(placeRows ?? []).flatMap((p) => p.slug ?? []), ...inTable.keys()])
  const inCode = new Set(EATERIES.map((e) => e.id))

  const missing = EATERIES.filter((e) => !inTable.has(e.id))
  const extra = rows.filter((r) => !inCode.has(r.slug))
  const hidden = rows.filter((r) => !r.published)

  const different: string[] = []
  for (const eatery of EATERIES) {
    const row = inTable.get(eatery.id)
    if (!row) continue
    const code = comparable(eateryToRow(eatery, 0))
    const table = comparable(row)
    const changed = Object.keys(code).filter((key) => code[key] !== table[key])
    if (!changed.length) continue
    different.push(`${eatery.id} (last changed ${row.updated_at.slice(0, 10)})`)
    for (const key of changed) different.push(`  ${key}\n    code:  ${code[key]}\n    table: ${table[key]}`)
  }

  // A published eatery needs its own pin, its locations' pins, or a place it's inside of
  const shown = rows.filter((r) => r.published).map((r) => ({ row: r, eatery: eateryFromRow(r) }))
  const hasPin = ({ eatery }: (typeof shown)[number]) => eatery.lat !== undefined || !!eatery.locations?.length
  const noPin = shown.filter((s) => !hasPin(s))
  const nowhere = noPin.filter(({ eatery }) => !eatery.placeId)
  const badPlace = shown.filter(({ eatery }) => eatery.placeId && !places.has(eatery.placeId))

  console.log(`${EATERIES.length} eateries in code, ${rows.length} rows in eateries (${shown.length} published)\n`)
  console.log(`Different: ${different.length ? different.filter((l) => !l.startsWith(' ')).length : 0}`)
  if (different.length) console.log(different.join('\n'))
  console.log(`\nIn code, not in the table (the site won't show these): ${missing.length}`)
  for (const e of missing) console.log(`  ${e.id}: ${e.name} [${e.area}]`)
  console.log(`\nIn the table, not in code: ${extra.length}`)
  for (const r of extra) console.log(`  ${r.slug}: ${r.name}`)
  console.log(`\nHidden: ${hidden.length}`)
  for (const r of hidden) console.log(`  ${r.slug}: ${r.name}`)
  console.log(`\nPublished, no pin of their own (shown through the place they're inside): ${noPin.length - nowhere.length}`)
  for (const { eatery: e } of noPin.filter((s) => s.eatery.placeId)) console.log(`  ${e.id}: ${e.name} -> ${e.placeId}`)
  console.log(`\nPublished, nothing on the map at all: ${nowhere.length}`)
  for (const { eatery: e } of nowhere) console.log(`  ${e.id}: ${e.name} (${e.address})`)
  console.log(`\nPointing at a place that doesn't exist: ${badPlace.length}`)
  for (const { eatery: e } of badPlace) console.log(`  ${e.id}: ${e.name} -> ${e.placeId}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
