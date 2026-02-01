import mongoose from 'mongoose'
import { env } from '../infrastructure/config/env'
import { GroupModel } from '../infrastructure/database/models/accounts/Group'

const REQUIRED_PERMS = [
  'pmc_api.view_applicantdetail',
  'pmc_api.add_applicantdetail',
  'pmc_api.change_applicantdetail',
  'pmc_api.view_applicantdocument',
  'pmc_api.add_applicantdocument',
  'pmc_api.view_businessprofile',
  'pmc_api.add_businessprofile',
  'pmc_api.change_businessprofile',
  'pmc_api.view_producer',
  'pmc_api.add_producer',
  'pmc_api.change_producer',
  'pmc_api.view_consumer',
  'pmc_api.add_consumer',
  'pmc_api.change_consumer',
  'pmc_api.view_collector',
  'pmc_api.add_collector',
  'pmc_api.change_collector',
  'pmc_api.view_recycler',
  'pmc_api.add_recycler',
  'pmc_api.change_recycler',
  'pmc_api.view_district',
  'pmc_api.view_tehsil',
  'pmc_api.view_product',
  'pmc_api.view_byproduct',
  'pmc_api.view_plasticitem',
  'pmc_api.view_rawmaterial',
  'pmc_api.view_license',
  'pmc_api.add_psidtracking',
  'pmc_api.view_psidtracking',
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
