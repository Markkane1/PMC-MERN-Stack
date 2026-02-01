import { Client as PgClient } from 'pg'
import mongoose from 'mongoose'

import { UserModel } from '../infrastructure/database/models/accounts/User'
import { UserProfileModel } from '../infrastructure/database/models/accounts/UserProfile'
import { DistrictModel } from '../infrastructure/database/models/pmc/District'
import { DivisionModel } from '../infrastructure/database/models/pmc/Division'
import { TehsilModel } from '../infrastructure/database/models/pmc/Tehsil'
import { ApplicantDetailModel } from '../infrastructure/database/models/pmc/ApplicantDetail'
import { ApplicantDocumentModel } from '../infrastructure/database/models/pmc/ApplicantDocument'
import { ApplicantFeeModel } from '../infrastructure/database/models/pmc/ApplicantFee'
import { ApplicantFieldResponseModel } from '../infrastructure/database/models/pmc/ApplicantFieldResponse'
import { ApplicantManualFieldsModel } from '../infrastructure/database/models/pmc/ApplicantManualFields'
import { ApplicationAssignmentModel } from '../infrastructure/database/models/pmc/ApplicationAssignment'
import { ApplicationSubmittedModel } from '../infrastructure/database/models/pmc/ApplicationSubmitted'
import { BusinessProfileModel } from '../infrastructure/database/models/pmc/BusinessProfile'
import { ByProductModel } from '../infrastructure/database/models/pmc/ByProduct'
import { CollectorModel } from '../infrastructure/database/models/pmc/Collector'
import { CompetitionRegistrationModel } from '../infrastructure/database/models/pmc/CompetitionRegistration'
import { ConsumerModel } from '../infrastructure/database/models/pmc/Consumer'
import { DistrictPlasticCommitteeDocumentModel } from '../infrastructure/database/models/pmc/DistrictPlasticCommitteeDocument'
import { InspectionReportModel } from '../infrastructure/database/models/pmc/InspectionReport'
import { LicenseModel } from '../infrastructure/database/models/pmc/License'
import { PlasticItemModel } from '../infrastructure/database/models/pmc/PlasticItem'
import { ProducerModel } from '../infrastructure/database/models/pmc/Producer'
import { ProductModel } from '../infrastructure/database/models/pmc/Product'
import { PSIDTrackingModel } from '../infrastructure/database/models/pmc/PSIDTracking'
import { RawMaterialModel } from '../infrastructure/database/models/pmc/RawMaterial'
import { RecyclerModel } from '../infrastructure/database/models/pmc/Recycler'
import { SingleUsePlasticsSnapshotModel } from '../infrastructure/database/models/pmc/SingleUsePlasticsSnapshot'
import { DistrictNewModel } from '../infrastructure/database/models/idm/DistrictNew'
import { EecClubModel } from '../infrastructure/database/models/idm/EecClub'

const env = process.env

const pgConfig = {
  host: env.PGHOST || 'localhost',
  port: parseInt(env.PGPORT || '5432', 10),
  user: env.PGUSER || 'postgres',
  password: env.PGPASSWORD || 'root123',
  database: env.PGDATABASE || 'PMIS',
}

const mongoUrl = env.MONGO_URL || 'mongodb://localhost:27017'
const mongoDbName = env.MONGO_DB || 'PMISCleaned'

const args = new Set(process.argv.slice(2))
const shouldDrop = args.has('--drop')
const batchSize = parseInt(env.MONGO_BATCH_SIZE || '1000', 10)

function log(message: string) {
  // eslint-disable-next-line no-console
  console.log(message)
}

