import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_key_dont_bet_on_it_2026'
)

const SESSION_COOKIE_NAME = 'session_token'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  let isAuthenticated = false
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET)
      isAuthenticated = true
    } catch (error) {
      // Token is invalid or expired
    }
  }

  const isAuthPage = pathname === '/'
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/crew')

  if (isProtectedRoute && !isAuthenticated) {
    // Redirect unauthenticated user to login screen
    const url = new URL('/', request.url)
    return NextResponse.redirect(url)
  }

  if (isAuthPage && isAuthenticated) {
    // Redirect authenticated user to dashboard
    const url = new URL('/dashboard', request.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard', '/crew/:path*'],
}
