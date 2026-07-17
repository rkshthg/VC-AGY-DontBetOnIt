import { redis } from '../redis'
import { KEYS } from '../../constants'
import type { BetCard } from '../../types/bet'
import { getUserById } from './users'
import { isCrewMember, isCrewAdmin } from './crews'

// ─── Create ────────────────────────────────────────────────────────────────

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
  multi.hset(KEYS.bet(betId), newBet as unknown as Record<string, unknown>)
  multi.hset(KEYS.betOptions(betId), cleanOptions)
  multi.sadd(KEYS.crewBets(crewId), betId)
  await multi.exec()

  return { ...newBet, options: cleanOptions, wagers: {} } as BetCard
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getBetCardById(betId: string): Promise<BetCard | null> {
  const [bet, options, wagers] = await Promise.all([
    redis.hgetall(KEYS.bet(betId)),
    redis.hgetall(KEYS.betOptions(betId)),
    redis.hgetall(KEYS.betWagers(betId)),
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
  const betIds = await redis.smembers(KEYS.crewBets(crewId))
  if (!betIds || betIds.length === 0) return []

  const bets: BetCard[] = []
  for (const betId of betIds) {
    const bet = await getBetCardById(betId)
    if (bet) bets.push(bet)
  }

  return bets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// ─── Update ────────────────────────────────────────────────────────────────

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

  const updatedOptions: { [optionId: string]: string } = {}
  Object.entries(options).forEach(([id, text]) => {
    updatedOptions[id] = text.trim()
  })

  await redis.hset(KEYS.betOptions(betId), updatedOptions)
}

// ─── Wager ────────────────────────────────────────────────────────────────

export async function placeWager(
  crewId: string,
  userId: string,
  betId: string,
  optionId: string,
  customOptionText?: string
): Promise<void> {
  const isMember = await isCrewMember(crewId, userId)
  if (!isMember) throw new Error('You must be a member of this Crew to place a bet.')

  const bet = await getBetCardById(betId)
  if (!bet) throw new Error('Bet card not found.')
  if (bet.status !== 'active') throw new Error('Betting has concluded for this card.')

  const user = await getUserById(userId)
  if (!user) throw new Error('User not found.')
  if (user.balance < bet.fixedWager) {
    throw new Error(
      `Insufficient funds. Placing this bet requires ${bet.fixedWager} Betcoins, but you only have ${user.balance} Betcoins.`
    )
  }

  const hasWagered = await redis.hexists(KEYS.betWagers(betId), userId)
  if (hasWagered) {
    throw new Error('You have already placed a bet on this topic. You can only bet once.')
  }

  let finalOptionId = optionId

  const multi = redis.multi()
  if (customOptionText && customOptionText.trim()) {
    finalOptionId = crypto.randomUUID()
    multi.hset(KEYS.betOptions(betId), { [finalOptionId]: customOptionText.trim() })
  } else {
    if (!bet.options[optionId]) throw new Error('Selected option does not exist.')
  }

  multi.hincrby(KEYS.user(userId), 'balance', -bet.fixedWager)
  multi.hset(KEYS.betWagers(betId), { [userId]: finalOptionId })
  multi.hincrby(KEYS.bet(betId), 'pot', bet.fixedWager)
  multi.hincrby(KEYS.crewMemberStats(crewId, userId), 'totalBets', 1)
  multi.hincrby(KEYS.crewMemberStats(crewId, userId), 'creditsWagered', bet.fixedWager)

  await multi.exec()
}

// ─── Resolve ───────────────────────────────────────────────────────────────

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

  const wagers = bet.wagers
  const participants = Object.keys(wagers)

  if (participants.length === 0) {
    await redis.hset(KEYS.bet(betId), { status: 'resolved', winningOptionId, winningOptionText })
    return
  }

  const winners = participants.filter((userId) => wagers[userId] === winningOptionId)
  const multi = redis.multi()

  if (winners.length > 0) {
    const payoutShare = Math.floor(bet.pot / winners.length)
    for (const userId of winners) {
      multi.hincrby(KEYS.user(userId), 'balance', payoutShare)
      multi.hincrby(KEYS.crewMemberStats(crewId, userId), 'creditsWon', payoutShare)
      multi.hincrby(KEYS.crewMemberStats(crewId, userId), 'betsWon', 1)
    }
  } else {
    // No winners: refund all participants
    for (const userId of participants) {
      multi.hincrby(KEYS.user(userId), 'balance', bet.fixedWager)
      multi.hincrby(KEYS.crewMemberStats(crewId, userId), 'creditsWagered', -bet.fixedWager)
    }
  }

  multi.hset(KEYS.bet(betId), {
    status: winners.length > 0 ? 'resolved' : 'refunded',
    winningOptionId,
    winningOptionText,
  })

  await multi.exec()

  // Post-execution: update biggestWin if earned
  if (winners.length > 0) {
    const payoutShare = Math.floor(bet.pot / winners.length)
    for (const userId of winners) {
      const stats = await redis.hgetall(KEYS.crewMemberStats(crewId, userId))
      const currentBiggest = Number(stats?.biggestWin || 0)
      if (payoutShare > currentBiggest) {
        await redis.hset(KEYS.crewMemberStats(crewId, userId), { biggestWin: payoutShare })
      }
    }
  }
}
