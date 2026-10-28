import { NextResponse, type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy'

/**
 * Keeps the dashboard's Supabase session fresh, and sends people who aren't signed in to
 * /login first. This is the quick, optimistic check; each dashboard page and action checks
 * that the person is an officer before reading or changing anything.
 */
export async function proxy(request: NextRequest) {
  const { response, signedIn } = await updateSession(request)
  const { pathname, search } = request.nextUrl
  if (pathname.startsWith('/dashboard') && !signedIn) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', pathname + search)
    return NextResponse.redirect(login)
  }
  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/auth/:path*'],
}
