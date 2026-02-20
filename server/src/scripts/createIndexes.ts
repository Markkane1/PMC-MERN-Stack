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

/**
 * Create MongoDB indexes used by high-traffic PMC endpoints.
 * Run once after deployment: npm run db:index
 */
async function createIndexes() {
  console.log('Starting index creation...')

  try {
    await connectDb()
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
    await ApplicantDetailModel.collection.createIndex({ numericId: 1 })
    await ApplicantDetailModel.collection.createIndex({ trackingNumber: 1 })
    await ApplicantDetailModel.collection.createIndex({ email: 1 })
    await ApplicantDetailModel.collection.createIndex({ mobileNo: 1 })
    await ApplicantDetailModel.collection.createIndex({ applicationStatus: 1 })
    await ApplicantDetailModel.collection.createIndex({ assignedGroup: 1 })
    await ApplicantDetailModel.collection.createIndex({ applicationStatus: 1, createdAt: -1 })
    await ApplicantDetailModel.collection.createIndex({ assignedGroup: 1, createdAt: -1 })
    await ApplicantDetailModel.collection.createIndex({ assignedGroup: 1, applicationStatus: 1, createdAt: -1 })
    await ApplicantDetailModel.collection.createIndex({ assigned_group: 1 })
    await ApplicantDetailModel.collection.createIndex({ application_status: 1, created_at: -1 })
    await ApplicantDetailModel.collection.createIndex({ assigned_group: 1, created_at: -1 })
    await ApplicantDetailModel.collection.createIndex({ assigned_group: 1, application_status: 1, created_at: -1 })
    await ApplicantDetailModel.collection.createIndex({ districtId: 1, applicationStatus: 1 })
    await ApplicantDetailModel.collection.createIndex({ createdBy: 1 })

    console.log('Creating License indexes...')
    await LicenseModel.collection.createIndex({ applicantId: 1 })
    await LicenseModel.collection.createIndex({ licenseNumber: 1 })
    await LicenseModel.collection.createIndex({ isActive: 1 })
    await LicenseModel.collection.createIndex({ isActive: 1, dateOfIssue: -1 })

    console.log('Creating User indexes...')
    await UserModel.collection.createIndex({ username: 1 }, { unique: true })
    await UserModel.collection.createIndex({ groups: 1 })

    console.log('Creating Permission indexes...')
    await PermissionModel.collection.createIndex({ userId: 1 })

    console.log('Creating Business Profile indexes...')
    await BusinessProfileModel.collection.createIndex({ applicantId: 1 })
    await BusinessProfileModel.collection.createIndex({ trackingNumber: 1 })
    await BusinessProfileModel.collection.createIndex({ districtId: 1 })

    console.log('Creating Applicant Document indexes...')
    await ApplicantDocumentModel.collection.createIndex({ applicantId: 1 })
    await ApplicantDocumentModel.collection.createIndex({ applicantId: 1, createdAt: -1 })

    console.log('Creating Application Submitted indexes...')
    await ApplicationSubmittedModel.collection.createIndex({ applicantId: 1 })
    await ApplicationSubmittedModel.collection.createIndex({ applicant_id: 1 })
    await ApplicationSubmittedModel.collection.createIndex({ createdAt: -1 })
    await ApplicationSubmittedModel.collection.createIndex({ created_at: -1 })

    console.log('Creating Applicant Fee indexes...')
    await ApplicantFeeModel.collection.createIndex({ applicantId: 1, createdAt: -1 })
    await ApplicantFeeModel.collection.createIndex({ applicant_id: 1, created_at: -1 })
    await ApplicantFeeModel.collection.createIndex({ isSettled: 1, createdAt: -1 })
    await ApplicantFeeModel.collection.createIndex({ is_settled: 1, created_at: -1 })

    console.log('Creating Application Assignment indexes...')
    await ApplicationAssignmentModel.collection.createIndex({ applicantId: 1, createdAt: -1 })
    await ApplicationAssignmentModel.collection.createIndex({ applicant_id: 1, created_at: -1 })
    await ApplicationAssignmentModel.collection.createIndex({ assignedGroup: 1, createdAt: -1 })
    await ApplicationAssignmentModel.collection.createIndex({ assigned_group: 1, created_at: -1 })

    console.log('All indexes created successfully')
    process.exit(0)
  } catch (error) {
    console.error('Error creating indexes:', error)
    process.exit(1)
  }
}

createIndexes()
