import { NextResponse, type NextRequest } from 'next/server'

import { safeNext } from '@/lib/dashboard/validate'
import { createClient } from '@/lib/supabase/server'

/**
 * Where Google sends people back after they sign in: trades the one-time code for a
 * session (set as cookies) and goes on to the page they wanted. Whether they're an
 * officer is checked on that page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))
  const supabase = await createClient()
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
  }
  return NextResponse.redirect(new URL('/login?reason=callback', origin))
}
