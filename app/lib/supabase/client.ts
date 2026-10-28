'use client'

import { createBrowserClient } from '@supabase/ssr'

import { supabaseEnv } from './env'
import type { Database } from './types'

/** Supabase in the browser (signing in with Google). Null when Supabase isn't configured. */
export function createClient() {
  const env = supabaseEnv()
  return env ? createBrowserClient<Database>(env.url, env.key) : null
}
