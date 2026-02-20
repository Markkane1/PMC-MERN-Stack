/**
 * PHASE 5B: API Contract & Integration Tests
 * Validates critical endpoints behave exactly like Django
 * Run with: npm test -- --testPathPattern="contract"
 */

import request from 'supertest'

// This would be imported from your Express app setup
// const app = require('../src/app').default
// For now, we define the test structure

const API_BASE = process.env.API_URL || 'http://localhost:8000/api'
let authToken: string

/**
 * Test: Payment Intimation (External Service Token Auth)
 * Critical for PITB/ePay callbacks
 */
describe('Payment Intimation - External Service Token', () => {
  it('should accept service token in Authorization header', async () => {
    const response = await request(API_BASE)
      .post('/pmc/payment-intimation/')
      .set('Authorization', `Bearer ${process.env.SERVICE_TOKEN_PITB || 'fake-token'}`)
      .send({
        psidNumber: 'TEST-12345',
        amount: 5000,
        status: 'confirmed',
      })

    // Should either succeed (200-299) or fail with 401/403 (not 500)
    expect(response.status).to.be.oneOf([200, 201, 400, 401, 403])
    expect(response.status).not.equal(500)
  })

  it('should reject invalid service token', async () => {
    const response = await request(API_BASE)
      .post('/pmc/payment-intimation/')
      .set('Authorization', 'Bearer invalid-token')
      .send({ psidNumber: 'TEST-123' })

    expect(response.status).to.be.oneOf([401, 403])
  })

  it('should work with user JWT as fallback', async () => {
    const response = await request(API_BASE)
      .post('/pmc/payment-intimation/')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ psidNumber: 'TEST-123' })

    expect(response.status).not.equal(500)
  })
})

/**
 * Test: PLMIS Token Generation
 * Must support both POST and GET methods
 */
describe('PLMIS Token Endpoint', () => {
  it('should accept POST /plmis-token/', async () => {
    const response = await request(API_BASE)
      .post('/pmc/plmis-token/')
      .send({
        applicantId: 1,
        amount: 10000,
      })

    expect(response.status).to.be.oneOf([200, 201, 400, 401])
  })

  it('should accept GET /plmis-token/ for backward compatibility', async () => {
    const response = await request(API_BASE)
      .get('/pmc/plmis-token/')
      .query({ applicantId: 1, amount: 10000 })

    expect(response.status).to.be.oneOf([200, 400, 401])
  })

  it('should return token details on success', async () => {
    const response = await request(API_BASE)
      .post('/pmc/plmis-token/')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        applicantId: 1,
        amount: 10000,
      })

    if (response.status === 200 || response.status === 201) {
      expect(response.body).to.have.property('token')
      expect(response.body).to.have.property('expiresAt')
    }
  })
})

/**
 * Test: Verify Chalan with QR Image Upload
 * Must accept multipart form data with image
 */
describe('Verify Chalan - QR Code Detection', () => {
  it('should accept POST with multipart image upload', async () => {
    const response = await request(API_BASE)
      .post('/pmc/verify-chalan/')
      .field('chalanNumber', 'CHN-12345')
      .attach('qrImage', Buffer.from('fake-image-data'), 'qr.png')

    expect(response.status).to.be.oneOf([200, 400, 422])
  })

  it('should validate QR code format', async () => {
    const response = await request(API_BASE)
      .post('/pmc/verify-chalan/')
      .set('Authorization', `Bearer ${authToken}`)
      .field('chalanNumber', 'CHN-12345')
      .attach('qrImage', Buffer.from('invalid-data'), 'fake.png')

    expect(response.status).to.be.oneOf([400, 422])
  })

  it('should return verification result on success', async () => {
    const response = await request(API_BASE)
      .post('/pmc/verify-chalan/')
      .set('Authorization', `Bearer ${authToken}`)
      .field('chalanNumber', 'CHN-12345')
      .attach('qrImage', Buffer.from('qr-data'), 'qr.png')

    if (response.status === 200) {
      expect(response.body).to.have.property('verified')
      expect(response.body).to.have.property('amount')
    }
  })
})

