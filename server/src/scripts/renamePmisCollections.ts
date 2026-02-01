import mongoose from 'mongoose'
import { env } from '../infrastructure/config/env'

type RenamePair = { from: string; to: string }

const RENAMES: RenamePair[] = [
  { from: 'auth_user', to: 'users' },
  { from: 'pmc_api_userprofile', to: 'userprofiles' },
  { from: 'tbl_districts', to: 'districts' },
  { from: 'tbl_tehsils', to: 'tehsils' },
  { from: 'tbl_divisions', to: 'divisions' },
  { from: 'districts_new', to: 'districtnews' },
  { from: 'eec_clubs', to: 'eecclubs' },
  { from: 'pmc_api_applicantdetail', to: 'applicantdetails' },
  { from: 'pmc_api_applicantdocuments', to: 'applicantdocuments' },
  { from: 'pmc_api_applicantfee', to: 'applicantfees' },
  { from: 'pmc_api_applicantfieldresponse', to: 'applicantfieldresponses' },
  { from: 'pmc_api_applicantmanualfields', to: 'applicantmanualfields' },
  { from: 'pmc_api_applicationassignment', to: 'applicationassignments' },
  { from: 'pmc_api_applicationsubmitted', to: 'applicationsubmitteds' },
  { from: 'pmc_api_businessprofile', to: 'businessprofiles' },
  { from: 'pmc_api_collector', to: 'collectors' },
  { from: 'pmc_api_consumer', to: 'consumers' },
  { from: 'pmc_api_producer', to: 'producers' },
  { from: 'pmc_api_recycler', to: 'recyclers' },
  { from: 'pmc_api_license', to: 'licenses' },
  { from: 'pmc_api_psidtracking', to: 'psidtrackings' },
  { from: 'pmc_api_inspectionreport', to: 'inspectionreports' },
  { from: 'pmc_api_competitionregistration', to: 'competitionregistrations' },
  { from: 'pmc_api_districtplasticcommitteedocument', to: 'districtplasticcommitteedocuments' },
  { from: 'pmc_api_singleuseplasticssnapshot', to: 'singleuseplasticssnapshots' },
]

function log(message: string) {
  // eslint-disable-next-line no-console
  console.log(message)
}

async function exists(name: string) {
  return mongoose.connection.db!.listCollections({ name }).hasNext()
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '')
  log(`Mongo: ${env.mongoUri}`)
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })

  try {
    for (const pair of RENAMES) {
      const fromExists = await exists(pair.from)
      if (!fromExists) {
        log(`Skip (missing): ${pair.from}`)
        continue
      }

      const toExists = await exists(pair.to)
      if (toExists) {
        const backup = `${pair.to}_bak_${timestamp}`
        log(`Backing up ${pair.to} -> ${backup}`)
        await mongoose.connection.db!.renameCollection(pair.to, backup)
      }

      log(`Renaming ${pair.from} -> ${pair.to}`)
      await mongoose.connection.db!.renameCollection(pair.from, pair.to)
    }
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
