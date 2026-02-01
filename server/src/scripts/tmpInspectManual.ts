import mongoose from 'mongoose'
import { env } from '../infrastructure/config/env'
import { ApplicantManualFieldsModel } from '../infrastructure/database/models/pmc/ApplicantManualFields'

async function run() {
  await mongoose.connect(env.mongoUri)
  const manual = await ApplicantManualFieldsModel.findOne({ latitude: { $ne: null } }).lean()
  console.log('manual keys', manual ? Object.keys(manual) : null)
  console.log('manual sample', manual)
  await mongoose.disconnect()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
