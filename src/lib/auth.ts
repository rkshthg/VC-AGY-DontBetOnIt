import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { getUserById } from './db'
import type { User } from '../types/user'
import { SESSION_COOKIE_NAME, COOKIE_MAX_AGE } from '../constants'
import type { SessionPayload } from '../types/user'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_key_dont_bet_on_it_2026'
)

export type { SessionPayload }

export async function signJWT(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET)
}

export async function verifyJWT(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch (error) {
    return null
  }
}

// Set session cookie
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

// Clear session cookie
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

// Retrieve the session token from headers or cookies
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null
}

// Get the authenticated user from the current session
export async function getSessionUser(): Promise<User | null> {
  const token = await getSessionToken()
  if (!token) return null

  const payload = await verifyJWT(token)
  if (!payload || !payload.userId) return null

  return getUserById(payload.userId)
}
