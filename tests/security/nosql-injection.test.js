const path = require('path')
const { execSync } = require('child_process')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(300000)

const TEST_JWT_SECRET = 'nosql-security-test-secret-123456789012345'

const OPERATOR_PAYLOADS = [
  { $gt: '' },
  { $ne: null },
  { $in: [''] },
  { $where: 'sleep(5000)' },
  { $regex: '.*' },
]

let mongoServer
let app
let createApp
let connectDb
let signTokens
let UserModel
let ApplicantDetailModel
let BusinessProfileModel
let Competition
let applicantRepositoryMongo
let seededUser
let seededAdmin
let authToken
let adminToken

let requestCounter = 0

function nextIp() {
  requestCounter += 1
  const third = Math.floor(requestCounter / 250)
  const fourth = (requestCounter % 250) + 1
  return `10.20.${third}.${fourth}`
}

function withIp(req) {
  return req.set('X-Forwarded-For', nextIp())
}

function hasOperatorKeys(value) {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((item) => hasOperatorKeys(item))

  for (const [key, nested] of Object.entries(value)) {
    if (key.includes('$') || key.includes('.')) return true
    if (hasOperatorKeys(nested)) return true
  }
  return false
}

function responseContainsSeededData(payload) {
  const text = JSON.stringify(payload || {})
  return text.includes('TRK-100') || text.includes('Safe Plastics') || text.includes('nosql.seed.user')
}

function assertNoInternalErrorDetails(res) {
  const text = JSON.stringify(res.body || {})
  expect(text).not.toMatch(/CastError|MongoServerError|BSON|stack|\/server\/|node_modules/i)
}

