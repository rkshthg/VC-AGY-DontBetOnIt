import { NextResponse } from 'next/server'
import { getUserByGoogleId, getUserByEmail, createUser, getUserById, getUserByUsername } from '@/lib/db'
import { signJWT, setSessionCookie } from '@/lib/auth'
import { redis } from '@/lib/redis'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (errorParam) {
    console.error('Google OAuth callback error parameter:', errorParam)
    const errorMsg = encodeURIComponent(`Google login error: ${errorParam}`)
    return NextResponse.redirect(new URL(`/?error=${errorMsg}`, appUrl))
  }

  if (!code) {
    const errorMsg = encodeURIComponent('Authorization code not provided by Google.')
    return NextResponse.redirect(new URL(`/?error=${errorMsg}`, appUrl))
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${appUrl}/api/auth/google/callback`

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token exchange failed:', errorData)
      const errorMsg = encodeURIComponent('Failed to exchange authorization code for Google access token.')
      return NextResponse.redirect(new URL(`/?error=${errorMsg}`, appUrl))
    }

    const { access_token } = await tokenResponse.json()

    // Fetch user details from Google userinfo endpoint
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!userinfoResponse.ok) {
      console.error('Failed to fetch userinfo from Google')
      const errorMsg = encodeURIComponent('Failed to retrieve user profile information from Google.')
      return NextResponse.redirect(new URL(`/?error=${errorMsg}`, appUrl))
    }

    const googleUser = await userinfoResponse.json()
    const { sub: googleId, email, name } = googleUser

    if (!email) {
      const errorMsg = encodeURIComponent('Google account did not provide an email address.')
      return NextResponse.redirect(new URL(`/?error=${errorMsg}`, appUrl))
    }

    let user = await getUserByGoogleId(googleId)

    if (user) {
      // User exists - log them in
      const token = await signJWT({
        userId: user.id,
        email: user.email,
        username: user.username,
      })
      await setSessionCookie(token)
      return NextResponse.redirect(new URL('/dashboard', appUrl))
    }

    // Google ID not registered, check if user exists by email (for account linking)
    user = await getUserByEmail(email)
    if (user) {
      // Link Google ID to existing email account
      const multi = redis.multi()
      multi.hset(`user:${user.id}`, { googleId })
      multi.set(`user:google:${googleId}`, user.id)
      await multi.exec()

      const token = await signJWT({
        userId: user.id,
        email: user.email,
        username: user.username,
      })
      await setSessionCookie(token)
      return NextResponse.redirect(new URL('/dashboard', appUrl))
    }

    // New User - register them with welcome bonus
    // Clean and generate a unique username from Google Name
    let baseUsername = name.replace(/[^a-zA-Z0-9_]/g, '')
    if (baseUsername.length < 3) {
      baseUsername = 'user_' + Math.random().toString(36).substring(2, 6)
    }
    if (baseUsername.length > 15) {
      baseUsername = baseUsername.substring(0, 15)
    }

    let finalUsername = baseUsername
    let existingUser = await getUserByUsername(finalUsername)
    while (existingUser) {
      finalUsername = baseUsername + Math.random().toString(36).substring(2, 5)
      existingUser = await getUserByUsername(finalUsername)
    }

    user = await createUser({
      username: finalUsername,
      email: email.toLowerCase(),
      googleId,
    })

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      username: user.username,
    })
    await setSessionCookie(token)

    return NextResponse.redirect(new URL('/dashboard', appUrl))
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    const errorMsg = encodeURIComponent('An unexpected error occurred during Google authentication.')
    return NextResponse.redirect(new URL(`/?error=${errorMsg}`, appUrl))
  }
}
