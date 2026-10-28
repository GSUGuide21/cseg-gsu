import { createServerClient } from '@supabase/ssr'
import { createClient as createPlainClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import { supabaseEnv } from './env'
import type { Database } from './types'

/**
 * Supabase as the signed-in person, for Server Components, Server Actions, and Route
 * Handlers. Reads the session from cookies, so the page renders per request. Null when
 * Supabase isn't configured.
 */
export async function createClient() {
  const env = supabaseEnv()
  if (!env) return null
  const cookieStore = await cookies()
  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session instead
        }
      },
    },
  })
}

/**
 * Supabase with no session, for public pages (published posts, pages, map places). No
 * cookies, so those pages can still be cached. Null when Supabase isn't configured.
 */
export function createPublicClient() {
  const env = supabaseEnv()
  if (!env) return null
  return createPlainClient<Database>(env.url, env.key, { auth: { persistSession: false, autoRefreshToken: false } })
}
