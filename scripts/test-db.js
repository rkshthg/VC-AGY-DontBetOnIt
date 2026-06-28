const fs = require('fs')
const path = require('path')
const { Redis } = require('@upstash/redis')

// Load environment variables from .env manually to avoid extra dependencies
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

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

const isConfigured = redisUrl && redisToken && 
                    redisUrl !== 'https://placeholder.upstash.io' && 
                    redisToken !== 'placeholder_token'

if (!isConfigured) {
  console.log('\n[INFO] Skipping DB integration test: Redis credentials are still placeholders in your .env file.')
  console.log('Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to run tests.\n')
  process.exit(0)
}

const redis = new Redis({
  url: redisUrl,
  token: redisToken,
})

async function runTest() {
  console.log('Connecting to Upstash Redis...')
  try {
    const pingResult = await redis.ping()
    console.log(`✔ Redis PING successful: "${pingResult}"`)
    
    // Perform a basic read/write check
    const testKey = 'test:dont-bet-on-it'
    await redis.set(testKey, 'compiled_and_connected')
    const val = await redis.get(testKey)
    console.log(`✔ Redis Set/Get check passed. Value retrieved: "${val}"`)
    
    // Clean up test key
    await redis.del(testKey)
    console.log('✔ Redis Del check passed. Cleaned up test key.')
    console.log('\n✔ DATABASE INTEGRATION TEST COMPLETED SUCCESSFULLY!\n')
  } catch (error) {
    console.error('\n✘ DATABASE INTEGRATION TEST FAILED!')
    console.error(error)
    process.exit(1)
  }
}

runTest()
