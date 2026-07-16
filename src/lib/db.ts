import { redis } from './redis'

// Helper to remove undefined or null properties from objects before hset
function cleanObject(obj: any): any {
  const clean: any = {}
  Object.entries(obj).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      clean[key] = val
    }
  })
  return clean
}

// --- Types ---

export interface User {
  id: string
  email: string
  username: string
  passwordHash?: string
  googleId?: string
  balance: number
  createdAt: string
}

export interface Crew {
  id: string
  name: string
  inviteCode: string
  creatorId: string
  createdAt: string
}

export interface CrewMemberStats {
  userId: string
  username: string
  email: string
  globalBalance: number
  creditsWon: number      // Cumulative Betcoins won in this crew
  creditsWagered: number  // Cumulative Betcoins wagered in this crew
  totalBets: number       // Total bets placed in this crew
  betsWon: number         // Bets won in this crew
  biggestWin: number      // Highest single payout in this crew
  netProfit: number       // creditsWon - creditsWagered
  winRate: number         // betsWon / totalBets
}

export interface BetCard {
  id: string
  crewId: string
  creatorId: string
  creatorUsername: string
  title: string
  description: string
  fixedWager: number
  status: 'active' | 'resolved' | 'refunded'
  winningOptionId?: string
  winningOptionText?: string
  pot: number
  createdAt: string
  options: { [optionId: string]: string } // optionId -> optionText
  wagers: { [userId: string]: string }    // userId -> optionId
}

// --- User Database Operations ---

export async function createUser(data: Omit<User, 'id' | 'balance' | 'createdAt'> & { id?: string }): Promise<User> {
  const userId = data.id || crypto.randomUUID()
  const newUser: User = {
    id: userId,
    email: data.email.toLowerCase(),
    username: data.username,
    passwordHash: data.passwordHash,
    googleId: data.googleId,
    balance: 100000, // PRD Welcome Bonus: 100,000 Betcoins
    createdAt: new Date().toISOString(),
  }

  const multi = redis.multi()
  multi.hset(`user:${userId}`, cleanObject(newUser))
  multi.set(`user:email:${newUser.email}`, userId)
  multi.set(`user:username:${newUser.username.toLowerCase()}`, userId)
  if (newUser.googleId) {
    multi.set(`user:google:${newUser.googleId}`, userId)
  }
  await multi.exec()
  return newUser
}

export async function getUserById(id: string): Promise<User | null> {
  const user = await redis.hgetall(`user:${id}`)
  if (!user || Object.keys(user).length === 0) return null
  return {
    ...user,
    balance: Number(user.balance || 0),
  } as User
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const userId = await redis.get(`user:email:${email.toLowerCase()}`)
  if (!userId) return null
  return getUserById(userId as string)
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const userId = await redis.get(`user:username:${username.toLowerCase()}`)
  if (!userId) return null
  return getUserById(userId as string)
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const userId = await redis.get(`user:google:${googleId}`)
  if (!userId) return null
  return getUserById(userId as string)
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await getUserById(userId)
  if (!user) return

  const crewIds = await redis.smembers(`user:${userId}:crews`)
  const multi = redis.multi()

  // 1. Remove user from all crews and delete their stats
  if (crewIds && crewIds.length > 0) {
    for (const crewId of crewIds) {
      multi.srem(`crew:${crewId}:members`, userId)
      multi.srem(`crew:${crewId}:admins`, userId)
      multi.del(`crew:${crewId}:member:${userId}`)
    }
  }

  // 2. Delete user lookup indices
  multi.del(`user:email:${user.email.toLowerCase()}`)
  multi.del(`user:username:${user.username.toLowerCase()}`)
  if (user.googleId) {
    multi.del(`user:google:${user.googleId}`)
  }

  // 3. Delete user's list of crews
  multi.del(`user:${userId}:crews`)

  // 4. Delete the main user hash
  multi.del(`user:${userId}`)

  await multi.exec()
}

// --- Crew Database Operations ---

