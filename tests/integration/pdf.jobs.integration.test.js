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

describe('PMC PDF Jobs Integration', () => {
  let app
  let UserModel
  let ApplicantDetailModel
  let authToken
  let applicant

  const jwtSecret = 'test-jwt-secret-at-least-thirty-two-characters'

  beforeAll(async () => {
    app = await bootstrapTestApp()
    ;({ UserModel } = require('../../server/dist/infrastructure/database/models/accounts/User.js'))
    ;({ ApplicantDetailModel } = require('../../server/dist/infrastructure/database/models/pmc/ApplicantDetail.js'))
  })

  beforeEach(async () => {
    await resetDatabase()

    const user = await UserModel.create({
      username: 'pdf.user',
      passwordHash: await bcrypt.hash('PdfPass123', 10),
      groups: ['APPLICANT'],
      permissions: [],
      directPermissions: [],
      isActive: true,
    })

    applicant = await ApplicantDetailModel.create({
      firstName: 'Pdf',
      lastName: 'Applicant',
      cnic: '35202-1234567-1',
      email: 'pdf@applicant.test',
      trackingNumber: 'TRK-PDF-001',
      applicationStatus: 'Submitted',
    })

    authToken = jwt.sign({ userId: String(user._id), type: 'access' }, jwtSecret, { expiresIn: '1h' })
  })

  afterAll(async () => {
    await shutdownTestApp()
  })

  it('queues chalan PDFs and allows polling until the artifact is ready', async () => {
    const createResponse = await request(app)
      .post('/api/pmc/chalan-pdf/')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        applicantId: applicant.numericId,
        amountDue: 5000,
        dueDate: '2099-01-01',
      })

    expect(createResponse.status).toBe(202)
    expect(createResponse.body).toHaveProperty('jobId')
    expect(createResponse.body).toHaveProperty('pollUrl')
    expect(createResponse.body.data).toHaveProperty('chalanNumber')

    const jobId = createResponse.body.jobId

    let pollResponse = null
    for (let attempt = 0; attempt < 20; attempt += 1) {
      pollResponse = await request(app)
        .get(`/api/pmc/pdf/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)

      if (pollResponse.status === 200 && pollResponse.body.status === 'completed') {
        break
      }

      expect([200, 202]).toContain(pollResponse.status)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    expect(pollResponse).toBeTruthy()
    expect(pollResponse.status).toBe(200)
    expect(pollResponse.body.status).toBe('completed')
    expect(pollResponse.body.downloadUrl).toBe(`/api/pmc/pdf/${jobId}?download=1`)

    const downloadResponse = await request(app)
      .get(`/api/pmc/pdf/${jobId}?download=1`)
      .set('Authorization', `Bearer ${authToken}`)

    expect(downloadResponse.status).toBe(200)
    expect(downloadResponse.headers['content-type']).toMatch(/application\/pdf/)
    expect(downloadResponse.headers['content-disposition']).toContain('.pdf')
  })

  it('returns small receipt PDFs synchronously as a direct download fallback', async () => {
    const response = await request(app)
      .post('/api/pmc/receipt-pdf/')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        applicantId: applicant.numericId,
        amountPaid: 2500,
        paymentMethod: 'Cash',
      })

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toMatch(/application\/pdf/)
    expect(response.headers['content-disposition']).toContain('Receipt-')
  })
})