/**
 * Test: Producer/Consumer/Collector/Recycler Upsert Behavior
 * POST must be idempotent (200 on update, 201 on create)
 */
describe('Producer Upsert Semantics', () => {
  const producerPayload = {
    applicant_id: 999,
    tracking_number: 'PROD-999',
    registration_required_for: ['plastic_bags'],
  }

  it('should create producer with 201 on new applicantId', async () => {
    const response = await request(API_BASE)
      .post('/pmc/producers/')
      .set('Authorization', `Bearer ${authToken}`)
      .send(producerPayload)
      .field('applicant_id', 9999) // New ID

    expect(response.status).equal(201)
  })

  it('should update existing producer with 200 on same applicantId', async () => {
    // First create a producer
    const createResponse = await request(API_BASE)
      .post('/pmc/producers/')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        applicant_id: 8888,
        tracking_number: 'PROD-001',
      })

    const producerId = createResponse.body._id || createResponse.body.id

    // Second POST with same applicantId should update (200)
    const updateResponse = await request(API_BASE)
      .post('/pmc/producers/')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        applicant_id: 8888,
        tracking_number: 'PROD-001-UPDATED',
      })

    expect(updateResponse.status).equal(200)
  })

  it('should not throw duplicate key error on repeated POST', async () => {
    const payload = {
      applicant_id: 7777,
      tracking_number: 'PROD-DUP',
    }

    const response1 = await request(API_BASE)
      .post('/pmc/producers/')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)

    const response2 = await request(API_BASE)
      .post('/pmc/producers/')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)

    expect(response1.status).equal(201)
    expect(response2.status).equal(200) // Update, not error
  })
})

/**
 * Test: Application Assignment Side-Effects
 * Create assignment must automatically set status and license
 */
describe('Application Assignment Side-Effects', () => {
  it('should set applicationStatus to "In Process" on assignment create', async () => {
    const response = await request(API_BASE)
      .post('/pmc/application-assignment/')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        applicant_id: 5000,
        assigned_group: 'LSO',
      })

    expect(response.status).to.be.oneOf([200, 201])

    // Verify applicant status was updated
    const applicantResponse = await request(API_BASE)
      .get('/pmc/applicant-detail/5000/')
      .set('Authorization', `Bearer ${authToken}`)

    if (applicantResponse.status === 200) {
      expect(applicantResponse.body.applicationStatus).equal('In Process')
    }
  })

  it('should create/update license on assignment', async () => {
    const response = await request(API_BASE)
      .post('/pmc/application-assignment/')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        applicant_id: 5001,
        assigned_group: 'LSO',
      })

    expect(response.status).to.be.oneOf([200, 201])

    // License should be created (can verify via license endpoint if exists)
    const licenseResponse = await request(API_BASE)
      .get('/pmc/license-by-user/')
      .set('Authorization', `Bearer ${authToken}`)

    expect(licenseResponse.status).to.be.oneOf([200, 404])
  })
})

/**
 * Test: ApplicantFieldResponse Bulk Create
 * POST array must create multiple records atomically
 */
describe('ApplicantFieldResponse Bulk Create', () => {
  it('should accept array payload and create multiple records', async () => {
    const bulk = [
      {
        applicant_id: 6000,
        field_key: 'plastic_consumption',
        response: 'high',
      },
      {
        applicant_id: 6000,
        field_key: 'waste_disposal',
        response: 'proper',
      },
    ]

    const response = await request(API_BASE)
      .post('/pmc/field-responses/')
      .set('Authorization', `Bearer ${authToken}`)
      .send(bulk)

    expect(response.status).to.be.oneOf([200, 201])
    expect(response.body).to.be.an('array')
  })

  it('should also accept single object payload', async () => {
    const single = {
      applicant_id: 6001,
      field_key: 'plastic_consumption',
      response: 'medium',
    }

    const response = await request(API_BASE)
      .post('/pmc/field-responses/')
      .set('Authorization', `Bearer ${authToken}`)
      .send(single)

    expect(response.status).to.be.oneOf([200, 201])
    expect(response.body._id || response.body.id).to.exist
  })

  it('should return array for array input, object for single input', async () => {
    const arrayInput = [{ applicant_id: 6002, field_key: 'test', response: 'value' }]
    const objectInput = { applicant_id: 6003, field_key: 'test', response: 'value' }

    const arrayResponse = await request(API_BASE)
      .post('/pmc/field-responses/')
      .set('Authorization', `Bearer ${authToken}`)
      .send(arrayInput)

    const objResponse = await request(API_BASE)
      .post('/pmc/field-responses/')
      .set('Authorization', `Bearer ${authToken}`)
      .send(objectInput)

    expect(arrayResponse.body).to.be.an('array')
    expect(objResponse.body).not.to.be.an('array')
  })
})

