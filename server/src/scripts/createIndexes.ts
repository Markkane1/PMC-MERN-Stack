import path from 'path'
import dotenv from 'dotenv'
import type { Model } from 'mongoose'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import { connectDb } from '../infrastructure/config/db'
import { DistrictModel } from '../infrastructure/database/models/pmc/District'
import { TehsilModel } from '../infrastructure/database/models/pmc/Tehsil'
import { ApplicantDetailModel } from '../infrastructure/database/models/pmc/ApplicantDetail'
import { LicenseModel } from '../infrastructure/database/models/pmc/License'
import { UserModel } from '../infrastructure/database/models/accounts/User'
import { PermissionModel } from '../infrastructure/database/models/accounts/Permission'
import { BusinessProfileModel } from '../infrastructure/database/models/pmc/BusinessProfile'
import { ApplicantDocumentModel } from '../infrastructure/database/models/pmc/ApplicantDocument'
import { ApplicationSubmittedModel } from '../infrastructure/database/models/pmc/ApplicationSubmitted'
import { ApplicantFeeModel } from '../infrastructure/database/models/pmc/ApplicantFee'
import { ApplicationAssignmentModel } from '../infrastructure/database/models/pmc/ApplicationAssignment'
import { PSIDTrackingModel } from '../infrastructure/database/models/pmc/PSIDTracking'
import { InspectionReportModel } from '../infrastructure/database/models/pmc/InspectionReport'
import { ApiLogModel } from '../infrastructure/database/models/common/ApiLog'
import { AuditLogModel } from '../infrastructure/database/models/common/AuditLog'
import { AccessLogModel } from '../infrastructure/database/models/common/AccessLog'
import { ServiceConfigurationModel } from '../infrastructure/database/models/common/ServiceConfiguration'
import { ExternalServiceTokenModel } from '../infrastructure/database/models/common/ExternalServiceToken'

type IndexDirection = 1 | -1

type IndexDefinition = {
  keys: Record<string, IndexDirection>
  options?: Record<string, unknown>
}

type IndexedModel = {
  label: string
  model: Model<any>
  indexes: IndexDefinition[]
}

function isIndexConflict(error: any) {
  return (
    error?.code === 85 ||
    error?.code === 86 ||
    String(error?.codeName || '').includes('Index') ||
    String(error?.message || '').includes('existing index has the same name') ||
    String(error?.message || '').includes('already exists with different options')
  )
}

async function createIndexesForModel({ label, model, indexes }: IndexedModel) {
  console.log(`[index] ${label}: ${indexes.length} definitions`)

  for (const { keys, options = {} } of indexes) {
    try {
      const indexName = await model.collection.createIndex(keys, {
        background: true,
        ...options,
      })
      console.log(`  - ok ${indexName}`)
    } catch (error) {
      if (isIndexConflict(error)) {
        console.warn(`  - skip conflict ${JSON.stringify(keys)}`)
        continue
      }
      throw error
    }
  }
}

