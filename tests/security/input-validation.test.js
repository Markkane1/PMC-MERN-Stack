const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(600000)

const TEST_JWT_SECRET = 'input-security-test-secret-123456789012345'
const DUMMY_OBJECT_ID = '507f1f77bcf86cd799439011'
const PASSWORD_HASH = '$2b$10$Et2im5s8dr6ICB8T3wN5cenUl.Ck6m1b.tY5jP6fwv0I7gA0wE6vm'
const TEN_MB = 10 * 1024 * 1024

const XSS_PAYLOADS = [
  "<script>alert('xss')</script>",
  "<img src=x onerror=alert('xss')>",
  "javascript:alert('xss')",
  '<svg onload=alert("xss")>',
  `"><script>alert('xss')</script>`,
]

let mongoServer
let app
let createApp
let connectDb
let signTokens
let UserModel
let accountsRouter
let pmcRouter
let commonRouter
let authToken
let allRoutes = []
let jsonPostPutRoutes = []
let requestCounter = 0

function nextIp() {
  requestCounter += 1
  const third = Math.floor(requestCounter / 250)
  const fourth = (requestCounter % 250) + 1
  return `10.40.${third}.${fourth}`
}

function normalizePath(value) {
  const collapsed = value.replace(/\/{2,}/g, '/')
  return collapsed.startsWith('/') ? collapsed : `/${collapsed}`
}

function materializeRoutePath(routePath) {
  return routePath.replace(/:([a-zA-Z0-9_]+)/g, DUMMY_OBJECT_ID)
}

function walkFiles(dir, extensionRegex) {
  const results = []
  const stack = [dir]
  while (stack.length) {
    const current = stack.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(absolute)
      } else if (extensionRegex.test(entry.name)) {
        results.push(absolute)
      }
    }
  }
  return results
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

function containsRawScriptTag(value) {
  return JSON.stringify(value || {}).toLowerCase().includes('<script>')
}

function getDangerouslySetInnerHTMLFindings() {
  const clientRoot = path.resolve(__dirname, '../../client/src')
  const files = walkFiles(clientRoot, /\.(tsx?|jsx?)$/i)
  const findings = []

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8')
    const regex = /dangerouslySetInnerHTML/g
    let match = regex.exec(content)
    while (match) {
      const line = content.slice(0, match.index).split('\n').length
      findings.push({ filePath, line })
      match = regex.exec(content)
    }
  }

  return findings
}

