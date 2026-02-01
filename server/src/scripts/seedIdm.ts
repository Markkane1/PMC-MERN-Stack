import fs from 'fs'
import path from 'path'
import { connectDb } from '../infrastructure/config/db'
import { DistrictNewModel } from '../infrastructure/database/models/idm/DistrictNew'
import { EecClubModel } from '../infrastructure/database/models/idm/EecClub'

type DistrictNew = {
  name?: string
  short_name?: string
  division_name?: string
  district_id?: number
  division_id?: number
  extent?: string
  geom?: any
}

type Club = {
  emiscode?: number
  school_name?: string
  address?: string
  head_name?: string
  head_mobile?: string
  gender?: string
  education_level?: string
  latitude?: number
  longitude?: number
  added_by?: string
  district_id?: string
  district_name?: string
  notification_path?: string
  geom?: any
}

function loadJson(filePath: string) {
  const data = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(data)
}

async function seed() {
  await connectDb()

  const districtsPath = process.env.IDM_DISTRICTS_JSON || path.join(process.cwd(), 'data', 'idm_districts.sample.json')
  const clubsPath = process.env.IDM_CLUBS_JSON || path.join(process.cwd(), 'data', 'idm_clubs.sample.json')

  const districts = loadJson(districtsPath) as DistrictNew[]
  const clubs = loadJson(clubsPath) as Club[]

  if (Array.isArray(districts) && districts.length > 0) {
    for (const d of districts) {
      await DistrictNewModel.updateOne(
        { shortName: d.short_name, name: d.name },
        {
          name: d.name,
          shortName: d.short_name,
          divisionName: d.division_name,
          districtId: d.district_id,
          divisionId: d.division_id,
          extent: d.extent,
          geom: d.geom,
        },
        { upsert: true }
      )
    }
    console.log(`Seeded ${districts.length} IDM districts`)
  } else {
    console.log('No IDM districts to seed.')
  }

  if (Array.isArray(clubs) && clubs.length > 0) {
    for (const c of clubs) {
      await EecClubModel.updateOne(
        { emisCode: c.emiscode, schoolName: c.school_name },
        {
          emisCode: c.emiscode,
          schoolName: c.school_name,
          address: c.address,
          headName: c.head_name,
          headMobile: c.head_mobile,
          gender: c.gender,
          educationLevel: c.education_level,
          latitude: c.latitude,
          longitude: c.longitude,
          addedBy: c.added_by,
          districtName: c.district_name,
          notificationPath: c.notification_path,
          geom: c.geom,
        },
        { upsert: true }
      )
    }
    console.log(`Seeded ${clubs.length} IDM clubs`)
  } else {
    console.log('No IDM clubs to seed.')
  }

  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
