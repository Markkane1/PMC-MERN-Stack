import mongoose from 'mongoose'
import { env } from '../infrastructure/config/env'
import { BusinessProfileModel } from '../infrastructure/database/models/pmc/BusinessProfile'
import { ApplicantDetailModel } from '../infrastructure/database/models/pmc/ApplicantDetail'

async function run() {
  await mongoose.connect(env.mongoUri)
  const profile = await BusinessProfileModel.findOne({}).lean()
  const applicant = await ApplicantDetailModel.findOne({}).lean()
  console.log('profile keys', profile ? Object.keys(profile) : null)
  console.log('profile sample', profile)
  console.log('applicant keys', applicant ? Object.keys(applicant) : null)
  console.log('applicant sample', applicant)
  await mongoose.disconnect()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
