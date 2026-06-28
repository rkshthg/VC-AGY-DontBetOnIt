import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env manually BEFORE dynamic imports
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

async function run() {
  console.log('Running Signup Database workflow verification (with loaded env and dynamic imports)...')
  try {
    // Dynamic import to prevent hoisting of Redis client initialization
    const { createUser, getUserById, getUserByEmail } = await import('../src/lib/db')
    const { redis } = await import('../src/lib/redis')

    const timestamp = Date.now()
    const email = `test_flow_${timestamp}@example.com`
    const username = `verify_u_${timestamp}`
    const passwordHash = '$2a$10$abcdefghijklmnopqrstuv' // dummy bcrypt hash

    console.log(`Step 1: Creating user "${username}" with email "${email}"...`)
    const user = await createUser({
      username,
      email,
      passwordHash,
    })

    console.log('✔ User created successfully in Redis:')
    console.log(JSON.stringify(user, null, 2))

    console.log(`\nStep 2: Retrieving user by ID "${user.id}"...`)
    const fetchedUser = await getUserById(user.id)
    if (!fetchedUser) {
      throw new Error(`Failed to retrieve user by ID "${user.id}"`)
    }
    console.log('✔ User retrieved successfully by ID:')
    console.log(JSON.stringify(fetchedUser, null, 2))

    console.log(`\nStep 3: Retrieving user by Email "${email}"...`)
    const fetchedByEmail = await getUserByEmail(email)
    if (!fetchedByEmail) {
      throw new Error(`Failed to retrieve user by Email "${email}"`)
    }
    console.log('✔ User retrieved successfully by Email!')

    // Clean up
    console.log('\nStep 4: Cleaning up created test keys...')
    const multi = redis.multi()
    multi.del(`user:${user.id}`)
    multi.del(`user:email:${email.toLowerCase()}`)
    multi.del(`user:username:${username.toLowerCase()}`)
    await multi.exec()
    console.log('✔ Redis keys cleaned up.')

    console.log('\n✔ SIGNUP DATABASE PIPELINE VERIFIED SUCCESSFULLY!\n')
    process.exit(0)
  } catch (error) {
    console.error('\n✘ SIGNUP DATABASE PIPELINE VERIFICATION FAILED!')
    console.error(error)
    process.exit(1)
  }
}

run()