describe('S2 MongoDB Injection Security', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()

    process.env.NODE_ENV = 'test'
    process.env.JWT_SECRET = TEST_JWT_SECRET
    process.env.JWT_REFRESH_SECRET = `${TEST_JWT_SECRET}-refresh`
    process.env.JWT_EXPIRES_IN = '1h'
    process.env.JWT_REFRESH_EXPIRES_IN = '7d'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    process.env.MONGO_URI = mongoServer.getUri()
    process.env.ALLOW_LEGACY_MASTERKEY_LOGIN = 'false'

    execSync('npm run build --prefix server', {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'pipe',
    })

    jest.resetModules()

    ;({ createApp } = require('../../server/dist/app'))
    ;({ connectDb } = require('../../server/dist/infrastructure/config/db'))
    ;({ signTokens } = require('../../server/dist/application/services/accounts/AuthService'))
    ;({ UserModel } = require('../../server/dist/infrastructure/database/models/accounts/User'))
    ;({
      ApplicantDetailModel,
    } = require('../../server/dist/infrastructure/database/models/pmc/ApplicantDetail'))
    ;({
      BusinessProfileModel,
    } = require('../../server/dist/infrastructure/database/models/pmc/BusinessProfile'))
    ;({ Competition } = require('../../server/dist/domain/models/Competition'))
    ;({
      applicantRepositoryMongo,
    } = require('../../server/dist/infrastructure/database/repositories/pmc'))

    app = createApp()
    app.set('trust proxy', 1)

    await connectDb()
    const passwordHash = '$2b$10$Et2im5s8dr6ICB8T3wN5cenUl.Ck6m1b.tY5jP6fwv0I7gA0wE6vm'

    seededUser = await UserModel.create({
      username: 'nosql.seed.user',
      email: 'nosql.seed.user@test.local',
      passwordHash,
      groups: ['APPLICANT'],
      permissions: [],
      directPermissions: [],
      isActive: true,
      isSuperadmin: false,
    })

    seededAdmin = await UserModel.create({
      username: 'admin@test.com',
      email: 'admin@test.com',
      passwordHash,
      groups: ['Super', 'Admin'],
      permissions: [],
      directPermissions: [],
      isActive: true,
      isSuperadmin: true,
    })

    const applicant = await ApplicantDetailModel.create({
      firstName: 'NoSql',
      lastName: 'Tester',
      cnic: '3520212345671',
      mobileNo: '03001234567',
      trackingNumber: 'TRK-100',
      createdBy: seededUser._id,
      assignedGroup: 'APPLICANT',
    })

    await BusinessProfileModel.create({
      applicantId: applicant.numericId,
      businessName: 'Safe Plastics',
      entityType: 'INDIVIDUAL',
      status: 'ACTIVE',
      isActive: true,
      createdBy: seededUser._id,
    })

    await Competition.create({
      title: 'Security Test Competition',
      description: 'Competition for NoSQL security tests',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      maxParticipants: 10,
      enrolledCount: 0,
      category: 'TEST',
      rules: 'Test rules',
      prizePool: 0,
      prizes: [],
      status: 'OPEN',
      createdBy: String(seededAdmin._id),
    })

    authToken = signTokens(String(seededUser._id)).access
    adminToken = signTokens(String(seededAdmin._id)).access
  })

  afterAll(async () => {
    if (UserModel?.db) {
      await UserModel.db.dropDatabase()
      await UserModel.db.close()
    }
    if (mongoServer) {
      await mongoServer.stop()
    }
  })

  it('verifies express-mongo-sanitize strips $ and . operator keys from request bodies', async () => {
    const spy = jest.spyOn(applicantRepositoryMongo, 'findOneWithCreator')

    const res = await withIp(
      request(app)
        .post('/api/accounts/find-user/')
        .set('Content-Type', 'application/json')
        .send({
          tracking_number: { $gt: '' },
          mobile_number: '03001234567',
          cnic: '3520212345671',
        })
    )

    expect(spy).toHaveBeenCalled()
    const firstCallFilter = spy.mock.calls[0][0]
    expect(hasOperatorKeys(firstCallFilter)).toBe(false)
    expect([400, 404]).toContain(res.status)

    spy.mockRestore()
  })

  it.each(OPERATOR_PAYLOADS)(
    'blocks operator injection in auth and lookup bodies for payload %p',
    async (operatorPayload) => {
      const loginRes = await withIp(
        request(app)
          .post('/api/accounts/login/')
          .set('Content-Type', 'application/json')
          .send({
            username: operatorPayload,
            password: operatorPayload,
          })
      )

      expect(loginRes.status).not.toBe(200)
      expect(loginRes.status).not.toBe(500)
      expect(loginRes.body).not.toHaveProperty('access')

      const findUserRes = await withIp(
        request(app)
          .post('/api/accounts/find-user/')
          .set('Content-Type', 'application/json')
          .send({
            tracking_number: operatorPayload,
            mobile_number: '03001234567',
            cnic: '3520212345671',
          })
      )

      expect(findUserRes.status).not.toBe(200)
      expect(findUserRes.status).not.toBe(500)
      assertNoInternalErrorDetails(findUserRes)

      const resetForgotRes = await withIp(
        request(app)
          .post('/api/accounts/reset-forgot-password/')
          .set('Content-Type', 'application/json')
          .send({
            tracking_number: operatorPayload,
            mobile_number: '03001234567',
            cnic: '3520212345671',
            username: 'nosql.seed.user',
            new_password: 'ResetPass123!',
          })
      )

      expect(resetForgotRes.status).not.toBe(200)
      expect(resetForgotRes.status).not.toBe(500)
      assertNoInternalErrorDetails(resetForgotRes)
    }
  )

  it.each(OPERATOR_PAYLOADS)(
    'blocks operator injection in query params for payload %p',
    async (operatorPayload) => {
      const res = await withIp(
        request(app)
          .get('/api/search/query')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ query: operatorPayload })
      )

      expect([200, 400]).toContain(res.status)
      expect(res.status).not.toBe(500)
      expect(responseContainsSeededData(res.body)).toBe(false)
    }
  )

  it.each(OPERATOR_PAYLOADS)(
    'blocks operator injection in URL params for payload %p',
    async (operatorPayload) => {
      const injectedId = encodeURIComponent(JSON.stringify(operatorPayload))
      const res = await withIp(request(app).get(`/api/pmc/competition/${injectedId}`))

      expect(res.status).toBe(400)
      assertNoInternalErrorDetails(res)
    }
  )

  it.each([
    {
      title: 'rejects login bypass payload with operator objects for both username and password',
      body: { username: { $gt: '' }, password: { $gt: '' } },
    },
    {
      title: 'rejects login bypass payload using $ne operator on password',
      body: { username: 'admin@test.com', password: { $ne: 'wrongpassword' } },
    },
  ])('$title', async ({ body }) => {
    const res = await withIp(
      request(app).post('/api/accounts/login/').set('Content-Type', 'application/json').send(body)
    )

    expect(res.status).toBe(401)
    expect(res.body).not.toHaveProperty('access')
    expect(res.body).not.toHaveProperty('refresh')
  })

  it('handles regex-heavy input without hanging (ReDoS check: < 2 seconds)', async () => {
    const payload = `${'a'.repeat(10000)}!`
    const start = Date.now()

    const res = await withIp(
      request(app)
        .get('/api/search/query')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ query: payload })
    )

    const elapsedMs = Date.now() - start

    expect(elapsedMs).toBeLessThanOrEqual(2000)
    expect([200, 400]).toContain(res.status)
    expect(res.status).not.toBe(500)
  })

  describe('ObjectId injection and malformed id handling', () => {
    const invalidIds = [
      { name: 'non-ObjectId string', value: 'not-an-id' },
      { name: 'oversized string', value: 'a'.repeat(1000) },
      { name: 'operator object via encoded path', value: encodeURIComponent('{"$gt":""}') },
    ]

    const endpoints = [
      {
        method: 'get',
        route: '/api/pmc/competition/:id',
        auth: null,
      },
      {
        method: 'get',
        route: '/api/pmc/competition/register/:id/',
        auth: 'admin',
      },
      {
        method: 'get',
        route: '/api/pmc/applicant-documents/:id/',
        auth: 'admin',
      },
      {
        method: 'patch',
        route: '/api/accounts/admin/groups/:id/',
        auth: 'admin',
        body: {},
      },
      {
        method: 'patch',
        route: '/api/accounts/admin/users/:id/',
        auth: 'admin',
        body: {},
      },
    ]

    it.each(endpoints)('returns 400 and safe error for $route', async (endpoint) => {
      for (const invalidId of invalidIds) {
        const resolvedPath = endpoint.route.replace(':id', invalidId.value)
        let req = withIp(request(app)[endpoint.method](resolvedPath)).set(
          'Content-Type',
          'application/json'
        )

        if (endpoint.auth === 'admin') {
          req = req.set('Authorization', `Bearer ${adminToken}`)
        }

        if (endpoint.body) {
          req = req.send(endpoint.body)
        }

        const res = await req
        expect(res.status).toBe(400)
        assertNoInternalErrorDetails(res)
      }
    })
  })
})
