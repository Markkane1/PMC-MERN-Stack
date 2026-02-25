import mongoose from 'mongoose'
import { env } from '../infrastructure/config/env'
import { GroupModel } from '../infrastructure/database/models/accounts/Group'

const REQUIRED_PERMS = [
  'pmc.view_applicantdetail',
  'pmc.add_applicantdetail',
  'pmc.change_applicantdetail',
  'pmc.view_applicantdocument',
  'pmc.add_applicantdocument',
  'pmc.view_businessprofile',
  'pmc.add_businessprofile',
  'pmc.change_businessprofile',
  'pmc.view_producer',
  'pmc.add_producer',
  'pmc.change_producer',
  'pmc.view_consumer',
  'pmc.add_consumer',
  'pmc.change_consumer',
  'pmc.view_collector',
  'pmc.add_collector',
  'pmc.change_collector',
  'pmc.view_recycler',
  'pmc.add_recycler',
  'pmc.change_recycler',
  'pmc.view_district',
  'pmc.view_tehsil',
  'pmc.view_product',
  'pmc.view_byproduct',
  'pmc.view_plasticitem',
  'pmc.view_rawmaterial',
  'pmc.view_license',
  'pmc.add_psidtracking',
  'pmc.view_psidtracking',
]

function log(message: string) {
  // eslint-disable-next-line no-console
  console.log(message)
}

async function main() {
  log(`Mongo: ${env.mongoUri}`)
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })

  try {
    const group = await GroupModel.findOne({ name: 'APPLICANT' })
    if (!group) {
      log('APPLICANT group not found. Creating it with required permissions...')
      await GroupModel.create({ name: 'APPLICANT', permissions: REQUIRED_PERMS })
      return
    }

    const current = new Set(group.permissions || [])
    let changed = false
    for (const perm of REQUIRED_PERMS) {
      if (!current.has(perm)) {
        current.add(perm)
        changed = true
      }
    }

    if (!changed) {
      log('APPLICANT group already has required permissions.')
      return
    }

    group.permissions = Array.from(current)
    await group.save()
    log('APPLICANT group permissions updated.')
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
