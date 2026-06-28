import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getCrewByInviteCode, addUserToCrew } from '@/lib/db'
import { isRedisConfigured } from '@/lib/redis'

export async function POST(request: Request) {
  if (!isRedisConfigured) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 })
  }

  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { inviteCode } = await request.json()
    if (!inviteCode || !inviteCode.trim()) {
      return NextResponse.json({ error: 'Invite code is required.' }, { status: 400 })
    }

    const crew = await getCrewByInviteCode(inviteCode.trim().toUpperCase())
    if (!crew) {
      return NextResponse.json({ error: 'Invalid invite code. Crew not found.' }, { status: 404 })
    }

    await addUserToCrew(crew.id, user.id)

    return NextResponse.json({
      success: true,
      crewId: crew.id,
      crewName: crew.name,
    })
  } catch (error) {
    console.error('Join crew error:', error)
    return NextResponse.json({ error: 'Failed to join Crew.' }, { status: 500 })
  }
}
