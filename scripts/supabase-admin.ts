/**
 * A Supabase client for the seed scripts, acting with the service role key from .env.local,
 * so it skips row-level security. Only for running on your own machine.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createClient } from '@supabase/supabase-js'

import type { Database } from '../app/lib/supabase/types'

export function adminClient() {
  const env = Object.fromEntries(
    readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => {
        const at = l.indexOf('=')
        return [l.slice(0, at), l.slice(at + 1).replace(/^"|"$/g, '')]
      })
  )
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.')
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
