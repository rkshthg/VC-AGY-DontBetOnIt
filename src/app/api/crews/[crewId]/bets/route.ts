import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { createBetCard, isCrewMember } from '@/lib/db'
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
    
    // Check membership
    const isMember = await isCrewMember(crewId, user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this Crew.' }, { status: 403 })
    }

    const { title, description, fixedWager, options } = await request.json()

    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    }

    if (!options || !Array.isArray(options) || options.filter(o => o.trim()).length < 2) {
      return NextResponse.json({ error: 'At least 2 non-empty options are required.' }, { status: 400 })
    }

    const wagerAmount = Number(fixedWager)
    if (isNaN(wagerAmount) || wagerAmount <= 0) {
      return NextResponse.json({ error: 'Wager amount must be a positive number.' }, { status: 400 })
    }

    const cleanOptions = options.map(o => o.trim()).filter(Boolean)

    const betCard = await createBetCard(
      crewId,
      user.id,
      title,
      description || '',
      wagerAmount,
      cleanOptions
    )

    return NextResponse.json({ betCard })
  } catch (error) {
    console.error('Create bet card error:', error)
    return NextResponse.json({ error: 'Failed to create bet card.' }, { status: 500 })
  }
}