const auditedIndexes: IndexedModel[] = [
  {
    label: 'District',
    model: DistrictModel,
    indexes: [
      { keys: { districtId: 1 } },
      { keys: { shortName: 1 } },
      { keys: { districtName: 1 } },
    ],
  },
  {
    label: 'Tehsil',
    model: TehsilModel,
    indexes: [
      { keys: { tehsilId: 1 } },
      { keys: { districtId: 1 } },
      { keys: { districtId: 1, tehsilName: 1 } },
    ],
  },
  {
    label: 'User',
    model: UserModel,
    indexes: [
      { keys: { username: 1 }, options: { unique: true } },
      { keys: { email: 1 } },
      { keys: { sourceId: 1 } },
      { keys: { groups: 1 } },
      { keys: { username: 1, isActive: 1 } },
      { keys: { email: 1, isActive: 1 }, options: { sparse: true } },
      { keys: { groups: 1, isActive: 1 } },
    ],
  },
  {
    label: 'Permission',
    model: PermissionModel,
    indexes: [
      { keys: { permissionKey: 1 }, options: { unique: true } },
      { keys: { appLabel: 1, modelName: 1 } },
    ],
  },
  {
    label: 'ApplicantDetail',
    model: ApplicantDetailModel,
    indexes: [
      { keys: { numericId: 1 }, options: { unique: true, sparse: true } },
      { keys: { numeric_id: 1 } },
      { keys: { id: 1 } },
      { keys: { trackingNumber: 1 } },
      { keys: { tracking_number: 1 } },
      { keys: { email: 1 } },
      { keys: { mobileNo: 1 } },
      { keys: { applicationStatus: 1 } },
      { keys: { assignedGroup: 1 } },
      { keys: { createdAt: -1 } },
      { keys: { created_at: -1 } },
      { keys: { createdBy: 1, createdAt: -1 } },
      { keys: { applicationStatus: 1, createdAt: -1 } },
      { keys: { assignedGroup: 1, createdAt: -1 } },
      { keys: { assignedGroup: 1, applicationStatus: 1, createdAt: -1 } },
      { keys: { assigned_group: 1 } },
      { keys: { application_status: 1, created_at: -1 } },
      { keys: { assigned_group: 1, created_at: -1 } },
      { keys: { assigned_group: 1, application_status: 1, created_at: -1 } },
      { keys: { districtId: 1, applicationStatus: 1 } },
      { keys: { createdBy: 1 } },
      { keys: { created_by: 1 } },
    ],
  },
  {
    label: 'License',
    model: LicenseModel,
    indexes: [
      { keys: { applicantId: 1 } },
      { keys: { applicant_id: 1 } },
      { keys: { licenseNumber: 1 } },
      { keys: { license_number: 1 } },
      { keys: { isActive: 1 } },
      { keys: { is_active: 1 } },
      { keys: { isActive: 1, dateOfIssue: -1 } },
      { keys: { is_active: 1, date_of_issue: -1 } },
    ],
  },
  {
    label: 'BusinessProfile',
    model: BusinessProfileModel,
    indexes: [
      { keys: { applicantId: 1 } },
      { keys: { applicant_id: 1 } },
      { keys: { trackingNumber: 1 } },
      { keys: { tracking_number: 1 } },
      { keys: { districtId: 1 } },
      { keys: { district_id: 1 } },
      { keys: { tehsilId: 1 } },
      { keys: { tehsil_id: 1 } },
      { keys: { businessName: 1 } },
      { keys: { business_name: 1 } },
    ],
  },
  {
    label: 'ApplicantDocument',
    model: ApplicantDocumentModel,
    indexes: [
      { keys: { applicantId: 1 } },
      { keys: { applicant_id: 1 } },
      { keys: { applicantId: 1, createdAt: -1 } },
      { keys: { applicant_id: 1, created_at: -1 } },
    ],
  },
  {
    label: 'ApplicationSubmitted',
    model: ApplicationSubmittedModel,
    indexes: [
      { keys: { applicantId: 1 }, options: { unique: true } },
      { keys: { applicant_id: 1 } },
      { keys: { createdAt: -1 } },
      { keys: { created_at: -1 } },
      { keys: { applicantId: 1, createdAt: -1 } },
      { keys: { applicantId: 1, status: 1, createdAt: -1 } },
      { keys: { applicant_id: 1, created_at: -1 } },
      { keys: { applicant_id: 1, status: 1, created_at: -1 } },
    ],
  },
  {
    label: 'ApplicantFee',
    model: ApplicantFeeModel,
    indexes: [
      { keys: { applicantId: 1 } },
      { keys: { applicant_id: 1 } },
      { keys: { applicantId: 1, createdAt: -1 } },
      { keys: { applicant_id: 1, created_at: -1 } },
      { keys: { isSettled: 1, createdAt: -1 } },
      { keys: { is_settled: 1, created_at: -1 } },
    ],
  },
  {
    label: 'ApplicationAssignment',
    model: ApplicationAssignmentModel,
    indexes: [
      { keys: { applicantId: 1, createdAt: -1 } },
      { keys: { applicant_id: 1, created_at: -1 } },
      { keys: { assignedGroup: 1, createdAt: -1 } },
      { keys: { assigned_group: 1, created_at: -1 } },
      { keys: { assignedToUserId: 1, status: 1 } },
      { keys: { assignedToUserId: 1, status: 1, dueDate: 1 } },
      { keys: { status: 1, createdAt: -1 } },
    ],
  },
  {
    label: 'PSIDTracking',
    model: PSIDTrackingModel,
    indexes: [
      { keys: { applicantId: 1, paymentStatus: 1, createdAt: -1 } },
      { keys: { applicant_id: 1, payment_status: 1, created_at: -1 } },
      { keys: { consumerNumber: 1 } },
      { keys: { consumer_number: 1 } },
      { keys: { consumerNumber: 1, deptTransactionId: 1 } },
      { keys: { consumer_number: 1, dept_transaction_id: 1 } },
    ],
  },
  {
    label: 'InspectionReport',
    model: InspectionReportModel,
    indexes: [
      { keys: { numericId: 1 }, options: { unique: true, sparse: true } },
      { keys: { numeric_id: 1 } },
      { keys: { districtId: 1, inspectionDate: -1, createdAt: -1 } },
      { keys: { district_id: 1, inspection_date: -1, created_at: -1 } },
      { keys: { inspectorId: 1, status: 1 } },
      { keys: { inspectorId: 1, status: 1, isActive: 1, actualDate: -1 } },
      { keys: { applicantId: 1, inspectionType: 1 } },
      { keys: { applicantId: 1, status: 1, actualDate: -1 } },
      { keys: { applicantId: 1, isActive: 1, actualDate: -1 } },
      { keys: { businessId: 1, status: 1 } },
      { keys: { actualDate: -1, status: 1 } },
      { keys: { overallCompliance: 1 } },
      { keys: { isActive: 1, status: 1 } },
      { keys: { followUpRequired: 1, followUpDate: 1 } },
    ],
  },
  {
    label: 'ApiLog',
    model: ApiLogModel,
    indexes: [
      { keys: { createdAt: -1 } },
      { keys: { endpoint: 1, createdAt: -1 } },
      { keys: { serviceName: 1, createdAt: -1 } },
      { keys: { statusCode: 1, createdAt: -1 } },
    ],
  },
  {
    label: 'AuditLog',
    model: AuditLogModel,
    indexes: [
      { keys: { userId: 1, createdAt: -1 } },
      { keys: { userId: 1, timestamp: -1, createdAt: -1 } },
      { keys: { username: 1, timestamp: -1, createdAt: -1 } },
      { keys: { action: 1, timestamp: -1, createdAt: -1 } },
      { keys: { modelName: 1, timestamp: -1, createdAt: -1 } },
      { keys: { timestamp: -1, createdAt: -1 } },
    ],
  },
  {
    label: 'AccessLog',
    model: AccessLogModel,
    indexes: [
      { keys: { timestamp: -1, createdAt: -1 } },
      { keys: { username: 1, timestamp: -1, createdAt: -1 } },
      { keys: { endpoint: 1, timestamp: -1, createdAt: -1 } },
    ],
  },
  {
    label: 'ServiceConfiguration',
    model: ServiceConfigurationModel,
    indexes: [
      { keys: { serviceName: 1 }, options: { unique: true } },
    ],
  },
  {
    label: 'ExternalServiceToken',
    model: ExternalServiceTokenModel,
    indexes: [
      { keys: { serviceName: 1 } },
      { keys: { serviceName: 1, createdAt: -1 } },
      { keys: { serviceName: 1, expiresAt: 1 } },
    ],
  },
]

async function createIndexes() {
  console.log('Starting index creation...')

  try {
    await connectDb()
    console.log('Connected to MongoDB')

    for (const modelConfig of auditedIndexes) {
      await createIndexesForModel(modelConfig)
    }

    console.log('All indexes processed successfully')
    process.exit(0)
  } catch (error) {
    console.error('Error creating indexes:', error)
    process.exit(1)
  }
}

createIndexes()
