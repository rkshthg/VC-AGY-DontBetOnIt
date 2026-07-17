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
