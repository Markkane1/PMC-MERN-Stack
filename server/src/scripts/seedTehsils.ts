import fs from 'fs'
import path from 'path'
import { connectDb } from '../infrastructure/config/db'
import { TehsilModel } from '../infrastructure/database/models/pmc/Tehsil'

type Tehsil = {
  tehsil_id: number
  district_id: number
  division_id: number
  tehsil_name: string
  tehsil_code: string
}

function loadJson(filePath: string) {
  const data = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(data)
}

async function seed() {
  await connectDb()

  const filePath = process.env.TEHSILS_JSON || path.join(process.cwd(), 'data', 'tehsils.sample.json')
  const tehsils = loadJson(filePath) as Tehsil[]

  if (!Array.isArray(tehsils) || tehsils.length === 0) {
    console.log('No tehsils found to seed. Provide TEHSILS_JSON pointing to a JSON array.')
    process.exit(0)
  }

  for (const t of tehsils) {
    await TehsilModel.updateOne(
      { tehsilId: t.tehsil_id },
      {
        tehsilId: t.tehsil_id,
        districtId: t.district_id,
        divisionId: t.division_id,
        tehsilName: t.tehsil_name,
        tehsilCode: t.tehsil_code,
      },
      { upsert: true }
    )
  }

  console.log(`Seeded ${tehsils.length} tehsils`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
