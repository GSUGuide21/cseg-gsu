/**
 * Copies the built-in affiliates (app/lib/data/affiliates.ts) into the dashboard's affiliates
 * table, in the same order and at the same addresses. Once it has any, the site shows its
 * affiliates instead, and officers edit them under Affiliates.
 *
 *   npm run affiliates:seed            shows what it would add
 *   npm run affiliates:seed -- --write adds them
 *
 * It never changes an affiliate that's already there (the same slug is left alone). Uses
 * SUPABASE_SERVICE_ROLE_KEY from .env.local, so run it only on your machine.
 */
import { affiliateToRow } from '../app/lib/affiliates'
import { AFFILIATES } from '../app/lib/data/affiliates'
import { adminClient } from './supabase-admin'

async function main() {
  const write = process.argv.includes('--write')
  const supabase = adminClient()

  const { data, error } = await supabase.from('affiliates').select('slug')
  if (error) throw new Error(`${error.message} (has the affiliates migration been applied?)`)
  const taken = new Set((data ?? []).map((a) => a.slug))
  const rows = AFFILIATES.map((a, i) => affiliateToRow(a, (i + 1) * 10)).filter((a) => !taken.has(a.slug))

  console.log(`${write ? 'add' : 'would add'}  ${rows.length} of ${AFFILIATES.length} affiliates`)
  for (const a of rows) console.log(`  ${a.slug}: ${a.short_name}`)
  if (!write) return console.log('\nNothing written. Run with --write to add them.')
  if (rows.length) {
    const { error: insertError } = await supabase.from('affiliates').insert(rows)
    if (insertError) throw insertError
  }
  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
