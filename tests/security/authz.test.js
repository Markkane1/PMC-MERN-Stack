const path = require('path')
const { execSync } = require('child_process')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(300000)

const TEST_JWT_SECRET = 'authz-security-test-secret-123456789012345'
const DUMMY_OBJECT_ID = '507f1f77bcf86cd799439011'
const PASSWORD_HASH = '$2b$10$Et2im5s8dr6ICB8T3wN5cenUl.Ck6m1b.tY5jP6fwv0I7gA0wE6vm'

let mongoServer
let app
let createApp
let connectDb
let signTokens
let UserModel
let ApplicantDetailModel
let Competition
let CompetitionRegistrationModel

let regularUserA
let regularUserB
let adminUser
let tokenA
let tokenB
let adminToken
let competition

let allRoutes = []
let protectedRoutes = []
let adminRoutes = []
let requestCounter = 0

function nextIp() {
  requestCounter += 1
  const third = Math.floor(requestCounter / 250)
  const fourth = (requestCounter % 250) + 1
  return `10.30.${third}.${fourth}`
}

function normalizePath(value) {
  const collapsed = value.replace(/\/{2,}/g, '/')
  return collapsed.startsWith('/') ? collapsed : `/${collapsed}`
}

function materializeRoutePath(routePath) {
  return routePath.replace(/:([a-zA-Z0-9_]+)/g, DUMMY_OBJECT_ID)
}

function discoverRoutes(routersByPrefix) {
  const discovered = new Map()

  for (const { prefix, router } of routersByPrefix) {
    for (const layer of router.stack || []) {
      if (!layer.route || typeof layer.route.path !== 'string') {
        continue
      }

      const middlewareNames = (layer.route.stack || []).map((routeLayer) => routeLayer.name)
      const methods = Object.keys(layer.route.methods || {}).filter((method) => layer.route.methods[method])
      const fullPath = normalizePath(`${prefix}${layer.route.path}`)

      for (const method of methods) {
        const upperMethod = method.toUpperCase()
        const key = `${upperMethod} ${fullPath}`
        discovered.set(key, {
          method: upperMethod,
          path: fullPath,
          middlewareNames,
        })
      }
    }
  }

  return Array.from(discovered.values()).sort((a, b) => {
    if (a.path === b.path) return a.method.localeCompare(b.method)
    return a.path.localeCompare(b.path)
  })
}

async function executeRouteRequest(route, authHeaderValue) {
  const method = route.method.toLowerCase()
  const routePath = materializeRoutePath(route.path)
  let req = request(app)[method](routePath)
    .set('X-Forwarded-For', nextIp())
    .set('Content-Type', 'application/json')
    .timeout({ response: 5000, deadline: 8000 })

  if (typeof authHeaderValue === 'string') {
    req = req.set('Authorization', authHeaderValue)
  }

  if (['post', 'put', 'patch'].includes(method)) {
    req = req.send({})
  }

  return req
}

async function assert401ForAllProtectedRoutes(authHeaderValue, label) {
  const failures = []
  const batchSize = 25

  for (let i = 0; i < protectedRoutes.length; i += batchSize) {
    const batch = protectedRoutes.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (route) => {
        try {
          const res = await executeRouteRequest(route, authHeaderValue)
          if (res.status !== 401) {
            return `${route.method} ${materializeRoutePath(route.path)} -> ${res.status} (${label})`
          }
          return null
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return `${route.method} ${materializeRoutePath(route.path)} -> request error (${message})`
        }
      })
    )
    failures.push(...results.filter(Boolean))
  }

  // SECURITY VULNERABILITY: every protected route must reject missing/malformed auth with 401.
  expect(failures).toEqual([])
}

async function seedUserResource(username, trackingNumber) {
  const user = await UserModel.findOne({ username })
  return ApplicantDetailModel.create({
    firstName: username,
    lastName: 'Owner',
    cnic: `35202${Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0')}1`,
    mobileNo: `0300${Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, '0')}`,
    trackingNumber,
    createdBy: user._id,
    assignedGroup: 'APPLICANT',
  })
}

async function createCompetitionRegistrationForOwner(ownerLabel, suffix) {
  return CompetitionRegistrationModel.create({
    fullName: `${ownerLabel}-${suffix}`,
    institute: 'Security Test Institute',
    grade: '10',
    category: 'Security',
    competitionType: 'Poster',
    mobile: `0300${Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, '0')}`,
  })
}

