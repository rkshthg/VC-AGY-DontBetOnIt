import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

// Check if credentials are set and not placeholder values
export const isRedisConfigured = !!(
  redisUrl &&
  redisToken &&
  redisUrl !== 'https://placeholder.upstash.io' &&
  redisToken !== 'placeholder_token'
)

// Instantiate the Upstash Redis client.
// It will fall back to placeholders to prevent compile/load-time crashes,
// but we check isRedisConfigured at runtime to guide the user.
export const redis = new Redis({
  url: redisUrl || 'https://placeholder.upstash.io',
  token: redisToken || 'placeholder_token',
})
