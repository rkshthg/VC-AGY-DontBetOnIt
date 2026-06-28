import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const isConfigured = clientId && clientSecret && 
                       clientId !== 'placeholder_google_client_id' && 
                       clientSecret !== 'placeholder_google_client_secret'

  if (!isConfigured) {
    // Redirect back to landing page with error parameter
    const errorMsg = encodeURIComponent('Google SSO is not configured on this server. Please use Email/Password sign up or login instead.')
    return NextResponse.redirect(new URL(`/?error=${errorMsg}`, appUrl))
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`
  const scope = 'openid email profile'
  const responseType = 'code'

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.append('client_id', clientId!)
  googleAuthUrl.searchParams.append('redirect_uri', redirectUri)
  googleAuthUrl.searchParams.append('scope', scope)
  googleAuthUrl.searchParams.append('response_type', responseType)
  googleAuthUrl.searchParams.append('prompt', 'select_account')

  return NextResponse.redirect(googleAuthUrl.toString())
}
