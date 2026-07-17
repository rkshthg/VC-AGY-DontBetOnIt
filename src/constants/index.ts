// ─── Auth & Session ────────────────────────────────────────────────────────
export const SESSION_COOKIE_NAME = 'session_token'
export const JWT_EXPIRY = '30d'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days in seconds

// ─── Economy ───────────────────────────────────────────────────────────────
/** Starting balance granted to every new user */
export const STARTING_BALANCE = 100_000

// ─── Invite Code ───────────────────────────────────────────────────────────
/** Length of the random invite code generated for each crew */
export const INVITE_CODE_LENGTH = 6

// ─── Redis Key Prefixes ────────────────────────────────────────────────────
/** Namespace helpers — use these instead of raw string templates in lib/db/ */
export const KEYS = {
  user: (id: string) => `user:${id}`,
  userEmail: (email: string) => `user:email:${email.toLowerCase()}`,
  userUsername: (username: string) => `user:username:${username.toLowerCase()}`,
  userGoogle: (googleId: string) => `user:google:${googleId}`,
  userCrews: (userId: string) => `user:${userId}:crews`,

  crew: (id: string) => `crew:${id}`,
  crewInvite: (code: string) => `crew:invite:${code.toUpperCase()}`,
  crewMembers: (id: string) => `crew:${id}:members`,
  crewAdmins: (id: string) => `crew:${id}:admins`,
  crewBets: (id: string) => `crew:${id}:bets`,
  crewMemberStats: (crewId: string, userId: string) => `crew:${crewId}:member:${userId}`,

  bet: (id: string) => `bet:${id}`,
  betOptions: (id: string) => `bet:${id}:options`,
  betWagers: (id: string) => `bet:${id}:wagers`,
} as const
