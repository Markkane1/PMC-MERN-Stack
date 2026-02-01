import crypto from 'crypto'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { env } from '../infrastructure/config/env'
import { UserModel } from '../infrastructure/database/models/accounts/User'

const username = process.argv[2] || 'superadmin'
const rawPasswordArg = process.argv[3]
const forceReset = process.argv.includes('--reset')
const passwordArg = rawPasswordArg && !rawPasswordArg.startsWith('--') ? rawPasswordArg : undefined
const password = passwordArg || `PMC-${crypto.randomBytes(6).toString('base64url')}`

async function run() {
  await mongoose.connect(env.mongoUri, {
  serverSelectionTimeoutMS: 5000,
})
  const existing = await UserModel.findOne({ username }).lean()
  if (existing) {
    if (!forceReset && !passwordArg) {
      console.log(`User '${username}' already exists. No changes made.`)
      console.log(`Use this username to login: ${username}`)
      process.exit(0)
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await UserModel.updateOne(
      { _id: existing._id },
      {
        $set: {
          passwordHash,
          firstName: 'Super',
          lastName: 'Admin',
          groups: ['Super', 'Admin'],
          isActive: true,
        },
      }
    )

    console.log('Superadmin updated.')
    console.log(`username: ${username}`)
    console.log(`password: ${password}`)
    process.exit(0)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await UserModel.create({
    username,
    passwordHash,
    firstName: 'Super',
    lastName: 'Admin',
    groups: ['Super', 'Admin'],
    isActive: true,
  })

  console.log('Superadmin created.')
  console.log(`username: ${username}`)
  console.log(`password: ${password}`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
