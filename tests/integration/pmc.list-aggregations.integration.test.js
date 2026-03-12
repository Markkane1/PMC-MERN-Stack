const request = require('supertest')
const jwt = require('jsonwebtoken')
const path = require('path')
const bcrypt = require(path.resolve(process.cwd(), 'server/node_modules/bcryptjs'))

const {
  bootstrapTestApp,
  resetDatabase,
  shutdownTestApp,
} = require('./helpers/testApp')

jest.setTimeout(60000)

describe('PMC list aggregation integration', () => {
  let app
  let UserModel
  let ApplicantDetailModel
  let BusinessProfileModel
  let ApplicationAssignmentModel
  let ApplicantDocumentModel
  let ApplicantFeeModel
  let ApplicationSubmittedModel
  let ApplicantManualFieldsModel
  let ProducerModel
  let LicenseModel
  let InspectionReportModel
  let DistrictModel
  let TehsilModel
  let superUser
  let superToken

  const jwtSecret = 'test-jwt-secret-at-least-thirty-two-characters'

  beforeAll(async () => {
    app = await bootstrapTestApp()
    ;({ UserModel } = require('../../server/dist/infrastructure/database/models/accounts/User.js'))
    ;({ ApplicantDetailModel } = require('../../server/dist/infrastructure/database/models/pmc/ApplicantDetail.js'))
    ;({ BusinessProfileModel } = require('../../server/dist/infrastructure/database/models/pmc/BusinessProfile.js'))
    ;({ ApplicationAssignmentModel } = require('../../server/dist/infrastructure/database/models/pmc/ApplicationAssignment.js'))
    ;({ ApplicantDocumentModel } = require('../../server/dist/infrastructure/database/models/pmc/ApplicantDocument.js'))
    ;({ ApplicantFeeModel } = require('../../server/dist/infrastructure/database/models/pmc/ApplicantFee.js'))
    ;({ ApplicationSubmittedModel } = require('../../server/dist/infrastructure/database/models/pmc/ApplicationSubmitted.js'))
    ;({ ApplicantManualFieldsModel } = require('../../server/dist/infrastructure/database/models/pmc/ApplicantManualFields.js'))
    ;({ ProducerModel } = require('../../server/dist/infrastructure/database/models/pmc/Producer.js'))
    ;({ LicenseModel } = require('../../server/dist/infrastructure/database/models/pmc/License.js'))
    ;({ InspectionReportModel } = require('../../server/dist/infrastructure/database/models/pmc/InspectionReport.js'))
    ;({ DistrictModel } = require('../../server/dist/infrastructure/database/models/pmc/District.js'))
    ;({ TehsilModel } = require('../../server/dist/infrastructure/database/models/pmc/Tehsil.js'))
  })

  beforeEach(async () => {
    await resetDatabase()

    superUser = await UserModel.create({
      username: 'super.list.user',
      passwordHash: await bcrypt.hash('SuperPass123', 10),
      groups: ['Super', 'Admin'],
      permissions: [],
      directPermissions: [],
      isActive: true,
      isSuperadmin: true,
    })

    superToken = jwt.sign({ userId: String(superUser._id), type: 'access' }, jwtSecret, { expiresIn: '1h' })

    await DistrictModel.create({
      districtId: 1,
      divisionId: 1,
      districtName: 'Lahore',
      districtCode: 'LHR',
      shortName: 'LHR',
    })

    await TehsilModel.create({
      tehsilId: 11,
      tehsilName: 'Model Town',
      tehsilCode: 'MT',
      districtId: 1,
      divisionId: 1,
    })
  })

  afterAll(async () => {
    await shutdownTestApp()
  })

  it('hydrates applicant list rows without per-applicant follow-up queries', async () => {
    await ApplicantDetailModel.create({
      numericId: 101,
      firstName: 'Ayesha',
      lastName: 'Khan',
      applicantDesignation: 'Owner',
      cnic: '35202-1234567-8',
      mobileNo: '03001234567',
      applicationStatus: 'Submitted',
      trackingNumber: 'LHR-PRO-101',
      assignedGroup: 'LSO',
      createdBy: superUser._id,
    })

    await BusinessProfileModel.create({
      applicantId: 101,
      businessName: 'Green Plastics',
      postalAddress: '123 Main Road',
      districtId: 1,
      tehsilId: 11,
    })

    await ApplicationAssignmentModel.create({
      numericId: 1001,
      applicantId: 101,
      businessId: 101,
      assignedToUserId: 9001,
      assignmentType: 'PROCESSING',
      dueDate: new Date('2026-03-01'),
      assignedGroup: 'LSO',
      remarks: 'Initial review',
      createdBy: 1,
      updatedBy: 1,
    })

    await ApplicantDocumentModel.create({
      numericId: 2001,
      applicantId: 101,
      documentType: 'CNIC',
      fileUrl: '/media/documents/id-card.pdf',
      fileName: 'id-card.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      documentDescription: 'Identity Document',
      documentPath: 'media/documents/id-card.pdf',
      createdBy: superUser._id,
    })

    await ApplicantFeeModel.create({
      applicantId: 101,
      feeAmount: 5000,
      isSettled: true,
      reason: 'Registration fee',
    })

    await ApplicationSubmittedModel.create({
      applicantId: 101,
    })

    await ApplicantManualFieldsModel.create({
      applicantId: 101,
      latitude: 31.5,
      longitude: 74.3,
    })

    await ProducerModel.create({
      applicantId: 101,
      numberOfMachines: '2',
    })

    const response = await request(app)
      .get('/api/pmc/applicant-detail-main-list/?page=1&limit=20')
      .set('Authorization', `Bearer ${superToken}`)

    expect(response.status).toBe(200)
    expect(response.body.pagination.total).toBe(1)
    expect(response.body.data[0]).toMatchObject({
      id: 101,
      tracking_number: 'LHR-PRO-101',
    })
    expect(response.body.data[0].businessprofile.business_name).toBe('Green Plastics')
    expect(response.body.data[0].businessprofile.district_name).toBe('Lahore')
    expect(response.body.data[0].businessprofile.tehsil_name).toBe('Model Town')
    expect(response.body.data[0].applicationassignment).toHaveLength(1)
    expect(response.body.data[0].applicationdocument).toHaveLength(1)
    expect(response.body.data[0].applicantfees).toHaveLength(1)
    expect(response.body.data[0].manual_fields.latitude).toBe(31.5)
  })

  it('hydrates license list rows with business profile and location metadata', async () => {
    await LicenseModel.create({
      applicantId: 101,
      licenseNumber: 'LIC-101',
      licenseFor: 'Producer',
      ownerName: 'Ayesha Khan',
      businessName: 'Green Plastics',
      feeAmount: 5000,
      dateOfIssue: new Date('2026-01-01'),
    })

    await BusinessProfileModel.create({
      applicantId: 101,
      businessName: 'Green Plastics',
      postalAddress: '123 Main Road',
      cityTownVillage: 'Lahore City',
      districtId: 1,
      tehsilId: 11,
    })

    const response = await request(app)
      .get('/api/pmc/license-by-user/?page=1&limit=20')
      .set('Authorization', `Bearer ${superToken}`)

    expect(response.status).toBe(200)
    expect(response.body.pagination.total).toBe(1)
    expect(response.body.data[0]).toMatchObject({
      license_number: 'LIC-101',
      business_name: 'Green Plastics',
      district_name: 'Lahore',
      tehsil_name: 'Model Town',
      city_name: 'Lahore City',
    })
  })

  it('hydrates inspection report list rows with district names in the aggregation', async () => {
    await InspectionReportModel.create({
      numericId: 501,
      inspectorId: 1,
      applicantId: 101,
      inspectionType: 'INITIAL',
      status: 'COMPLETED',
      actualDate: new Date('2026-02-10'),
      createdBy: 1,
      updatedBy: 1,
      businessName: 'Green Plastics',
      businessType: 'Producer',
      districtId: 1,
      inspectionDate: new Date('2026-02-10'),
    })

    const response = await request(app)
      .get('/api/pmc/inspection-report/?page=1&limit=20')
      .set('Authorization', `Bearer ${superToken}`)

    expect(response.status).toBe(200)
    expect(response.body.pagination.total).toBe(1)
    expect(response.body.data[0]).toMatchObject({
      id: 501,
      business_name: 'Green Plastics',
      district: 'Lahore',
    })
  })
})