describe('S3 Authentication & Authorization Security', () => {
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
    ;({ Competition } = require('../../server/dist/domain/models/Competition'))
    ;({
      CompetitionRegistrationModel,
    } = require('../../server/dist/infrastructure/database/models/pmc/CompetitionRegistration'))

    const { accountsRouter } = require('../../server/dist/interfaces/http/routes/accounts.routes')
    const { pmcRouter } = require('../../server/dist/interfaces/http/routes/pmc.routes')
    const { commonRouter } = require('../../server/dist/interfaces/http/routes/common.routes')

    allRoutes = discoverRoutes([
      { prefix: '/api/accounts', router: accountsRouter },
      { prefix: '/api/pmc', router: pmcRouter },
      { prefix: '/api', router: commonRouter },
    ])

    protectedRoutes = allRoutes.filter((route) => route.middlewareNames.includes('authenticate'))
    adminRoutes = protectedRoutes.filter(
      (route) =>
        route.path.includes('/admin/') &&
        ['GET', 'POST', 'DELETE'].includes(route.method)
    )

    app = createApp()
    app.set('trust proxy', 1)

    await connectDb()

    regularUserA = await UserModel.create({
      username: 'regular.user.a@test.local',
      email: 'regular.user.a@test.local',
      passwordHash: PASSWORD_HASH,
      groups: ['APPLICANT'],
      permissions: [
        'pmc.view_competitionregistration',
        'pmc.change_competitionregistration',
        'pmc.delete_competitionregistration',
      ],
      directPermissions: [],
      isActive: true,
      isSuperadmin: false,
    })

    regularUserB = await UserModel.create({
      username: 'regular.user.b@test.local',
      email: 'regular.user.b@test.local',
      passwordHash: PASSWORD_HASH,
      groups: ['APPLICANT'],
      permissions: [
        'pmc.view_competitionregistration',
        'pmc.change_competitionregistration',
        'pmc.delete_competitionregistration',
      ],
      directPermissions: [],
      isActive: true,
      isSuperadmin: false,
    })

    adminUser = await UserModel.create({
      username: 'admin.user@test.local',
      email: 'admin.user@test.local',
      passwordHash: PASSWORD_HASH,
      groups: ['Super', 'Admin'],
      permissions: ['pmc.manage_alerts', 'pmc.manage_fields'],
      directPermissions: [],
      isActive: true,
      isSuperadmin: true,
    })

    await seedUserResource(regularUserA.username, 'TRACK-AUTHZ-A')
    await seedUserResource(regularUserB.username, 'TRACK-AUTHZ-B')
    await seedUserResource(adminUser.username, 'TRACK-AUTHZ-ADMIN')

    competition = await Competition.create({
      title: 'AuthZ Security Competition',
      description: 'Competition used for authorization tests',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      maxParticipants: 100,
      enrolledCount: 0,
      category: 'SECURITY',
      rules: 'Test rules',
      prizePool: 0,
      prizes: [],
      status: 'OPEN',
      createdBy: String(adminUser._id),
    })

    await createCompetitionRegistrationForOwner('owner-a', 'seed-a')
    await createCompetitionRegistrationForOwner('owner-b', 'seed-b')

    tokenA = signTokens(String(regularUserA._id)).access
    tokenB = signTokens(String(regularUserB._id)).access
    adminToken = signTokens(String(adminUser._id)).access
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

  it('discovers protected routes from runtime routing metadata', () => {
    expect(protectedRoutes.length).toBeGreaterThan(0)
    expect(adminRoutes.length).toBeGreaterThan(0)
  })

  describe('Unauthenticated Access', () => {
    it('returns 401 for every protected route with no Authorization header', async () => {
      await assert401ForAllProtectedRoutes(null, 'missing auth header')
    })

    it('returns 401 for every protected route with empty bearer token', async () => {
      await assert401ForAllProtectedRoutes('Bearer ', 'empty bearer token')
    })

    it('returns 401 for every protected route with Bearer null', async () => {
      await assert401ForAllProtectedRoutes('Bearer null', 'null token')
    })

    it('returns 401 for every protected route with Bearer undefined', async () => {
      await assert401ForAllProtectedRoutes('Bearer undefined', 'undefined token')
    })
  })

  describe('IDOR Horizontal Privilege Escalation', () => {
    it('prevents user B from reading user A competition registration by id', async () => {
      const registrationA = await createCompetitionRegistrationForOwner('owner-a', 'idor-read')

      const res = await request(app)
        .get(`/api/pmc/competition/register/${registrationA._id}/`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Forwarded-For', nextIp())

      // SECURITY VULNERABILITY: cross-tenant resource read should never return 200.
      expect([403, 404]).toContain(res.status)
    })

    it('prevents user B from updating user A competition registration by id', async () => {
      const registrationA = await createCompetitionRegistrationForOwner('owner-a', 'idor-update')

      const res = await request(app)
        .patch(`/api/pmc/competition/register/${registrationA._id}/`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Forwarded-For', nextIp())
        .set('Content-Type', 'application/json')
        .send({ status: 'DISQUALIFIED' })

      // SECURITY VULNERABILITY: cross-tenant resource update should be blocked.
      expect([403, 404]).toContain(res.status)
    })

    it('prevents user B from deleting user A competition registration by id', async () => {
      const registrationA = await createCompetitionRegistrationForOwner('owner-a', 'idor-delete')

      const res = await request(app)
        .delete(`/api/pmc/competition/register/${registrationA._id}/`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('X-Forwarded-For', nextIp())

      // SECURITY VULNERABILITY: cross-tenant delete should be rejected.
      expect([403, 404]).toContain(res.status)
    })
  })

  describe('Vertical Privilege Escalation', () => {
    it('blocks regular user access to every discovered admin GET/POST/DELETE route', async () => {
      const failures = []

      for (const route of adminRoutes) {
        const method = route.method.toLowerCase()
        let req = request(app)[method](materializeRoutePath(route.path))
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Forwarded-For', nextIp())
          .set('Content-Type', 'application/json')

        if (route.method === 'POST') {
          req = req.send({})
        }

        const res = await req
        if (res.status !== 403) {
          failures.push(`${route.method} ${materializeRoutePath(route.path)} -> ${res.status}`)
        }
      }

      // SECURITY VULNERABILITY: non-admin users must never access admin routes.
      expect(failures).toEqual([])
    })
  })

  describe('Role Tampering via Request Body', () => {
    const roleTamperPayloads = [
      { role: 'admin' },
      { isAdmin: true },
      JSON.parse('{"__proto__":{"isAdmin":true}}'),
    ]

    it.each(roleTamperPayloads)(
      'ignores tampered role fields during registration: %p',
      async (tamperPayload) => {
        const username = `tamper.reg.${Date.now()}.${Math.floor(Math.random() * 10000)}`
        const body = {
          username,
          password: 'TestPass123!',
          first_name: 'Role',
          last_name: 'Tamper',
          ...tamperPayload,
        }

        const res = await request(app)
          .post('/api/accounts/register/')
          .set('X-Forwarded-For', nextIp())
          .set('Content-Type', 'application/json')
          .send(body)

        expect([201, 400]).toContain(res.status)

        const created = await UserModel.findOne({ username }).lean()
        if (created) {
          expect(created.isSuperadmin).toBe(false)
          expect(created.groups || []).toEqual(['APPLICANT'])
        }
      }
    )

    it.each(roleTamperPayloads)(
      'ignores tampered role fields during profile update: %p',
      async (tamperPayload) => {
        const before = await UserModel.findById(regularUserA._id).lean()

        const res = await request(app)
          .patch('/api/accounts/profile/')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Forwarded-For', nextIp())
          .set('Content-Type', 'application/json')
          .send({
            first_name: 'Regular',
            last_name: 'UserA',
            ...tamperPayload,
          })

        expect(res.status).toBe(200)

        const after = await UserModel.findById(regularUserA._id).lean()
        expect(after.isSuperadmin).toBe(false)
        expect(after.groups || []).toEqual(before.groups || [])
      }
    )
  })

  describe('Broken Function-Level Authorization', () => {
    it('rejects unauthenticated access on sensitive routes and verifies they are protected', async () => {
      const sensitive = [
        { method: 'GET', path: '/api/accounts/admin/users/' },
        { method: 'GET', path: '/api/search/query' },
        { method: 'GET', path: '/api/pmc/payment-summary' },
      ]

      for (const route of sensitive) {
        const found = protectedRoutes.find(
          (item) => item.method === route.method && item.path === route.path
        )
        expect(found).toBeDefined()

        const res = await request(app)
          [route.method.toLowerCase()](route.path)
          .set('X-Forwarded-For', nextIp())

        expect(res.status).toBe(401)
      }
    })
  })

  describe('Password Reset Flaws', () => {
    it('does not expose token-based password reset routes in this build', () => {
      const tokenResetRoutes = allRoutes.filter((route) =>
        /(reset.*token|token.*reset|password-reset\/confirm|reset\/confirm)/i.test(route.path)
      )
      expect(tokenResetRoutes).toEqual([])
    })

    it('prevents resetting another user password by manipulating username in forgot-password flow', async () => {
      const applicantA = await ApplicantDetailModel.findOne({ trackingNumber: 'TRACK-AUTHZ-A' }).lean()
      const beforeB = await UserModel.findById(regularUserB._id).lean()

      const res = await request(app)
        .post('/api/accounts/reset-forgot-password/')
        .set('X-Forwarded-For', nextIp())
        .set('Content-Type', 'application/json')
        .send({
          tracking_number: applicantA.trackingNumber,
          mobile_number: applicantA.mobileNo,
          cnic: applicantA.cnic,
          username: regularUserB.username,
          new_password: 'NewPass123!',
        })

      expect([400, 404]).toContain(res.status)

      const afterB = await UserModel.findById(regularUserB._id).lean()
      expect(afterB.passwordHash).toBe(beforeB.passwordHash)
    })
  })
})
