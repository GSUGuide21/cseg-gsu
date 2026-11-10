/**
 * Copies the built-in student resources (app/lib/data/resources.ts) and their groups into
 * the dashboard's resource_groups and resources tables. Once both have some, the site shows
 * theirs instead, and officers edit them under Resources.
 *
 *   npm run resources:seed            shows what it would add
 *   npm run resources:seed -- --write adds them
 *
 * It never changes a group or resource that's already there (the same slug is left alone).
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local, so run it only on your machine.
 */
import { BUILT_IN_RESOURCE_GROUPS, BUILT_IN_RESOURCES, resourceToRow } from '../app/lib/resources'
import { adminClient } from './supabase-admin'

async function main() {
  const write = process.argv.includes('--write')
  const supabase = adminClient()

  const [groupsThere, resourcesThere] = await Promise.all([supabase.from('resource_groups').select('slug'), supabase.from('resources').select('slug')])
  const error = groupsThere.error ?? resourcesThere.error
  if (error) throw new Error(`${error.message} (has the resources migration been applied?)`)
  const takenGroups = new Set((groupsThere.data ?? []).map((g) => g.slug))
  const takenResources = new Set((resourcesThere.data ?? []).map((r) => r.slug))

  const groups = BUILT_IN_RESOURCE_GROUPS.map((g, i) => ({ slug: g.slug, title: g.title, description: g.description ?? null, icon: g.icon, sort: (i + 1) * 10 })).filter((g) => !takenGroups.has(g.slug))
  // Each group's resources in the guide's order, 10 apart so new ones fit between
  const resources = BUILT_IN_RESOURCE_GROUPS.flatMap((g) => BUILT_IN_RESOURCES.filter((r) => r.group === g.slug).map((r, i) => resourceToRow(r, (i + 1) * 10))).filter((r) => !takenResources.has(r.slug))

  console.log(`${write ? 'add' : 'would add'}  ${groups.length} of ${BUILT_IN_RESOURCE_GROUPS.length} groups, ${resources.length} of ${BUILT_IN_RESOURCES.length} resources`)
  if (!write) return console.log('\nNothing written. Run with --write to add them.')
  if (groups.length) {
    const { error: groupError } = await supabase.from('resource_groups').insert(groups)
    if (groupError) throw groupError
  }
  if (resources.length) {
    const { error: resourceError } = await supabase.from('resources').insert(resources)
    if (resourceError) throw resourceError
  }
  console.log('\nDone.')
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
