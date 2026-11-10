/**
 * Copies the built-in skybridges and shortcuts (app/lib/data/connections.ts) into the
 * dashboard's map_connections table, under the same ids, so links to routes that use them
 * keep working. Once it has any, the map uses its list instead, and officers edit them under
 * Shortcuts.
 *
 *   npm run connections:seed            shows what it would add
 *   npm run connections:seed -- --write adds them
 *
 * It never changes one that's already there (the same id is left alone). Uses
 * SUPABASE_SERVICE_ROLE_KEY from .env.local, so run it only on your machine.
 */
import { connectionToRow } from '../app/lib/connections'
import { CONNECTIONS } from '../app/lib/data/connections'
import { adminClient } from './supabase-admin'

async function main() {
  const write = process.argv.includes('--write')
  const supabase = adminClient()

  const { data, error } = await supabase.from('map_connections').select('slug')
  if (error) throw new Error(`${error.message} (has the map_connections migration been applied?)`)
  const taken = new Set((data ?? []).map((c) => c.slug))
  const rows = CONNECTIONS.map((c, i) => connectionToRow(c, (i + 1) * 10)).filter((c) => !taken.has(c.slug))

  console.log(`${write ? 'add' : 'would add'}  ${rows.length} of ${CONNECTIONS.length} skybridges and shortcuts`)
  for (const c of rows) console.log(`  ${c.slug}: ${c.name}`)
  if (!write) return console.log('\nNothing written. Run with --write to add them.')
  if (rows.length) {
    const { error: insertError } = await supabase.from('map_connections').insert(rows)
    if (insertError) throw insertError
  }
  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
