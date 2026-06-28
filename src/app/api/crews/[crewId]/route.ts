import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getCrewById, getCrewLeaderboard, getCrewBets, isCrewMember, isCrewAdmin } from '@/lib/db'
import { isRedisConfigured } from '@/lib/redis'

export async function GET(
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

    // Verify membership
    const isMember = await isCrewMember(crewId, user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this Crew.' }, { status: 403 })
    }

    const [crew, leaderboard, bets, isAdmin] = await Promise.all([
      getCrewById(crewId),
      getCrewLeaderboard(crewId),
      getCrewBets(crewId),
      isCrewAdmin(crewId, user.id),
    ])

    if (!crew) {
      return NextResponse.json({ error: 'Crew not found.' }, { status: 404 })
    }

    return NextResponse.json({
      crew,
      leaderboard,
      bets,
      isAdmin,
    })
  } catch (error) {
    console.error('Fetch crew details error:', error)
    return NextResponse.json({ error: 'Failed to fetch crew details.' }, { status: 500 })
  }
}
