/**
 * Copies the built-in places to eat (app/lib/data/eats.ts) into the dashboard's eateries
 * table, keeping their ids, so map links and walking routes to them keep working. Once the
 * table has any, the site shows the table's instead, and officers edit them under Eateries.
 *
 *   npm run eateries:seed            shows what it would add
 *   npm run eateries:seed -- --write adds them
 *
 * It never changes an eatery that's already there (one with the same id is left alone).
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local, so run it only on your machine.
 */
import { EATERIES } from '../app/lib/data/eats'
import { EAT_AREA_LIST, eateryToRow } from '../app/lib/eateries'
import { adminClient } from './supabase-admin'

async function main() {
  const write = process.argv.includes('--write')
  const supabase = adminClient()

  const { data: existing, error } = await supabase.from('eateries').select('slug')
  if (error) throw new Error(`${error.message} (has the eateries migration been applied?)`)
  const taken = new Set((existing ?? []).map((e) => e.slug))

  // Each area's eateries in the guide's order, 10 apart so new ones fit between
  const rows = EAT_AREA_LIST.flatMap((area) => EATERIES.filter((e) => e.area === area).map((e, i) => eateryToRow(e, (i + 1) * 10)))
  const fresh = rows.filter((r) => !taken.has(r.slug))
  for (const area of EAT_AREA_LIST) {
    const inArea = rows.filter((r) => r.area === area)
    const adding = fresh.filter((r) => r.area === area).length
    console.log(`${write ? 'add' : 'would add'}  ${area}: ${adding} of ${inArea.length}${adding < inArea.length ? ` (${inArea.length - adding} already there)` : ''}`)
  }
  if (!write) return console.log(`\nNothing written. Run with --write to add ${fresh.length}.`)
  if (!fresh.length) return console.log('\nNothing to add.')
  const { error: insertError } = await supabase.from('eateries').insert(fresh)
  if (insertError) throw insertError
  console.log(`\nAdded ${fresh.length} eateries.`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
