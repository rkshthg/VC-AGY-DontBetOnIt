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