function toCamel(input: string) {
  return input.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function normalizeRow(row: Record<string, any>, model: mongoose.Model<any>, options?: {
  userIdMap?: Map<number, mongoose.Types.ObjectId>
  districtNewMap?: Map<number, mongoose.Types.ObjectId>
}) {
  const allowed = new Set(
    Object.keys(model.schema.paths).filter((key) => !['__v', '_id', 'id'].includes(key))
  )

  const doc: Record<string, any> = {}
  const hasNumericId = allowed.has('numericId')

  if (hasNumericId && row.id !== undefined && row.id !== null) {
    doc.numericId = row.id
  }

  for (const [key, value] of Object.entries(row)) {
    const camelKey = toCamel(key)

    if (!allowed.has(camelKey)) {
      continue
    }

    if ((camelKey === 'createdBy' || camelKey === 'updatedBy' || camelKey === 'userId') && options?.userIdMap) {
      const mapped = options.userIdMap.get(Number(value))
      if (mapped) {
        doc[camelKey] = mapped
      }
      continue
    }

    if (camelKey === 'districtId' && options?.districtNewMap) {
      const mapped = options.districtNewMap.get(Number(value))
      if (mapped) {
        doc[camelKey] = mapped
      }
      continue
    }

    doc[camelKey] = value
  }

  if (allowed.has('createdAt') && row.created_at && !doc.createdAt) {
    doc.createdAt = row.created_at
  }

  if (allowed.has('updatedAt') && row.updated_at && !doc.updatedAt) {
    doc.updatedAt = row.updated_at
  }

  if (allowed.has('updatedAt') && doc.createdAt && !doc.updatedAt) {
    doc.updatedAt = doc.createdAt
  }

  return doc
}

async function fetchRows(pgClient: PgClient, table: string) {
  const { rows } = await pgClient.query(`SELECT * FROM "${table}";`)
  return rows
}

async function insertBatched(model: mongoose.Model<any>, docs: Record<string, any>[]) {
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize)
    if (!batch.length) continue
    await model.insertMany(batch, { ordered: false })
  }
}

