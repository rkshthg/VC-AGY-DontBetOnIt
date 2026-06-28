import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUserByEmail, getUserByUsername } from '@/lib/db'
import { signJWT, setSessionCookie } from '@/lib/auth'
import { isRedisConfigured } from '@/lib/redis'

export async function POST(request: Request) {
  if (!isRedisConfigured) {
    return NextResponse.json(
      { error: 'Database not configured. Please set Upstash Redis credentials in your .env file.' },
      { status: 503 }
    )
  }

  try {
    const { loginIdentifier, password } = await request.json()

    if (!loginIdentifier || !password) {
      return NextResponse.json({ error: 'Username/Email and password are required.' }, { status: 400 })
    }

    // Identify if the user is logging in with email or username
    let user = await getUserByEmail(loginIdentifier)
    if (!user) {
      user = await getUserByUsername(loginIdentifier)
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid username/email or password.' }, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid username/email or password.' }, { status: 401 })
    }

    // Create session JWT
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      username: user.username,
    })

    // Set cookie
    await setSessionCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        createdAt: user.createdAt,
      },
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred during log in.' }, { status: 500 })
  }
}
