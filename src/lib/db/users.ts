import { redis } from '../redis'
import { KEYS, STARTING_BALANCE } from '../../constants'
import type { User } from '../../types/user'

// Helper to strip undefined/null values before hset
function cleanObject(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  Object.entries(obj).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      clean[key] = val
    }
  })
  return clean
}

// ─── Create ────────────────────────────────────────────────────────────────

export async function createUser(
  data: Omit<User, 'id' | 'balance' | 'createdAt'> & { id?: string }
): Promise<User> {
  const userId = data.id || crypto.randomUUID()
  const newUser: User = {
    id: userId,
    email: data.email.toLowerCase(),
    username: data.username,
    passwordHash: data.passwordHash,
    googleId: data.googleId,
    balance: STARTING_BALANCE,
    createdAt: new Date().toISOString(),
  }

  const multi = redis.multi()
  multi.hset(KEYS.user(userId), cleanObject(newUser as unknown as Record<string, unknown>))
  multi.set(KEYS.userEmail(newUser.email), userId)
  multi.set(KEYS.userUsername(newUser.username), userId)
  if (newUser.googleId) {
    multi.set(KEYS.userGoogle(newUser.googleId), userId)
  }
  await multi.exec()
  return newUser
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getUserById(id: string): Promise<User | null> {
  const user = await redis.hgetall(KEYS.user(id))
  if (!user || Object.keys(user).length === 0) return null
  return {
    ...user,
    balance: Number(user.balance || 0),
  } as User
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const userId = await redis.get(KEYS.userEmail(email))
  if (!userId) return null
  return getUserById(userId as string)
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const userId = await redis.get(KEYS.userUsername(username))
  if (!userId) return null
  return getUserById(userId as string)
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const userId = await redis.get(KEYS.userGoogle(googleId))
  if (!userId) return null
  return getUserById(userId as string)
}

// ─── Delete ────────────────────────────────────────────────────────────────

export async function deleteUser(userId: string): Promise<void> {
  const user = await getUserById(userId)
  if (!user) return

  const crewIds = await redis.smembers(KEYS.userCrews(userId))
  const multi = redis.multi()

  // 1. Remove user from all crews and delete their stats
  if (crewIds && crewIds.length > 0) {
    for (const crewId of crewIds) {
      multi.srem(KEYS.crewMembers(crewId), userId)
      multi.srem(KEYS.crewAdmins(crewId), userId)
      multi.del(KEYS.crewMemberStats(crewId, userId))
    }
  }

  // 2. Delete user lookup indices
  multi.del(KEYS.userEmail(user.email))
  multi.del(KEYS.userUsername(user.username))
  if (user.googleId) {
    multi.del(KEYS.userGoogle(user.googleId))
  }

  // 3. Delete user's crew membership list
  multi.del(KEYS.userCrews(userId))

  // 4. Delete the main user hash
  multi.del(KEYS.user(userId))

  await multi.exec()
}
