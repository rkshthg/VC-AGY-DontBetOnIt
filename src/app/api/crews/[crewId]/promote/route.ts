import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { promoteMemberToAdmin, isCrewAdmin } from '@/lib/db'
import { isRedisConfigured } from '@/lib/redis'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ crewId: string }> }
) {
  if (!isRedisConfigured) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 })
  }

  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { crewId } = await params
    const { targetUserId } = await request.json()

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required.' }, { status: 400 })
    }

    const isAdmin = await isCrewAdmin(crewId, user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Only admins can promote other members.' }, { status: 403 })
    }

    await promoteMemberToAdmin(crewId, user.id, targetUserId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Promote member error:', error)
    return NextResponse.json({ error: error.message || 'Failed to promote member to admin.' }, { status: 500 })
  }
}
