import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { resolveBetCard, isCrewAdmin } from '@/lib/db'
import { isRedisConfigured } from '@/lib/redis'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ crewId: string; betId: string }> }
) {
  if (!isRedisConfigured) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 })
  }

  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { crewId, betId } = await params
    const { winningOptionId } = await request.json()

    if (!winningOptionId) {
      return NextResponse.json({ error: 'Winning option ID is required.' }, { status: 400 })
    }

    // Verify admin
    const isAdmin = await isCrewAdmin(crewId, user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Only Crew Admins can resolve wagers.' }, { status: 403 })
    }

    await resolveBetCard(crewId, user.id, betId, winningOptionId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Resolve bet error:', error)
    return NextResponse.json({ error: error.message || 'Failed to resolve bet.' }, { status: 500 })
  }
}
