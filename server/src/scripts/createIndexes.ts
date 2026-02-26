import path from 'path'
import dotenv from 'dotenv'

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

/**
 * Create MongoDB indexes used by high-traffic PMC endpoints.
 * Run once after deployment: npm run db:index
 */
function isIndexConflict(error: any) {
  return (
    error?.code === 85 ||
    error?.code === 86 ||
    String(error?.codeName || '').includes('Index') ||
    String(error?.message || '').includes('existing index has the same name')
  )
}

function patchCreateIndexToIgnoreConflicts() {
  const proto = Object.getPrototypeOf(DistrictModel.collection) as any
  if (!proto || proto.__pmcSafeCreateIndexPatched) return

  const originalCreateIndex = proto.createIndex
  proto.createIndex = async function patchedCreateIndex(...args: any[]) {
    try {
      return await originalCreateIndex.apply(this, args)
    } catch (error) {
      if (isIndexConflict(error)) {
        return null
      }
      throw error
    }
  }

  proto.__pmcSafeCreateIndexPatched = true
}

async function createIndexes() {
  console.log('Starting index creation...')

  try {
    await connectDb()
    patchCreateIndexToIgnoreConflicts()
    console.log('Connected to MongoDB')

    console.log('Creating District indexes...')
    await DistrictModel.collection.createIndex({ districtId: 1 })
    await DistrictModel.collection.createIndex({ shortName: 1 })
    await DistrictModel.collection.createIndex({ districtName: 1 })

    console.log('Creating Tehsil indexes...')
    await TehsilModel.collection.createIndex({ tehsilId: 1 })
    await TehsilModel.collection.createIndex({ districtId: 1 })
    await TehsilModel.collection.createIndex({ districtId: 1, tehsilName: 1 })

    console.log('Creating Applicant indexes...')
    await ApplicantDetailModel.collection.createIndex({ numericId: 1 }, { unique: true, sparse: true })
    await ApplicantDetailModel.collection.createIndex({ numeric_id: 1 })
    await ApplicantDetailModel.collection.createIndex({ id: 1 })
    await ApplicantDetailModel.collection.createIndex({ trackingNumber: 1 })
    await ApplicantDetailModel.collection.createIndex({ tracking_number: 1 })
    await ApplicantDetailModel.collection.createIndex({ email: 1 })
    await ApplicantDetailModel.collection.createIndex({ mobileNo: 1 })
    await ApplicantDetailModel.collection.createIndex({ applicationStatus: 1 })
    await ApplicantDetailModel.collection.createIndex({ assignedGroup: 1 })
    await ApplicantDetailModel.collection.createIndex({ createdAt: -1 })
    await ApplicantDetailModel.collection.createIndex({ created_at: -1 })
    await ApplicantDetailModel.collection.createIndex({ applicationStatus: 1, createdAt: -1 })
    await ApplicantDetailModel.collection.createIndex({ assignedGroup: 1, createdAt: -1 })
    await ApplicantDetailModel.collection.createIndex({ assignedGroup: 1, applicationStatus: 1, createdAt: -1 })
    await ApplicantDetailModel.collection.createIndex({ assigned_group: 1 })
    await ApplicantDetailModel.collection.createIndex({ application_status: 1, created_at: -1 })
    await ApplicantDetailModel.collection.createIndex({ assigned_group: 1, created_at: -1 })
    await ApplicantDetailModel.collection.createIndex({ assigned_group: 1, application_status: 1, created_at: -1 })
    await ApplicantDetailModel.collection.createIndex({ districtId: 1, applicationStatus: 1 })
    await ApplicantDetailModel.collection.createIndex({ createdBy: 1 })
    await ApplicantDetailModel.collection.createIndex({ created_by: 1 })

    console.log('Creating License indexes...')
    await LicenseModel.collection.createIndex({ applicantId: 1 })
    await LicenseModel.collection.createIndex({ applicant_id: 1 })
    await LicenseModel.collection.createIndex({ licenseNumber: 1 })
    await LicenseModel.collection.createIndex({ license_number: 1 })
    await LicenseModel.collection.createIndex({ isActive: 1 })
    await LicenseModel.collection.createIndex({ is_active: 1 })
    await LicenseModel.collection.createIndex({ isActive: 1, dateOfIssue: -1 })
    await LicenseModel.collection.createIndex({ is_active: 1, date_of_issue: -1 })

    console.log('Creating User indexes...')
    await UserModel.collection.createIndex({ username: 1 }, { unique: true })
    await UserModel.collection.createIndex({ groups: 1 })

    console.log('Creating Permission indexes...')
    await PermissionModel.collection.createIndex({ userId: 1 })

    console.log('Creating Business Profile indexes...')
    await BusinessProfileModel.collection.createIndex({ applicantId: 1 })
    await BusinessProfileModel.collection.createIndex({ applicant_id: 1 })
    await BusinessProfileModel.collection.createIndex({ trackingNumber: 1 })
    await BusinessProfileModel.collection.createIndex({ tracking_number: 1 })
    await BusinessProfileModel.collection.createIndex({ districtId: 1 })
    await BusinessProfileModel.collection.createIndex({ district_id: 1 })
    await BusinessProfileModel.collection.createIndex({ tehsilId: 1 })
    await BusinessProfileModel.collection.createIndex({ tehsil_id: 1 })
    await BusinessProfileModel.collection.createIndex({ businessName: 1 })
    await BusinessProfileModel.collection.createIndex({ business_name: 1 })

    console.log('Creating Applicant Document indexes...')
    await ApplicantDocumentModel.collection.createIndex({ applicantId: 1 })
    await ApplicantDocumentModel.collection.createIndex({ applicant_id: 1 })
    await ApplicantDocumentModel.collection.createIndex({ applicantId: 1, createdAt: -1 })
    await ApplicantDocumentModel.collection.createIndex({ applicant_id: 1, created_at: -1 })

    console.log('Creating Application Submitted indexes...')
    await ApplicationSubmittedModel.collection.createIndex({ applicantId: 1 })
    await ApplicationSubmittedModel.collection.createIndex({ applicant_id: 1 })
    await ApplicationSubmittedModel.collection.createIndex({ createdAt: -1 })
    await ApplicationSubmittedModel.collection.createIndex({ created_at: -1 })

    console.log('Creating Applicant Fee indexes...')
    await ApplicantFeeModel.collection.createIndex({ applicantId: 1, createdAt: -1 })
    await ApplicantFeeModel.collection.createIndex({ applicant_id: 1, created_at: -1 })
    await ApplicantFeeModel.collection.createIndex({ applicantId: 1 })
    await ApplicantFeeModel.collection.createIndex({ applicant_id: 1 })
    await ApplicantFeeModel.collection.createIndex({ isSettled: 1, createdAt: -1 })
    await ApplicantFeeModel.collection.createIndex({ is_settled: 1, created_at: -1 })

    console.log('Creating Application Assignment indexes...')
    await ApplicationAssignmentModel.collection.createIndex({ applicantId: 1, createdAt: -1 })
    await ApplicationAssignmentModel.collection.createIndex({ applicant_id: 1, created_at: -1 })
    await ApplicationAssignmentModel.collection.createIndex({ assignedGroup: 1, createdAt: -1 })
    await ApplicationAssignmentModel.collection.createIndex({ assigned_group: 1, created_at: -1 })

    console.log('Creating PSID Tracking indexes...')
    await PSIDTrackingModel.collection.createIndex({ applicantId: 1, paymentStatus: 1, createdAt: -1 })
    await PSIDTrackingModel.collection.createIndex({ applicant_id: 1, payment_status: 1, created_at: -1 })
    await PSIDTrackingModel.collection.createIndex({ consumerNumber: 1 })
    await PSIDTrackingModel.collection.createIndex({ consumer_number: 1 })
    await PSIDTrackingModel.collection.createIndex({ consumerNumber: 1, deptTransactionId: 1 })
    await PSIDTrackingModel.collection.createIndex({ consumer_number: 1, dept_transaction_id: 1 })

    console.log('Creating Inspection Report indexes...')
    await InspectionReportModel.collection.createIndex({ districtId: 1, inspectionDate: -1, createdAt: -1 })
    await InspectionReportModel.collection.createIndex({ district_id: 1, inspection_date: -1, created_at: -1 })
    await InspectionReportModel.collection.createIndex({ numericId: 1 })
    await InspectionReportModel.collection.createIndex({ numeric_id: 1 })

    console.log('Creating audit/log indexes...')
    await ApiLogModel.collection.createIndex({ createdAt: -1 })
    await ApiLogModel.collection.createIndex({ serviceName: 1, createdAt: -1 })
    await AuditLogModel.collection.createIndex({ timestamp: -1, createdAt: -1 })
    await AuditLogModel.collection.createIndex({ username: 1, timestamp: -1 })
    await AccessLogModel.collection.createIndex({ timestamp: -1, createdAt: -1 })
    await AccessLogModel.collection.createIndex({ username: 1, timestamp: -1 })

    console.log('All indexes created successfully')
    process.exit(0)
  } catch (error) {
    console.error('Error creating indexes:', error)
    process.exit(1)
  }
}

createIndexes()
