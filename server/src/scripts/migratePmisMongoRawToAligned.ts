import mongoose from 'mongoose'
import { env } from '../infrastructure/config/env'

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

const args = new Set(process.argv.slice(2))
const shouldDrop = args.has('--drop-aligned')
const batchSize = parseInt(process.env.MONGO_BATCH_SIZE || '1000', 10)

function log(message: string) {
  // eslint-disable-next-line no-console
  console.log(message)
}

function toCamel(input: string) {
  return input.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function normalizeRow(
  row: Record<string, any>,
  model: mongoose.Model<any>,
  options?: {
    userIdMap?: Map<number, mongoose.Types.ObjectId>
    districtNewMap?: Map<number, mongoose.Types.ObjectId>
  }
) {
  const allowed = new Set(Object.keys(model.schema.paths).filter((key) => !['__v', '_id', 'id'].includes(key)))

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

async function insertBatched(model: mongoose.Model<any>, docs: Record<string, any>[]) {
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize)
    if (!batch.length) continue
    await model.insertMany(batch, { ordered: false })
  }
}

async function fetchRaw(name: string) {
  return mongoose.connection.db!.collection(name).find({}).toArray()
}

async function dropCollections(models: mongoose.Model<any>[]) {
  for (const model of models) {
    const name = model.collection.name
    const exists = await mongoose.connection.db!.listCollections({ name }).hasNext()
    if (exists) {
      await mongoose.connection.db!.dropCollection(name)
      log(`Dropped collection: ${name}`)
    }
  }
}

async function main() {
  log(`Mongo: ${env.mongoUri}`)
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })

  try {
    if (shouldDrop) {
      await dropCollections([
        UserModel,
        UserProfileModel,
        DistrictModel,
        DivisionModel,
        TehsilModel,
        ApplicantDetailModel,
        ApplicantDocumentModel,
        ApplicantFeeModel,
        ApplicantFieldResponseModel,
        ApplicantManualFieldsModel,
        ApplicationAssignmentModel,
        ApplicationSubmittedModel,
        BusinessProfileModel,
        ByProductModel,
        CollectorModel,
        CompetitionRegistrationModel,
        ConsumerModel,
        DistrictPlasticCommitteeDocumentModel,
        InspectionReportModel,
        LicenseModel,
        PlasticItemModel,
        ProducerModel,
        ProductModel,
        PSIDTrackingModel,
        RawMaterialModel,
        RecyclerModel,
        SingleUsePlasticsSnapshotModel,
        DistrictNewModel,
        EecClubModel,
      ])
    }

    const groupRows = await fetchRaw('auth_user_groups')
    const groupDocs = await fetchRaw('auth_group')
    const groupIdToName = new Map<number, string>()
    for (const group of groupDocs) {
      groupIdToName.set(Number(group.id), group.name)
    }

    const groupMap = new Map<number, string[]>()
    for (const row of groupRows) {
      const userId = Number(row.user_id)
      const groupName = groupIdToName.get(Number(row.group_id))
      if (!groupName) continue
      const list = groupMap.get(userId) || []
      list.push(groupName)
      groupMap.set(userId, list)
    }

    const userRows = await fetchRaw('auth_user')
    const userIdMap = new Map<number, mongoose.Types.ObjectId>()
    const userDocs = userRows.map((row: any) => {
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

    const districtRows = await fetchRaw('tbl_districts')
    const districtDocs = districtRows.map((row: any) => normalizeRow(row, DistrictModel))
    if (districtDocs.length) {
      log(`Inserting districts: ${districtDocs.length}`)
      await insertBatched(DistrictModel, districtDocs)
    }

    const divisionRows = await fetchRaw('tbl_divisions')
    const divisionDocs = divisionRows.map((row: any) => normalizeRow(row, DivisionModel))
    if (divisionDocs.length) {
      log(`Inserting divisions: ${divisionDocs.length}`)
      await insertBatched(DivisionModel, divisionDocs)
    }

    const tehsilRows = await fetchRaw('tbl_tehsils')
    const tehsilDocs = tehsilRows.map((row: any) => normalizeRow(row, TehsilModel))
    if (tehsilDocs.length) {
      log(`Inserting tehsils: ${tehsilDocs.length}`)
      await insertBatched(TehsilModel, tehsilDocs)
    }

    const districtNewRows = await fetchRaw('districts_new')
    const districtNewMap = new Map<number, mongoose.Types.ObjectId>()
    const districtNewDocs = districtNewRows.map((row: any) => {
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
      log(`Inserting districts_new: ${districtNewDocs.length}`)
      await insertBatched(DistrictNewModel, districtNewDocs)
    }

    const eecRows = await fetchRaw('eec_clubs')
    const eecDocs = eecRows.map((row: any) => normalizeRow(row, EecClubModel, { userIdMap, districtNewMap }))
    if (eecDocs.length) {
      log(`Inserting eec clubs: ${eecDocs.length}`)
      await insertBatched(EecClubModel, eecDocs)
    }

    const userProfileRows = await fetchRaw('pmc_api_userprofile')
    const userProfileDocs = userProfileRows
      .map((row: any) => normalizeRow(row, UserProfileModel, { userIdMap }))
      .filter((doc: any) => doc.userId)
    if (userProfileDocs.length) {
      log(`Inserting user profiles: ${userProfileDocs.length}`)
      await insertBatched(UserProfileModel, userProfileDocs)
    }

    const docsMap: Array<[string, mongoose.Model<any>, boolean]> = [
      ['pmc_api_applicantdetail', ApplicantDetailModel, true],
      ['pmc_api_applicantdocuments', ApplicantDocumentModel, true],
      ['pmc_api_applicantfee', ApplicantFeeModel, true],
      ['pmc_api_applicantfieldresponse', ApplicantFieldResponseModel, true],
      ['pmc_api_applicantmanualfields', ApplicantManualFieldsModel, true],
      ['pmc_api_applicationassignment', ApplicationAssignmentModel, true],
      ['pmc_api_applicationsubmitted', ApplicationSubmittedModel, false],
      ['pmc_api_businessprofile', BusinessProfileModel, true],
      ['byproducts', ByProductModel, false],
      ['pmc_api_collector', CollectorModel, true],
      ['pmc_api_competitionregistration', CompetitionRegistrationModel, false],
      ['pmc_api_consumer', ConsumerModel, true],
      ['pmc_api_districtplasticcommitteedocument', DistrictPlasticCommitteeDocumentModel, true],
      ['pmc_api_inspectionreport', InspectionReportModel, true],
      ['pmc_api_license', LicenseModel, true],
      ['plasticitems', PlasticItemModel, false],
      ['pmc_api_producer', ProducerModel, true],
      ['products', ProductModel, false],
      ['pmc_api_psidtracking', PSIDTrackingModel, true],
      ['rawmaterials', RawMaterialModel, false],
      ['pmc_api_recycler', RecyclerModel, true],
      ['pmc_api_singleuseplasticssnapshot', SingleUsePlasticsSnapshotModel, true],
    ]

    for (const [collectionName, model, mapUsers] of docsMap) {
      const rows = await fetchRaw(collectionName)
      if (!rows.length) continue
      const docs = rows.map((row: any) => normalizeRow(row, model, mapUsers ? { userIdMap } : undefined))
      log(`Inserting ${collectionName} -> ${model.collection.name}: ${docs.length}`)
      await insertBatched(model, docs)
    }
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
