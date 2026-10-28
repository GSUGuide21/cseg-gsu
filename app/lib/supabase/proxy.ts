import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { supabaseEnv } from './env'
import type { Database } from './types'

/**
 * Refreshes the Supabase session cookie on the way in, so Server Components (which can't
 * set cookies) always see a current one. Returns the response to send on, and whether
 * someone is signed in. Signed in isn't the same as being an officer: the dashboard's data
 * layer checks that, and row-level security enforces it.
 */
export async function updateSession(request: NextRequest) {
  const env = supabaseEnv()
  let response = NextResponse.next({ request })
  if (!env) return { response, signedIn: false }

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        // No caching a response that carries someone's session
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value)
      },
    },
  })

  // Verifies the token (and refreshes it when it's close to expiring). Nothing may run
  // between creating the client and this call, or sessions can drop at random.
  const { data } = await supabase.auth.getClaims()
  return { response, signedIn: !!data?.claims?.sub }
}
