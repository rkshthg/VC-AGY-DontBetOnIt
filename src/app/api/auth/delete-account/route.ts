import { NextResponse } from 'next/server'
import { getSessionUser, clearSessionCookie } from '@/lib/auth'
import { deleteUser } from '@/lib/db'
import { isRedisConfigured } from '@/lib/redis'

export async function POST() {
  if (!isRedisConfigured) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 })
  }

  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete user from Redis database (profile, indices, crew stats/memberships)
    await deleteUser(user.id)

    // Clear session cookies
    await clearSessionCookie()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })
  }
}
