const path = require('path')
const request = require('supertest')

const {
  bootstrapTestApp,
  shutdownTestApp,
} = require('./helpers/testApp')

jest.setTimeout(180000)

describe('PMC verify chalan QR', () => {
  let app
  let QRCodeService

  beforeAll(async () => {
    app = await bootstrapTestApp()
    ;({ QRCodeService } = require(path.resolve(process.cwd(), 'server/dist/application/services/pmc/QRCodeService.js')))
  })

  afterAll(async () => {
    await shutdownTestApp()
  })

  it('verifies uploaded PNG QR codes end to end', async () => {
    const chalanNumber = 'CHALAN-12345'
    const applicantId = 'APP-789'
    const amount = 2500
    const qrDataUrl = await QRCodeService.generateChalanQRCode(chalanNumber, applicantId, amount)
    const qrImageBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64')

    const response = await request(app)
      .post('/api/pmc/verify-chalan/')
      .field('chalanNumber', chalanNumber)
      .attach('file', qrImageBuffer, {
        filename: 'verify-chalan.png',
        contentType: 'image/png',
      })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.chalanNumber).toBe(chalanNumber)
    expect(response.body.data.applicantId).toBe(applicantId)
    expect(response.body.data.amount).toBe(amount)
    expect(response.body.data.qrType).toBe('CHALAN')
  })
})