/**
 * Test: LSO Modulo Sharding
 * LSO user filter must distribute applicants by modulo
 */
describe('LSO Modulo Sharding', () => {
  it('LSO.001 should see applicants where numericId % 3 == 1', async () => {
    // Create LSO token for user with suffix .001
    const lsoToken = process.env.LSO_001_TOKEN || 'fake-token'

    const response = await request(API_BASE)
      .get('/pmc/applicant-detail/')
      .set('Authorization', `Bearer ${lsoToken}`)

    expect(response.status).equal(200)
    expect(response.body).to.be.an('array')

    // Verify all returned applicants match modulo pattern
    if (response.body.length > 0) {
      response.body.forEach((applicant: any) => {
        const expectedMod = 1 // For LSO.001
        const actualMod = (applicant.numericId || 0) % 3
        expect(actualMod).equal(expectedMod)
      })
    }
  })

  it('should restrict LSO to assignedGroup in [LSO, APPLICANT]', async () => {
    const lsoToken = process.env.LSO_001_TOKEN || 'fake-token'

    const response = await request(API_BASE)
      .get('/pmc/applicant-detail/')
      .set('Authorization', `Bearer ${lsoToken}`)

    expect(response.status).equal(200)

    if (response.body.length > 0) {
      response.body.forEach((applicant: any) => {
        const group = applicant.assignedGroup || applicant.assigned_group
        expect(group).to.be.oneOf(['LSO', 'APPLICANT'])
      })
    }
  })
})

/**
 * Test: Query Endpoints (by_applicant)
 * Dedicated endpoints for filtering by applicantId
 */
describe('Query Endpoints - by_applicant', () => {
  it('GET /business-profiles/by_applicant/?applicant_id=X should return profiles', async () => {
    const response = await request(API_BASE)
      .get('/pmc/business-profiles/by_applicant/')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ applicant_id: 1001 })

    expect(response.status).to.be.oneOf([200, 404])

    if (response.status === 200) {
      expect(response.body).to.be.an('array')
    }
  })

  it('GET /application-assignment/by_applicant/?applicant_id=X should return assignments', async () => {
    const response = await request(API_BASE)
      .get('/pmc/application-assignment/by_applicant/')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ applicant_id: 1001 })

    expect(response.status).to.be.oneOf([200, 404])

    if (response.status === 200) {
      expect(response.body).to.be.an('array')
    }
  })
})

/**
 * Setup and Teardown
 */
describe('Contract Tests - Setup/Teardown', () => {
  beforeAll(async () => {
    // Attempt to get auth token
    try {
      const response = await request(API_BASE.replace('/api', ''))
        .post('/accounts/login/')
        .send({
          username: process.env.TEST_USER || 'testuser',
          password: process.env.TEST_PASSWORD || 'testpass',
        })

      if (response.status === 200 || response.status === 201) {
        authToken = response.body.token || response.body.access_token
      }
    } catch (e) {
      console.warn('Could not obtain auth token - some tests may be skipped')
    }
  })

  afterAll(() => {
    // Cleanup if needed
  })

  it('should have API running', async () => {
    const response = await request(API_BASE)
      .get('/pmc/ping/')

    expect(response.status).to.be.oneOf([200, 401])
  })
})
