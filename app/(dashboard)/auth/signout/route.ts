import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/** Signs out (POST only, so a link or prefetch can't do it) and goes back to /login */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase?.auth.signOut()
  // 303: follow up with a GET, not a second POST
  return NextResponse.redirect(new URL('/login', request.nextUrl.origin), 303)
}