export async function createCrew(name: string, creatorId: string): Promise<Crew> {
  const crewId = crypto.randomUUID()
  // Generate a clean 6-character alphanumeric uppercase invite code
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const newCrew: Crew = {
    id: crewId,
    name,
    inviteCode,
    creatorId,
    createdAt: new Date().toISOString(),
  }

  const multi = redis.multi()
  multi.hset(`crew:${crewId}`, cleanObject(newCrew))
  multi.set(`crew:invite:${inviteCode}`, crewId)
  multi.sadd(`crew:${crewId}:members`, creatorId)
  multi.sadd(`crew:${crewId}:admins`, creatorId)
  multi.sadd(`user:${creatorId}:crews`, crewId)
  
  // Initialize member stats for the creator
  multi.hset(`crew:${crewId}:member:${creatorId}`, {
    creditsWon: 0,
    creditsWagered: 0,
    totalBets: 0,
    betsWon: 0,
    biggestWin: 0,
  })

  await multi.exec()
  return newCrew
}

export async function getCrewById(crewId: string): Promise<Crew | null> {
  const crew = await redis.hgetall(`crew:${crewId}`)
  if (!crew || Object.keys(crew).length === 0) return null
  return crew as unknown as Crew
}

export async function getCrewByInviteCode(inviteCode: string): Promise<Crew | null> {
  const crewId = await redis.get(`crew:invite:${inviteCode.toUpperCase()}`)
  if (!crewId) return null
  return getCrewById(crewId as string)
}

export async function isCrewMember(crewId: string, userId: string): Promise<boolean> {
  return await redis.sismember(`crew:${crewId}:members`, userId) === 1
}

export async function isCrewAdmin(crewId: string, userId: string): Promise<boolean> {
  return await redis.sismember(`crew:${crewId}:admins`, userId) === 1
}

export async function addUserToCrew(crewId: string, userId: string): Promise<void> {
  const isMember = await isCrewMember(crewId, userId)
  if (isMember) return

  const multi = redis.multi()
  multi.sadd(`crew:${crewId}:members`, userId)
  multi.sadd(`user:${userId}:crews`, crewId)
  multi.hset(`crew:${crewId}:member:${userId}`, {
    creditsWon: 0,
    creditsWagered: 0,
    totalBets: 0,
    betsWon: 0,
    biggestWin: 0,
  })
  await multi.exec()
}

export async function promoteMemberToAdmin(crewId: string, adminId: string, targetUserId: string): Promise<void> {
  const isAdmin = await isCrewAdmin(crewId, adminId)
  if (!isAdmin) throw new Error('Unauthorized: Only admins can promote members to admin.')

  const isMember = await isCrewMember(crewId, targetUserId)
  if (!isMember) throw new Error('Target user must be a member of the Crew.')

  await redis.sadd(`crew:${crewId}:admins`, targetUserId)
}

