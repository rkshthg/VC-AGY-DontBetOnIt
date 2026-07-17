import { redis } from '../redis'
import { KEYS, INVITE_CODE_LENGTH } from '../../constants'
import type { Crew, CrewMemberStats } from '../../types'
import { getUserById } from './users'

// ─── Create ────────────────────────────────────────────────────────────────

export async function createCrew(name: string, creatorId: string): Promise<Crew> {
  const crewId = crypto.randomUUID()
  const inviteCode = Math.random()
    .toString(36)
    .substring(2, 2 + INVITE_CODE_LENGTH)
    .toUpperCase()

  const newCrew: Crew = {
    id: crewId,
    name,
    inviteCode,
    creatorId,
    createdAt: new Date().toISOString(),
  }

  const multi = redis.multi()
  multi.hset(KEYS.crew(crewId), newCrew as unknown as Record<string, unknown>)
  multi.set(KEYS.crewInvite(inviteCode), crewId)
  multi.sadd(KEYS.crewMembers(crewId), creatorId)
  multi.sadd(KEYS.crewAdmins(crewId), creatorId)
  multi.sadd(KEYS.userCrews(creatorId), crewId)
  // Initialize member stats for the creator
  multi.hset(KEYS.crewMemberStats(crewId, creatorId), {
    creditsWon: 0,
    creditsWagered: 0,
    totalBets: 0,
    betsWon: 0,
    biggestWin: 0,
  })
  await multi.exec()
  return newCrew
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getCrewById(crewId: string): Promise<Crew | null> {
  const crew = await redis.hgetall(KEYS.crew(crewId))
  if (!crew || Object.keys(crew).length === 0) return null
  return crew as unknown as Crew
}

export async function getCrewByInviteCode(inviteCode: string): Promise<Crew | null> {
  const crewId = await redis.get(KEYS.crewInvite(inviteCode))
  if (!crewId) return null
  return getCrewById(crewId as string)
}

export async function getUserCrews(userId: string): Promise<Crew[]> {
  const crewIds = await redis.smembers(KEYS.userCrews(userId))
  if (!crewIds || crewIds.length === 0) return []

  const crews: Crew[] = []
  for (const id of crewIds) {
    const crew = await getCrewById(id)
    if (crew) crews.push(crew)
  }

  return crews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// ─── Membership ────────────────────────────────────────────────────────────

export async function isCrewMember(crewId: string, userId: string): Promise<boolean> {
  return (await redis.sismember(KEYS.crewMembers(crewId), userId)) === 1
}

export async function isCrewAdmin(crewId: string, userId: string): Promise<boolean> {
  return (await redis.sismember(KEYS.crewAdmins(crewId), userId)) === 1
}

export async function addUserToCrew(crewId: string, userId: string): Promise<void> {
  const isMember = await isCrewMember(crewId, userId)
  if (isMember) return

  const multi = redis.multi()
  multi.sadd(KEYS.crewMembers(crewId), userId)
  multi.sadd(KEYS.userCrews(userId), crewId)
  multi.hset(KEYS.crewMemberStats(crewId, userId), {
    creditsWon: 0,
    creditsWagered: 0,
    totalBets: 0,
    betsWon: 0,
    biggestWin: 0,
  })
  await multi.exec()
}

export async function promoteMemberToAdmin(
  crewId: string,
  adminId: string,
  targetUserId: string
): Promise<void> {
  const isAdmin = await isCrewAdmin(crewId, adminId)
  if (!isAdmin) throw new Error('Unauthorized: Only admins can promote members to admin.')

  const isMember = await isCrewMember(crewId, targetUserId)
  if (!isMember) throw new Error('Target user must be a member of the Crew.')

  await redis.sadd(KEYS.crewAdmins(crewId), targetUserId)
}

// ─── Stats & Leaderboard ───────────────────────────────────────────────────

export async function getCrewMembersWithStats(crewId: string): Promise<CrewMemberStats[]> {
  const memberIds = await redis.smembers(KEYS.crewMembers(crewId))
  if (!memberIds || memberIds.length === 0) return []

  const statsList: CrewMemberStats[] = []
  for (const userId of memberIds) {
    const [user, stats] = await Promise.all([
      getUserById(userId),
      redis.hgetall(KEYS.crewMemberStats(crewId, userId)),
    ])

    if (user) {
      const creditsWon = Number(stats?.creditsWon || 0)
      const creditsWagered = Number(stats?.creditsWagered || 0)
      const totalBets = Number(stats?.totalBets || 0)
      const betsWon = Number(stats?.betsWon || 0)
      const biggestWin = Number(stats?.biggestWin || 0)

      statsList.push({
        userId,
        username: user.username,
        email: user.email,
        globalBalance: user.balance,
        creditsWon,
        creditsWagered,
        totalBets,
        betsWon,
        biggestWin,
        netProfit: creditsWon - creditsWagered,
        winRate: totalBets > 0 ? betsWon / totalBets : 0,
      })
    }
  }
  return statsList
}

export async function getCrewLeaderboard(
  crewId: string,
  sortBy: 'netProfit' | 'globalBalance' | 'winRate' = 'netProfit'
): Promise<CrewMemberStats[]> {
  const members = await getCrewMembersWithStats(crewId)

  return members.sort((a, b) => {
    if (sortBy === 'globalBalance') return b.globalBalance - a.globalBalance
    if (sortBy === 'winRate') {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate
      return b.totalBets - a.totalBets // tie-breaker
    }
    return b.netProfit - a.netProfit // default: netProfit
  })
}
