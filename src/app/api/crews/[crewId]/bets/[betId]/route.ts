import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { editBetCardOptions, isCrewAdmin } from '@/lib/db'
import { isRedisConfigured } from '@/lib/redis'

export async function PUT(
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
    const { options } = await request.json()

    if (!options || typeof options !== 'object') {
      return NextResponse.json({ error: 'Options mapping is required.' }, { status: 400 })
    }

    // Verify admin
    const isAdmin = await isCrewAdmin(crewId, user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Only Crew Admins can edit wagers.' }, { status: 403 })
    }

    await editBetCardOptions(crewId, user.id, betId, options)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Edit bet card options error:', error)
    return NextResponse.json({ error: error.message || 'Failed to edit options.' }, { status: 500 })
  }
}