async function main() {
  log(`Postgres: ${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`)
  log(`Mongo: ${mongoUrl} (db: ${mongoDbName})`)

  const pgClient = new PgClient(pgConfig)
  await pgClient.connect()

  await mongoose.connect(mongoUrl, { dbName: mongoDbName })

  try {
    if (shouldDrop) {
      const db = mongoose.connection.db!
      const collections = await db.listCollections().toArray()
      for (const collection of collections) {
        await db.dropCollection(collection.name)
        log(`Dropped collection: ${collection.name}`)
      }
    }

    const groupRows = await pgClient.query(
      'SELECT ug.user_id, g.name FROM auth_user_groups ug JOIN auth_group g ON g.id = ug.group_id;'
    )
    const groupMap = new Map<number, string[]>()
    for (const row of groupRows.rows) {
      const userId = Number(row.user_id)
      const list = groupMap.get(userId) || []
      list.push(row.name)
      groupMap.set(userId, list)
    }

    const userRows = await fetchRows(pgClient, 'auth_user')
    const userIdMap = new Map<number, mongoose.Types.ObjectId>()
    const userDocs = userRows.map((row) => {
      const objectId = new mongoose.Types.ObjectId()
      userIdMap.set(Number(row.id), objectId)
      return {
        _id: objectId,
        username: row.username,
        passwordHash: row.password,
        firstName: row.first_name || undefined,
        lastName: row.last_name || undefined,
        groups: groupMap.get(Number(row.id)) || [],
        isActive: row.is_active ?? true,
        createdAt: row.date_joined || undefined,
        updatedAt: row.last_login || row.date_joined || undefined,
      }
    })

    if (userDocs.length) {
      log(`Inserting users: ${userDocs.length}`)
      await insertBatched(UserModel, userDocs)
    }

    const districtRows = await fetchRows(pgClient, 'tbl_districts')
    const districtById = new Map<number, { name?: string; shortName?: string }>()
    const districtDocs = districtRows.map((row) => {
      districtById.set(Number(row.district_id), {
        name: row.district_name || undefined,
        shortName: row.short_name || undefined,
      })
      return normalizeRow(row, DistrictModel)
    })

    if (districtDocs.length) {
      log(`Inserting districts: ${districtDocs.length}`)
      await insertBatched(DistrictModel, districtDocs)
    }

    const divisionRows = await fetchRows(pgClient, 'tbl_divisions')
    const divisionDocs = divisionRows.map((row) => normalizeRow(row, DivisionModel))
    if (divisionDocs.length) {
      log(`Inserting divisions: ${divisionDocs.length}`)
      await insertBatched(DivisionModel, divisionDocs)
    }

    const tehsilRows = await fetchRows(pgClient, 'tbl_tehsils')
    const tehsilDocs = tehsilRows.map((row) => normalizeRow(row, TehsilModel))
    if (tehsilDocs.length) {
      log(`Inserting tehsils: ${tehsilDocs.length}`)
      await insertBatched(TehsilModel, tehsilDocs)
    }

    const districtNewRows = await fetchRows(pgClient, 'districts_new')
    const districtNewMap = new Map<number, mongoose.Types.ObjectId>()
    const districtNewDocs = districtNewRows.map((row) => {
      const objectId = new mongoose.Types.ObjectId()
      if (row.district_id !== undefined && row.district_id !== null) {
        districtNewMap.set(Number(row.district_id), objectId)
      }
      return {
        _id: objectId,
        ...normalizeRow(row, DistrictNewModel),
      }
    })

    if (districtNewDocs.length) {
      log(`Inserting districtNew: ${districtNewDocs.length}`)
      await insertBatched(DistrictNewModel, districtNewDocs)
    }

    const eecClubRows = await fetchRows(pgClient, 'eec_clubs')
    const eecClubDocs = eecClubRows.map((row) =>
      normalizeRow(row, EecClubModel, { userIdMap, districtNewMap })
    )
    if (eecClubDocs.length) {
      log(`Inserting EEC clubs: ${eecClubDocs.length}`)
      await insertBatched(EecClubModel, eecClubDocs)
    }

    const userProfileRows = await fetchRows(pgClient, 'pmc_api_userprofile')
    const userProfileDocs = userProfileRows
      .map((row) => {
        const userId = userIdMap.get(Number(row.user_id))
        if (!userId) return null
        const district = districtById.get(Number(row.district_id))
        return {
          userId,
          districtId: row.district_id ?? undefined,
          districtName: district?.name,
          districtShortName: district?.shortName,
        }
      })
      .filter(Boolean) as Record<string, any>[]

    if (userProfileDocs.length) {
      log(`Inserting user profiles: ${userProfileDocs.length}`)
      await insertBatched(UserProfileModel, userProfileDocs)
    }

    const modelsToMigrate = [
      { table: 'pmc_api_applicantdetail', model: ApplicantDetailModel },
      { table: 'pmc_api_applicantdocuments', model: ApplicantDocumentModel },
      { table: 'pmc_api_applicantfee', model: ApplicantFeeModel },
      { table: 'pmc_api_applicantfieldresponse', model: ApplicantFieldResponseModel },
      { table: 'pmc_api_applicantmanualfields', model: ApplicantManualFieldsModel },
      { table: 'pmc_api_applicationassignment', model: ApplicationAssignmentModel },
      { table: 'pmc_api_applicationsubmitted', model: ApplicationSubmittedModel },
      { table: 'pmc_api_businessprofile', model: BusinessProfileModel },
      { table: 'pmc_api_byproducts', model: ByProductModel },
      { table: 'pmc_api_collector', model: CollectorModel },
      { table: 'pmc_api_competitionregistration', model: CompetitionRegistrationModel },
      { table: 'pmc_api_consumer', model: ConsumerModel },
      { table: 'pmc_api_districtplasticcommitteedocument', model: DistrictPlasticCommitteeDocumentModel },
      { table: 'pmc_api_inspectionreport', model: InspectionReportModel },
      { table: 'pmc_api_license', model: LicenseModel },
      { table: 'pmc_api_plasticitems', model: PlasticItemModel },
      { table: 'pmc_api_producer', model: ProducerModel },
      { table: 'pmc_api_products', model: ProductModel },
      { table: 'pmc_api_psidtracking', model: PSIDTrackingModel },
      { table: 'pmc_api_rawmaterial', model: RawMaterialModel },
      { table: 'pmc_api_recycler', model: RecyclerModel },
      { table: 'pmc_api_singleuseplasticssnapshot', model: SingleUsePlasticsSnapshotModel },
    ]

    for (const { table, model } of modelsToMigrate) {
      const rows = await fetchRows(pgClient, table)
      if (!rows.length) {
        log(`No rows in ${table}`)
        continue
      }

      const docs = rows.map((row) => normalizeRow(row, model, { userIdMap }))
      log(`Inserting ${table}: ${docs.length}`)
      await insertBatched(model, docs)
    }
  } finally {
    await pgClient.end()
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
