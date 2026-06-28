import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { placeWager, isCrewMember } from '@/lib/db'
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
    
    // Check membership
    const isMember = await isCrewMember(crewId, user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this Crew.' }, { status: 403 })
    }

    const { optionId, customOptionText } = await request.json()

    if (!optionId && (!customOptionText || !customOptionText.trim())) {
      return NextResponse.json({ error: 'Please select an option or provide custom option text.' }, { status: 400 })
    }

    await placeWager(
      crewId,
      user.id,
      betId,
      optionId || '',
      customOptionText || ''
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Place wager error:', error)
    return NextResponse.json({ error: error.message || 'Failed to place bet.' }, { status: 400 })
  }
}
