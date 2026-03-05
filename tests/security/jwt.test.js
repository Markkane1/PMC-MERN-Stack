const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execSync } = require('child_process')
const jwt = require('jsonwebtoken')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(300000)

const TEST_JWT_SECRET = 'jwt-security-test-secret-123456789012345'
const DUMMY_OBJECT_ID = '507f1f77bcf86cd799439011'

let mongoServer
let app
let createApp
let UserModel
let connectDb
let signTokens
let OAuthService
let protectedRoutes = []
let seededUser

function walkFiles(dir, extension) {
  const results = []
  const stack = [dir]

  while (stack.length) {
    const current = stack.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(absolute)
      } else if (absolute.endsWith(extension)) {
        results.push(absolute)
      }
    }
  }

  return results
}

function findLineNumber(content, index) {
  return content.slice(0, index).split('\n').length
}

function normalizePath(value) {
  const collapsed = value.replace(/\/{2,}/g, '/')
  return collapsed.startsWith('/') ? collapsed : `/${collapsed}`
}

function materializeRoutePath(routePath) {
  return routePath
    .replace(/:([a-zA-Z0-9_]+)\([^/]+\)/g, DUMMY_OBJECT_ID)
    .replace(/:([a-zA-Z0-9_]+)/g, DUMMY_OBJECT_ID)
}

function discoverProtectedRoutes(routersByPrefix) {
  const discovered = new Map()

  for (const item of routersByPrefix) {
    const { prefix, router } = item
    for (const layer of router.stack || []) {
      if (!layer.route || typeof layer.route.path !== 'string') {
        continue
      }

      const middlewareNames = (layer.route.stack || []).map((routeLayer) => routeLayer.name)
      if (!middlewareNames.includes('authenticate')) {
        continue
      }

      const methods = Object.keys(layer.route.methods || {}).filter((method) => layer.route.methods[method])
      const fullPath = normalizePath(`${prefix}${layer.route.path}`)

      for (const method of methods) {
        const upperMethod = method.toUpperCase()
        discovered.set(`${upperMethod} ${fullPath}`, { method: upperMethod, path: fullPath })
      }
    }
  }

  return Array.from(discovered.values()).sort((a, b) => {
    if (a.path === b.path) {
      return a.method.localeCompare(b.method)
    }
    return a.path.localeCompare(b.path)
  })
}

function makeAlgNoneToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.`
}

function mutateSignature(token) {
  const parts = token.split('.')
  parts[2] = `${parts[2].slice(0, -3)}abc`
  return parts.join('.')
}

function collectLocalStorageTokenFindings() {
  const clientRoot = path.resolve(__dirname, '../../client/src')
  const files = walkFiles(clientRoot, '.tsx').concat(walkFiles(clientRoot, '.ts'))
  const findings = []
  const localStorageRegex = /localStorage\.setItem\([^)]*\)/g

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const match of content.matchAll(localStorageRegex)) {
      const expression = match[0]
      const looksLikeTokenStorage =
        /localStorage\.setItem\(\s*['"`][^'"`]*token/i.test(expression) ||
        /\bdata\.token\b/i.test(expression) ||
        /\baccessToken\b/i.test(expression)

      if (!looksLikeTokenStorage) {
        continue
      }

      findings.push({
        filePath,
        line: findLineNumber(content, match.index),
        expression,
      })
    }
  }

  return findings
}

function collectTokenInUrlFindings() {
  const targets = [
    path.resolve(__dirname, '../../client/src'),
    path.resolve(__dirname, '../../server/src'),
  ]
  const findings = []
  const tokenQueryRegex = /[?&](token|access_token|id_token|jwt|authToken)=/gi

  for (const root of targets) {
    const files = walkFiles(root, '.ts').concat(walkFiles(root, '.tsx'))
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8')
      for (const match of content.matchAll(tokenQueryRegex)) {
        findings.push({
          filePath,
          line: findLineNumber(content, match.index),
          tokenParam: match[1],
        })
      }
    }
  }

  return findings
}

function collectJwtSignMissingExpFindings() {
  const serverRoot = path.resolve(__dirname, '../../server/src')
  const files = walkFiles(serverRoot, '.ts')
  const findings = []

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8')
    let index = content.indexOf('jwt.sign(')
    while (index !== -1) {
      const nearby = content.slice(index, index + 500)
      if (!/expiresIn\s*:/.test(nearby)) {
        findings.push({
          filePath,
          line: findLineNumber(content, index),
        })
      }
      index = content.indexOf('jwt.sign(', index + 1)
    }
  }

  return findings
}

