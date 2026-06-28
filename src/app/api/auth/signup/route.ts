import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createUser, getUserByEmail, getUserByUsername } from '@/lib/db'
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
    const { username, email, password } = await request.json()

    // Validation
    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email, and password are required.' }, { status: 400 })
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: 'Username must be between 3 and 20 characters.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    // Check unique email and username
    const [existingEmail, existingUsername] = await Promise.all([
      getUserByEmail(email),
      getUserByUsername(username),
    ])

    if (existingEmail) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 })
    }

    if (existingUsername) {
      return NextResponse.json({ error: 'This username is already taken.' }, { status: 400 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Save to database
    const user = await createUser({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
    })

    // Generate session JWT
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      username: user.username,
    })

    // Set cookie
    await setSessionCookie(token)

    // Return profile (omit passwordHash)
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
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred during sign up.' }, { status: 500 })
  }
}
