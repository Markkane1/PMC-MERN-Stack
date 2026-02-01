import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { env } from '../infrastructure/config/env'
import { UserModel } from '../infrastructure/database/models/accounts/User'

const username = process.env.SUPERADMIN_USERNAME || 'superadmin'
const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@123'

async function run() {
  await mongoose.connect(env.mongoUri)

  const existing = await UserModel.findOne({ username })
  const passwordHash = await bcrypt.hash(password, 10)

  if (existing) {
    existing.passwordHash = passwordHash
    existing.isActive = true
    existing.isSuperadmin = true
    existing.groups = Array.from(new Set([...(existing.groups || []), 'Super', 'Admin']))
    await existing.save()
    console.log(`Updated SuperAdmin: ${username}`)
  } else {
    await UserModel.create({
      username,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      groups: ['Super', 'Admin'],
      permissions: [],
      directPermissions: [],
      isActive: true,
      isSuperadmin: true,
    })
    console.log(`Created SuperAdmin: ${username}`)
  }

  await mongoose.disconnect()
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
