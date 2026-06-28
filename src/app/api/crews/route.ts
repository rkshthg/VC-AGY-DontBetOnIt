import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { createCrew, getUserCrews } from '@/lib/db'
import { isRedisConfigured } from '@/lib/redis'

export async function GET() {
  if (!isRedisConfigured) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 })
  }

  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const crews = await getUserCrews(user.id)
    return NextResponse.json({ crews })
  } catch (error) {
    console.error('Fetch crews error:', error)
    return NextResponse.json({ error: 'Failed to fetch crews.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!isRedisConfigured) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 })
  }

  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Crew name is required.' }, { status: 400 })
    }

    if (name.length < 3 || name.length > 30) {
      return NextResponse.json({ error: 'Crew name must be between 3 and 30 characters.' }, { status: 400 })
    }

    const crew = await createCrew(name.trim(), user.id)
    return NextResponse.json({ crew })
  } catch (error) {
    console.error('Create crew error:', error)
    return NextResponse.json({ error: 'Failed to create crew.' }, { status: 500 })
  }
}