async function assertUnauthorizedForAllProtectedRoutes(token) {
  const failures = []
  const batchSize = Math.max(protectedRoutes.length, 1)

  for (let start = 0; start < protectedRoutes.length; start += batchSize) {
    const batch = protectedRoutes.slice(start, start + batchSize)
    const batchFailures = await Promise.all(
      batch.map(async (route, offset) => {
        const i = start + offset
        const method = route.method.toLowerCase()
        const routePath = materializeRoutePath(route.path)
        const ip = `10.10.${Math.floor(i / 250)}.${(i % 250) + 1}`

        let req = request(app)[method](routePath)
          .set('Authorization', `Bearer ${token}`)
          .set('X-Forwarded-For', ip)
          .set('Content-Type', 'application/json')
          .timeout({ response: 5000, deadline: 7000 })

        if (method === 'post' || method === 'put' || method === 'patch') {
          req = req.send({})
        }

        try {
          const res = await req
          if (res.status !== 401) {
            return `${route.method} ${routePath} -> ${res.status}`
          }
          return null
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return `${route.method} ${routePath} -> request error (${message})`
        }
      })
    )

    failures.push(...batchFailures.filter(Boolean))
  }

  // SECURITY VULNERABILITY: protected routes must reject malformed/invalid JWTs with 401.
  expect(failures).toEqual([])
}

describe('S1 JWT Security', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()

    process.env.NODE_ENV = 'test'
    process.env.JWT_SECRET = TEST_JWT_SECRET
    process.env.JWT_REFRESH_SECRET = `${TEST_JWT_SECRET}-refresh`
    process.env.JWT_EXPIRES_IN = '1h'
    process.env.JWT_REFRESH_EXPIRES_IN = '7d'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    process.env.MONGO_URI = mongoServer.getUri()

    execSync('npm run build --prefix server', {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'pipe',
    })

    jest.resetModules()

    ;({ createApp } = require('../../server/dist/app'))
    ;({ connectDb } = require('../../server/dist/infrastructure/config/db'))
    ;({ UserModel } = require('../../server/dist/infrastructure/database/models/accounts/User'))
    ;({ signTokens } = require('../../server/dist/application/services/accounts/AuthService'))
    ;({ OAuthService } = require('../../server/dist/application/services/OAuthService'))

    const { accountsRouter } = require('../../server/dist/interfaces/http/routes/accounts.routes')
    const { pmcRouter } = require('../../server/dist/interfaces/http/routes/pmc.routes')
    const { commonRouter } = require('../../server/dist/interfaces/http/routes/common.routes')

    protectedRoutes = discoverProtectedRoutes([
      { prefix: '/api/accounts', router: accountsRouter },
      { prefix: '/api/pmc', router: pmcRouter },
      { prefix: '/api', router: commonRouter },
    ])

    app = createApp()
    app.set('trust proxy', 1)

    await connectDb()
    seededUser = await UserModel.create({
      username: 'jwt.security.user@test.local',
      email: 'jwt.security.user@test.local',
      passwordHash: '$2b$10$Et2im5s8dr6ICB8T3wN5cenUl.Ck6m1b.tY5jP6fwv0I7gA0wE6vm',
      groups: ['APPLICANT'],
      permissions: [],
      isActive: true,
      isSuperadmin: false,
    })
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

  it('discovers protected routes that are guarded by authenticate middleware', () => {
    expect(protectedRoutes.length).toBeGreaterThan(0)
  })

  it('rejects alg:none tokens on every protected route', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = makeAlgNoneToken({
      userId: String(seededUser._id),
      type: 'access',
      iat: now,
      exp: now + 3600,
    })
    await assertUnauthorizedForAllProtectedRoutes(token)
  })

  it('rejects algorithm-switched RS256 tokens on every protected route (HS256 app)', async () => {
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
    const rs256Token = jwt.sign(
      { userId: String(seededUser._id), type: 'access' },
      privateKey,
      { algorithm: 'RS256', expiresIn: '1h' }
    )
    await assertUnauthorizedForAllProtectedRoutes(rs256Token)
  })

  it('rejects invalid-signature tokens on every protected route', async () => {
    const { access } = signTokens(String(seededUser._id))
    const tampered = mutateSignature(access)
    await assertUnauthorizedForAllProtectedRoutes(tampered)
  })

  it('rejects expired tokens on every protected route', async () => {
    const expired = jwt.sign(
      { userId: String(seededUser._id), type: 'access' },
      TEST_JWT_SECRET,
      { algorithm: 'HS256', expiresIn: -1 }
    )
    await assertUnauthorizedForAllProtectedRoutes(expired)
  })

  it('ensures every jwt.sign call in server code includes expiresIn', () => {
    const missingExpClaims = collectJwtSignMissingExpFindings()
    expect(missingExpClaims).toEqual([])
  })

  it('ensures access, refresh, and OAuth state tokens include exp claims', () => {
    const tokens = signTokens(String(seededUser._id))
    const accessPayload = jwt.decode(tokens.access)
    const refreshPayload = jwt.decode(tokens.refresh)
    const statePayload = jwt.decode(OAuthService.createStateToken())

    expect(accessPayload).toHaveProperty('exp')
    expect(refreshPayload).toHaveProperty('exp')
    expect(statePayload).toHaveProperty('exp')
  })

  it('should not store auth tokens in localStorage', () => {
    const tokenStorageFindings = collectLocalStorageTokenFindings()
    // SECURITY VULNERABILITY: token persistence in localStorage is XSS-exploitable.
    expect(tokenStorageFindings).toEqual([])
  })

  it('should not pass tokens in URL query parameters', () => {
    const tokenInUrlFindings = collectTokenInUrlFindings()
    // SECURITY VULNERABILITY: token query params leak into logs, history, and referrers.
    expect(tokenInUrlFindings).toEqual([])
  })
})