export async function getUserCrews(userId: string): Promise<Crew[]> {
  const crewIds = await redis.smembers(`user:${userId}:crews`)
  if (!crewIds || crewIds.length === 0) return []

  const crews: Crew[] = []
  for (const id of crewIds) {
    const crew = await getCrewById(id)
    if (crew) crews.push(crew)
  }

  // Sort crews by creation date desc
  return crews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getCrewMembersWithStats(crewId: string): Promise<CrewMemberStats[]> {
  const memberIds = await redis.smembers(`crew:${crewId}:members`)
  if (!memberIds || memberIds.length === 0) return []

  const statsList: CrewMemberStats[] = []
  for (const userId of memberIds) {
    const [user, stats] = await Promise.all([
      getUserById(userId),
      redis.hgetall(`crew:${crewId}:member:${userId}`),
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

export async function getCrewLeaderboard(crewId: string, sortBy: 'netProfit' | 'globalBalance' | 'winRate' = 'netProfit'): Promise<CrewMemberStats[]> {
  const members = await getCrewMembersWithStats(crewId)
  
  return members.sort((a, b) => {
    if (sortBy === 'globalBalance') {
      return b.globalBalance - a.globalBalance
    } else if (sortBy === 'winRate') {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate
      return b.totalBets - a.totalBets // tie-breaker: more bets placed
    } else {
      // default: netProfit
      return b.netProfit - a.netProfit
    }
  })
}

// --- Bet Card Operations ---

export async function createBetCard(
  crewId: string,
  creatorId: string,
  title: string,
  description: string,
  fixedWager: number,
  initialOptions: string[]
): Promise<BetCard> {
  const betId = crypto.randomUUID()
  const creator = await getUserById(creatorId)
  if (!creator) throw new Error('Creator not found.')

  const isMember = await isCrewMember(crewId, creatorId)
  if (!isMember) throw new Error('Creator must be a member of the Crew.')

  const cleanOptions: { [optionId: string]: string } = {}
  initialOptions.forEach((optionText) => {
    const optionId = crypto.randomUUID()
    cleanOptions[optionId] = optionText.trim()
  })

  const newBet: Omit<BetCard, 'options' | 'wagers'> = {
    id: betId,
    crewId,
    creatorId,
    creatorUsername: creator.username,
    title: title.trim(),
    description: description.trim(),
    fixedWager: Number(fixedWager),
    status: 'active',
    pot: 0,
    createdAt: new Date().toISOString(),
  }

  const multi = redis.multi()
  multi.hset(`bet:${betId}`, cleanObject(newBet))
  multi.hset(`bet:${betId}:options`, cleanOptions)
  multi.sadd(`crew:${crewId}:bets`, betId)
  await multi.exec()

  return {
    ...newBet,
    options: cleanOptions,
    wagers: {},
  } as BetCard
}

export async function getBetCardById(betId: string): Promise<BetCard | null> {
  const [bet, options, wagers] = await Promise.all([
    redis.hgetall(`bet:${betId}`),
    redis.hgetall(`bet:${betId}:options`),
    redis.hgetall(`bet:${betId}:wagers`),
  ])

  if (!bet || Object.keys(bet).length === 0) return null

  return {
    ...bet,
    fixedWager: Number(bet.fixedWager || 0),
    pot: Number(bet.pot || 0),
    options: options || {},
    wagers: wagers || {},
  } as unknown as BetCard
}

export async function getCrewBets(crewId: string): Promise<BetCard[]> {
  const betIds = await redis.smembers(`crew:${crewId}:bets`)
  if (!betIds || betIds.length === 0) return []

  const bets: BetCard[] = []
  for (const betId of betIds) {
    const bet = await getBetCardById(betId)
    if (bet) bets.push(bet)
  }

  // Sort by creation date desc
  return bets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function editBetCardOptions(
  crewId: string,
  adminId: string,
  betId: string,
  options: { [optionId: string]: string }
): Promise<void> {
  const isAdmin = await isCrewAdmin(crewId, adminId)
  if (!isAdmin) throw new Error('Unauthorized: Only admins can edit bet cards.')

  const bet = await getBetCardById(betId)
  if (!bet) throw new Error('Bet card not found.')
  if (bet.status !== 'active') throw new Error('Cannot edit a resolved or refunded bet card.')

  // Trim all option texts
  const updatedOptions: { [optionId: string]: string } = {}
  Object.entries(options).forEach(([id, text]) => {
    updatedOptions[id] = text.trim()
  })

  // Set the updated options hash (this preserves existing user wagers on matching option IDs!)
  await redis.hset(`bet:${betId}:options`, updatedOptions)
}

export async function placeWager(
  crewId: string,
  userId: string,
  betId: string,
  optionId: string,
  customOptionText?: string
): Promise<void> {
  // Validate crew membership
  const isMember = await isCrewMember(crewId, userId)
  if (!isMember) throw new Error('You must be a member of this Crew to place a bet.')

  const bet = await getBetCardById(betId)
  if (!bet) throw new Error('Bet card not found.')
  if (bet.status !== 'active') throw new Error('Betting has concluded for this card.')

  // Check user balance
  const user = await getUserById(userId)
  if (!user) throw new Error('User not found.')
  if (user.balance < bet.fixedWager) {
    throw new Error(`Insufficient funds. Placing this bet requires ${bet.fixedWager} Betcoins, but you only have ${user.balance} Betcoins.`)
  }

  // Enforce 1 option per topic constraint
  const hasWagered = await redis.hexists(`bet:${betId}:wagers`, userId)
  if (hasWagered) {
    throw new Error('You have already placed a bet on this topic. You can only bet once.')
  }

  let finalOptionId = optionId

  // Handle user-generated custom option
  const multi = redis.multi()
  if (customOptionText && customOptionText.trim()) {
    finalOptionId = crypto.randomUUID()
    multi.hset(`bet:${betId}:options`, { [finalOptionId]: customOptionText.trim() })
  } else {
    // Validate selected option exists
    if (!bet.options[optionId]) {
      throw new Error('Selected option does not exist.')
    }
  }

  // Atomically perform transaction:
  // 1. Deduct fixed wager from user global balance
  multi.hincrby(`user:${userId}`, 'balance', -bet.fixedWager)
  // 2. Set wager mapping (userId -> optionId)
  multi.hset(`bet:${betId}:wagers`, { [userId]: finalOptionId })
  // 3. Increment the pot of the bet card
  multi.hincrby(`bet:${betId}`, 'pot', bet.fixedWager)
  // 4. Update member crew-specific metrics
  multi.hincrby(`crew:${crewId}:member:${userId}`, 'totalBets', 1)
  multi.hincrby(`crew:${crewId}:member:${userId}`, 'creditsWagered', bet.fixedWager)

  await multi.exec()
}

export async function resolveBetCard(
  crewId: string,
  adminId: string,
  betId: string,
  winningOptionId: string
): Promise<void> {
  const isAdmin = await isCrewAdmin(crewId, adminId)
  if (!isAdmin) throw new Error('Unauthorized: Only crew admins can resolve wagers.')

  const bet = await getBetCardById(betId)
  if (!bet) throw new Error('Bet card not found.')
  if (bet.status !== 'active') throw new Error('This bet card is already resolved or refunded.')

  const winningOptionText = bet.options[winningOptionId]
  if (!winningOptionText) throw new Error('Selected winning option is invalid.')

  const wagers = bet.wagers // Map of userId -> optionId
  const participants = Object.keys(wagers)

  if (participants.length === 0) {
    // No participants: simply mark as resolved with no payouts
    await redis.hset(`bet:${betId}`, {
      status: 'resolved',
      winningOptionId,
      winningOptionText,
    })
    return
  }

  const winners = participants.filter((userId) => wagers[userId] === winningOptionId)
  const multi = redis.multi()

  if (winners.length > 0) {
    // Payout split
    const payoutShare = Math.floor(bet.pot / winners.length)
    
    // Distribute payouts and update stats
    for (const userId of winners) {
      // 1. Add share to user global balance
      multi.hincrby(`user:${userId}`, 'balance', payoutShare)
      // 2. Increment creditsWon and betsWon in crew-member stats
      multi.hincrby(`crew:${crewId}:member:${userId}`, 'creditsWon', payoutShare)
      multi.hincrby(`crew:${crewId}:member:${userId}`, 'betsWon', 1)
      // Note: We'll evaluate biggestWin in a follow-up or custom setter because hincrby cannot conditionally set values.
      // We will perform a check after executing or as part of the database script.
    }
  } else {
    // No Winners: Refund all participants equally
    // PRD: "No Winners: The pot is refunded equally to all participants."
    // Since everyone wagers the fixedWager, the pot is simply: participants.length * fixedWager.
    // Refunding equally to all participants means giving them back exactly their fixedWager!
    for (const userId of participants) {
      multi.hincrby(`user:${userId}`, 'balance', bet.fixedWager)
      // Adjust creditsWagered so they don't lose profit margin in stats
      multi.hincrby(`crew:${crewId}:member:${userId}`, 'creditsWagered', -bet.fixedWager)
      // Decrement totalBets or keep it? They did place a bet, but it got refunded. Let's keep totalBets but revert creditsWagered.
    }
  }

  // Update Bet Card Status to resolved
  multi.hset(`bet:${betId}`, {
    status: winners.length > 0 ? 'resolved' : 'refunded',
    winningOptionId,
    winningOptionText,
  })

  await multi.exec()

  // Post-processing: Update Biggest Win if needed
  if (winners.length > 0) {
    const payoutShare = Math.floor(bet.pot / winners.length)
    for (const userId of winners) {
      const stats = await redis.hgetall(`crew:${crewId}:member:${userId}`)
      const currentBiggest = Number(stats?.biggestWin || 0)
      if (payoutShare > currentBiggest) {
        await redis.hset(`crew:${crewId}:member:${userId}`, { biggestWin: payoutShare })
      }
    }
  }
}
