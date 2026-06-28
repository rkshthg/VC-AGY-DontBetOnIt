const fs = require('fs')
const path = require('path')
const { Redis } = require('@upstash/redis')

// Load environment variables from .env
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const firstEquals = trimmed.indexOf('=')
    if (firstEquals === -1) return
    const key = trimmed.substring(0, firstEquals).trim()
    let val = trimmed.substring(firstEquals + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  })
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function run() {
  try {
    const userId = 'test-id-' + Date.now()
    const newUser = {
      id: userId,
      email: 'test@example.com',
      username: 'test_user',
      balance: 100000,
      passwordHash: 'some_hash',
      googleId: undefined, // this is undefined during standard email signup!
      createdAt: new Date().toISOString()
    }
    
    console.log('Testing multi transaction with undefined field...')
    const multi = redis.multi()
    multi.hset(`user:${userId}`, newUser)
    multi.set(`user:email:${newUser.email}`, userId)
    multi.set(`user:username:${newUser.username}`, userId)
    
    const res = await multi.exec()
    console.log('Transaction result:', res)
    
    // Cleanup
    await redis.del(`user:${userId}`)
    await redis.del(`user:email:${newUser.email}`)
    await redis.del(`user:username:${newUser.username}`)
    console.log('Cleanup completed.')
  } catch (err) {
    console.error('Multi test failed:', err)
  }
}

run()
