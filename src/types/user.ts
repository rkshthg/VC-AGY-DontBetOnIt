export interface User {
  id: string
  email: string
  username: string
  passwordHash?: string
  googleId?: string
  balance: number
  createdAt: string
}

export interface SessionPayload {
  userId: string
  email: string
  username: string
  exp?: number
}
