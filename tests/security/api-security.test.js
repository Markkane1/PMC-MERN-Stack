const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(600000)

const TEST_JWT_SECRET = 'api-security-test-secret-123456789012345'
const DUMMY_OBJECT_ID = '507f1f77bcf86cd799439011'
const PASSWORD_HASH = '$2b$10$Et2im5s8dr6ICB8T3wN5cenUl.Ck6m1b.tY5jP6fwv0I7gA0wE6vm'
const OVERSIZED_20KB = 20 * 1024

let mongoServer
let app
let createApp
let connectDb
let signTokens
let UserModel
let userRepositoryMongo

let regularUser
let adminUser
let regularToken
let adminToken

let allRoutes = []
let jsonPostRoutes = []
let idParamRoutes = []
let requestCounter = 0

function nextIp() {
  requestCounter += 1
  const third = Math.floor(requestCounter / 250)
  const fourth = (requestCounter % 250) + 1
  return `10.50.${third}.${fourth}`
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
      if (!layer.route || typeof layer.route.path !== 'string') continue

      const middlewareNames = (layer.route.stack || []).map((routeLayer) => routeLayer.name)
      const methods = Object.keys(layer.route.methods || {}).filter((m) => layer.route.methods[m])
      const fullPath = normalizePath(`${prefix}${layer.route.path}`)

      for (const method of methods) {
        const upper = method.toUpperCase()
        discovered.set(`${upper} ${fullPath}`, {
          method: upper,
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

function walkFiles(dir, extensionRegex) {
  const files = []
  const stack = [dir]
  while (stack.length) {
    const current = stack.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(absolute)
      } else if (extensionRegex.test(entry.name)) {
        files.push(absolute)
      }
    }
  }
  return files
}

function findLineNumber(content, index) {
  return content.slice(0, index).split('\n').length
}

function containsSensitiveFields(value) {
  if (value == null) return false
  if (Array.isArray(value)) return value.some((item) => containsSensitiveFields(item))
  if (typeof value !== 'object') return false

  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = String(key).toLowerCase()
    if (normalizedKey === 'password' || normalizedKey === 'passwordhash' || normalizedKey === '__v') {
      return true
    }
    if (containsSensitiveFields(nested)) return true
  }
  return false
}

function assertNoErrorLeakage(payload) {
  const text = JSON.stringify(payload || {})
  expect(text).not.toMatch(/stack|\/server\/|node_modules|mongoservererror|casterror|bson|referenceerror|typeerror/i)
}

function collectOpenRedirectFindings() {
  const targets = [
    path.resolve(__dirname, '../../server/src'),
    path.resolve(__dirname, '../../client/src'),
  ]

  const findings = []
  const patterns = [
    /query\.redirect/g,
    /query\.returnTo/g,
    /query\.return_to/g,
    /req\.query\[['"`]redirect['"`]\]/g,
    /req\.query\[['"`]returnTo['"`]\]/g,
    /req\.query\[['"`]return_to['"`]\]/g,
    /[?&](redirect|returnTo|return_to)=/g,
  ]

  for (const root of targets) {
    const files = walkFiles(root, /\.(tsx?|jsx?)$/i)
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8')
      for (const pattern of patterns) {
        let match = pattern.exec(content)
        while (match) {
          findings.push({
            filePath,
            line: findLineNumber(content, match.index),
            token: match[0],
          })
          match = pattern.exec(content)
        }
      }
    }
  }

  return findings
}

describe('S5 Express & API Security', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()

    process.env.NODE_ENV = 'test'
    process.env.JWT_SECRET = TEST_JWT_SECRET
    process.env.JWT_REFRESH_SECRET = `${TEST_JWT_SECRET}-refresh`
    process.env.JWT_EXPIRES_IN = '1h'
    process.env.JWT_REFRESH_EXPIRES_IN = '7d'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    process.env.MONGO_URI = mongoServer.getUri()
    process.env.ENABLE_RATE_LIMITS_IN_TEST = 'true'
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
    ;({ userRepositoryMongo } = require('../../server/dist/infrastructure/database/repositories/accounts'))

    const { accountsRouter } = require('../../server/dist/interfaces/http/routes/accounts.routes')
    const { pmcRouter } = require('../../server/dist/interfaces/http/routes/pmc.routes')
    const { commonRouter } = require('../../server/dist/interfaces/http/routes/common.routes')
    const cacheRoutesModule = require('../../server/dist/interfaces/http/routes/cache.routes')
    const cacheRouter = cacheRoutesModule.default || cacheRoutesModule.cacheRouter || cacheRoutesModule

    allRoutes = discoverRoutes([
      { prefix: '/api/accounts', router: accountsRouter },
      { prefix: '/api/pmc', router: pmcRouter },
      { prefix: '/api', router: commonRouter },
      { prefix: '/api/cache', router: cacheRouter },
    ])

    jsonPostRoutes = allRoutes.filter((route) => {
      if (route.method !== 'POST') return false
      if (route.middlewareNames.includes('parseMultipart')) return false
      if (route.path.includes('/oauth/')) return false
      return true
    })

    idParamRoutes = allRoutes.filter((route) => route.path.includes('/:'))

    app = createApp()
    app.set('trust proxy', 1)

    await connectDb()

    regularUser = await UserModel.create({
      username: 'api.security.user@test.local',
      email: 'api.security.user@test.local',
      passwordHash: PASSWORD_HASH,
      groups: ['APPLICANT'],
      permissions: [],
      directPermissions: [],
      isActive: true,
      isSuperadmin: false,
    })

    adminUser = await UserModel.create({
      username: 'api.security.admin@test.local',
      email: 'api.security.admin@test.local',
      passwordHash: PASSWORD_HASH,
      groups: ['Super', 'Admin'],
      permissions: [],
      directPermissions: [],
      isActive: true,
      isSuperadmin: true,
    })

    regularToken = signTokens(String(regularUser._id)).access
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

  it('discovers routes needed for S5 checks', () => {
    expect(allRoutes.length).toBeGreaterThan(0)
    expect(jsonPostRoutes.length).toBeGreaterThan(0)
  })

  it('enforces helmet security headers (HSTS, CSP, nosniff, frame protection, no x-powered-by)', async () => {
    const res = await request(app)
      .get('/api/accounts/generate-captcha/')
      .set('X-Forwarded-For', nextIp())
      .set('X-Forwarded-Proto', 'https')

    expect(res.headers['strict-transport-security']).toBeDefined()
    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(['DENY', 'SAMEORIGIN']).toContain(String(res.headers['x-frame-options']).toUpperCase())
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('enforces strict CORS policy for disallowed origin and valid preflight for allowed origin', async () => {
    const evilOrigin = 'https://evil.com'
    const allowedOrigin = 'http://localhost:5173'

    const evilRes = await request(app)
      .get('/api/accounts/generate-captcha/')
      .set('X-Forwarded-For', nextIp())
      .set('Origin', evilOrigin)

    expect(evilRes.headers['access-control-allow-origin']).not.toBe('*')
    expect(evilRes.headers['access-control-allow-origin']).not.toBe(evilOrigin)

    const allowedPreflight = await request(app)
      .options('/api/accounts/login/')
      .set('X-Forwarded-For', nextIp())
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,authorization')

    expect([200, 204]).toContain(allowedPreflight.status)
    expect(allowedPreflight.headers['access-control-allow-origin']).toBe(allowedOrigin)

    const evilPreflight = await request(app)
      .options('/api/accounts/login/')
      .set('X-Forwarded-For', nextIp())
      .set('Origin', evilOrigin)
      .set('Access-Control-Request-Method', 'POST')

    expect(evilPreflight.headers['access-control-allow-origin']).not.toBe('*')
    expect(evilPreflight.headers['access-control-allow-origin']).not.toBe(evilOrigin)
  })

  it('applies auth route rate limiting and returns 429 with Retry-After before 15th attempt', async () => {
    const sameIp = '10.99.99.99'
    let first429Attempt = -1
    let retryAfterSeen = false

    for (let i = 1; i <= 15; i += 1) {
      const res = await request(app)
        .post('/api/accounts/login/')
        .set('X-Forwarded-For', sameIp)
        .set('Content-Type', 'application/json')
        .send({ username: 'non-existent-user', password: 'wrong-password' })

      if (res.status === 429 && first429Attempt === -1) {
        first429Attempt = i
      }
      if (res.status === 429 && res.headers['retry-after']) {
        retryAfterSeen = true
      }
    }

    expect(first429Attempt).toBeGreaterThan(0)
    expect(first429Attempt).toBeLessThan(15)
    expect(retryAfterSeen).toBe(true)
  })

  it('does not expose password/passwordHash/__v in user-returning GET responses', async () => {
    const profileRes = await request(app)
      .get('/api/accounts/profile/')
      .set('X-Forwarded-For', nextIp())
      .set('Authorization', `Bearer ${regularToken}`)

    expect(profileRes.status).toBe(200)
    expect(containsSensitiveFields(profileRes.body)).toBe(false)

    const adminUsersRes = await request(app)
      .get('/api/accounts/admin/users/')
      .set('X-Forwarded-For', nextIp())
      .set('Authorization', `Bearer ${adminToken}`)

    expect(adminUsersRes.status).toBe(200)
    expect(Array.isArray(adminUsersRes.body)).toBe(true)
    expect(containsSensitiveFields(adminUsersRes.body)).toBe(false)
  })

  it('rejects request bodies larger than 10kb across discovered JSON POST routes', async () => {
    const sampleFailures = []
    let failureCount = 0
    const oversizedBody = { probe: 'a'.repeat(OVERSIZED_20KB) }

    for (const route of jsonPostRoutes) {
      const pathValue = materializeRoutePath(route.path)
      const isAuthRoute = route.middlewareNames.includes('authenticate')
      const supportsUserToken = route.middlewareNames.includes('authenticateUserOrService')

      let req = request(app)
        .post(pathValue)
        .set('X-Forwarded-For', nextIp())
        .set('Content-Type', 'application/json')
        .send(oversizedBody)

      if (isAuthRoute || supportsUserToken) {
        req = req.set('Authorization', `Bearer ${regularToken}`)
      }

      const res = await req
      if (res.status !== 413) {
        failureCount += 1
        if (sampleFailures.length < 20) {
          sampleFailures.push(`POST ${pathValue} -> ${res.status}`)
        }
      }
    }

    if (failureCount > sampleFailures.length) {
      sampleFailures.push(`...and ${failureCount - sampleFailures.length} more`)
    }

    // SECURITY VULNERABILITY: POST bodies >10kb should be rejected with 413.
    expect(sampleFailures).toEqual([])
  })

  it('finds no open redirect via redirect/returnTo query parameters, or blocks external targets', async () => {
    const findings = collectOpenRedirectFindings()

    if (findings.length === 0) {
      expect(findings).toEqual([])
      return
    }

    const testedPaths = ['/api/accounts/login/', '/api/accounts/logout/']
    const payloads = [
      'https://evil.com',
      '//evil.com',
      '/dashboard',
    ]

    for (const endpoint of testedPaths) {
      for (const payload of payloads) {
        for (const queryKey of ['redirect', 'returnTo']) {
          const res = await request(app)
            .post(`${endpoint}?${queryKey}=${encodeURIComponent(payload)}`)
            .set('X-Forwarded-For', nextIp())
            .set('Content-Type', 'application/json')
            .send({ username: 'x', password: 'y' })

          const location = String(res.headers.location || '')
          if (payload.startsWith('/')) {
            expect(location.startsWith('https://evil.com')).toBe(false)
            expect(location.startsWith('//evil.com')).toBe(false)
          } else {
            expect(location).not.toContain('evil.com')
          }
        }
      }
    }
  })

  it.each([
    '/api/pmc/media/../../etc/passwd',
    '/api/pmc/media/..%2F..%2Fetc%2Fpasswd/',
    '/static/../../../etc/passwd',
  ])('blocks directory traversal payload: %s', async (attackPath) => {
    const res = await request(app).get(attackPath).set('X-Forwarded-For', nextIp())
    const text = typeof res.text === 'string' ? res.text : JSON.stringify(res.body || {})

    expect([400, 404]).toContain(res.status)
    expect(text.toLowerCase()).not.toContain('root:x:')
    expect(text.toLowerCase()).not.toContain('[extensions]')
  })

  it('returns generic error messages without stack/database details when server errors are triggered', async () => {
    const spy = jest.spyOn(userRepositoryMongo, 'listAll').mockRejectedValue(
      new Error('Mock DB crash: CastError at /server/src/application/usecases/accounts/AdminUseCases.ts')
    )

    const res = await request(app)
      .get('/api/accounts/admin/users/')
      .set('X-Forwarded-For', nextIp())
      .set('Authorization', `Bearer ${adminToken}`)

    spy.mockRestore()

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'An error occurred' })
    assertNoErrorLeakage(res.body)
  })

  it('keeps naturally-triggered 500 responses sanitized on malformed id routes', async () => {
    const failingRoutes = []

    for (const route of idParamRoutes) {
      if (!['GET', 'PATCH', 'DELETE'].includes(route.method)) continue

      const candidatePath = route.path.replace(/:([a-zA-Z0-9_]+)/g, 'not-an-id')
      let req = request(app)
        [route.method.toLowerCase()](normalizePath(candidatePath))
        .set('X-Forwarded-For', nextIp())

      if (route.middlewareNames.includes('authenticate')) {
        req = req.set('Authorization', `Bearer ${regularToken}`)
      }
      if (route.method === 'PATCH') {
        req = req.set('Content-Type', 'application/json').send({})
      }

      const res = await req
      if (res.status === 500) {
        assertNoErrorLeakage(res.body)
        if (res.body?.message !== 'An error occurred') {
          failingRoutes.push(`${route.method} ${candidatePath} leaked message`)
        }
      }
    }

    expect(failingRoutes).toEqual([])
  })
})