describe('S4 Input Validation & XSS Security', () => {
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
    ;({ accountsRouter } = require('../../server/dist/interfaces/http/routes/accounts.routes'))
    ;({ pmcRouter } = require('../../server/dist/interfaces/http/routes/pmc.routes'))
    ;({ commonRouter } = require('../../server/dist/interfaces/http/routes/common.routes'))

    allRoutes = discoverRoutes([
      { prefix: '/api/accounts', router: accountsRouter },
      { prefix: '/api/pmc', router: pmcRouter },
      { prefix: '/api', router: commonRouter },
    ])

    jsonPostPutRoutes = allRoutes.filter((route) => {
      if (!['POST', 'PUT'].includes(route.method)) return false
      if (route.middlewareNames.includes('parseMultipart')) return false
      if (route.path.includes('/oauth/')) return false
      return true
    })

    app = createApp()
    app.set('trust proxy', 1)

    await connectDb()
    const user = await UserModel.create({
      username: 'input.security.user@test.local',
      email: 'input.security.user@test.local',
      passwordHash: PASSWORD_HASH,
      groups: ['APPLICANT'],
      permissions: [],
      directPermissions: [],
      isActive: true,
      isSuperadmin: false,
    })

    authToken = signTokens(String(user._id)).access
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

  it('discovers JSON POST/PUT routes for S4 coverage', () => {
    expect(jsonPostPutRoutes.length).toBeGreaterThan(0)
  })

  it.each(XSS_PAYLOADS)(
    'register/profile flows sanitize or reject XSS payload: %p',
    async (payload) => {
      const uniqueUser = `xss.user.${Date.now()}.${Math.floor(Math.random() * 10000)}`

      const registerRes = await request(app)
        .post('/api/accounts/register/')
        .set('X-Forwarded-For', nextIp())
        .set('Content-Type', 'application/json')
        .send({
          username: uniqueUser,
          password: 'TestPass123!',
          first_name: payload,
          last_name: payload,
        })

      expect([201, 400]).toContain(registerRes.status)
      expect(containsRawScriptTag(registerRes.body)).toBe(false)

      const created = await UserModel.findOne({ username: uniqueUser }).lean()
      if (created) {
        expect(String(created.firstName || '')).not.toContain('<script>')
        expect(String(created.lastName || '')).not.toContain('<script>')
      }

      const profileRes = await request(app)
        .patch('/api/accounts/profile/')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Forwarded-For', nextIp())
        .set('Content-Type', 'application/json')
        .send({
          first_name: payload,
          last_name: payload,
        })

      expect([200, 400]).toContain(profileRes.status)
      expect(containsRawScriptTag(profileRes.body)).toBe(false)
    }
  )

  it('exercises all discovered JSON POST/PUT routes with XSS payload and ensures no 500/crash', async () => {
    const failures = []
    const payload = "<script>alert('xss')</script>"

    for (const route of jsonPostPutRoutes) {
      const pathValue = materializeRoutePath(route.path)
      let req = request(app)
        [route.method.toLowerCase()](pathValue)
        .set('X-Forwarded-For', nextIp())
        .set('Content-Type', 'application/json')
        .send({ probe: payload })

      if (route.middlewareNames.includes('authenticate')) {
        req = req.set('Authorization', `Bearer ${authToken}`)
      }

      try {
        const res = await req
        if (res.status === 500) {
          failures.push(`${route.method} ${pathValue} -> 500`)
        }
        if (containsRawScriptTag(res.body)) {
          failures.push(`${route.method} ${pathValue} reflected raw script`)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push(`${route.method} ${pathValue} request error (${message})`)
      }
    }

    // SECURITY VULNERABILITY: write routes should not crash or reflect raw script payloads.
    expect(failures).toEqual([])
  })

  it('finds no dangerouslySetInnerHTML usage in React code', () => {
    const findings = getDangerouslySetInnerHTMLFindings()
    // SECURITY VULNERABILITY: dangerouslySetInnerHTML with user/API data can lead to critical XSS.
    expect(findings).toEqual([])
  })

  it('enforces required security headers on HTTP responses', async () => {
    const res = await request(app)
      .get('/api/accounts/generate-captcha/')
      .set('X-Forwarded-For', nextIp())

    expect(res.headers['content-security-policy']).toBeDefined()
    expect(res.headers['x-xss-protection']).toBeDefined()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(['DENY', 'SAMEORIGIN']).toContain(String(res.headers['x-frame-options']).toUpperCase())
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('handles duplicate query parameters safely (HTTP parameter pollution check)', async () => {
    const res = await request(app)
      .get('/api/search/query')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Forwarded-For', nextIp())
      .query({ query: ['role=user', 'role=admin'] })

    expect(res.status).not.toBe(500)
    expect(Array.isArray(res.body) || typeof res.body === 'object').toBe(true)
  })

  it('returns 413 for oversized JSON payloads across discovered JSON POST/PUT routes', async () => {
    const failures = []
    const bigPayload = { large: 'a'.repeat(TEN_MB) }

    for (const route of jsonPostPutRoutes) {
      const pathValue = materializeRoutePath(route.path)
      const res = await request(app)
        [route.method.toLowerCase()](pathValue)
        .set('X-Forwarded-For', nextIp())
        .set('Content-Type', 'application/json')
        .send(bigPayload)

      if (res.status !== 413) {
        failures.push(`${route.method} ${pathValue} -> ${res.status}`)
      }
    }

    // SECURITY VULNERABILITY: oversized requests must be rejected with 413.
    expect(failures).toEqual([])
  })

  it('handles null bytes, unicode, emoji and CRLF payloads without crashes/header injection', async () => {
    const samples = ['test\u0000injection', '𝕳𝖊𝖑𝖑𝖔', 'مرحبا', 'emoji🔥', 'test\r\nHeader: injected']

    for (const sample of samples) {
      const username = `special.user.${Date.now()}.${Math.floor(Math.random() * 10000)}`
      const res = await request(app)
        .post('/api/accounts/register/')
        .set('X-Forwarded-For', nextIp())
        .set('Content-Type', 'application/json')
        .send({
          username,
          password: 'TestPass123!',
          first_name: sample,
          last_name: sample,
        })

      expect([201, 400]).toContain(res.status)
      expect(res.status).not.toBe(500)
      expect(res.headers['header']).toBeUndefined()
    }
  })
})
