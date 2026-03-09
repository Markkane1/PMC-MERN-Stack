const fs = require('fs')
const path = require('path')
const request = require('supertest')
const jwt = require('jsonwebtoken')
const bcrypt = require(path.resolve(process.cwd(), 'server/node_modules/bcryptjs'))

const {
  bootstrapTestApp,
  resetDatabase,
  shutdownTestApp,
} = require('./helpers/testApp')

jest.setTimeout(180000)

function parseProtectedRoutes(filePath, routerName, prefix) {
  const source = fs.readFileSync(filePath, 'utf8')
  const regex = new RegExp(
    `${routerName}\\.(get|post|put|patch|delete)\\(\\s*'([^']+)'\\s*,\\s*authenticate\\b`,
    'g'
  )

  const routes = []
  let match
  while ((match = regex.exec(source)) !== null) {
    const method = match[1].toUpperCase()
    const routePath = `${prefix}${match[2]}`
    routes.push({ method, routePath })
  }
  return routes
}

function materializePath(routePath) {
  return routePath.replace(/:([A-Za-z_][A-Za-z0-9_]*)(\([^)]*\))?/g, (_m, name) => {
    if (/alertId/i.test(name)) return '507f1f77bcf86cd799439011'
    if (/folder_name/i.test(name)) return 'media'
    if (/file_name/i.test(name)) return 'sample.txt'
    if (/psidNumber/i.test(name)) return 'PSID123'
    if (/id/i.test(name)) return '507f1f77bcf86cd799439011'
    return 'sample'
  })
}

function dedupeRoutes(routes) {
  const seen = new Set()
  return routes.filter((route) => {
    const key = `${route.method}:${route.routePath}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function callRoute(app, method, routePath, token) {
  const url = materializePath(routePath)
  let req = request(app)[method.toLowerCase()](url)
  if (token !== undefined) {
    req = req.set('Authorization', `Bearer ${token}`)
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    req = req.send({})
  }
  return req
}

describe('Protected Route Authentication Bypass Checks', () => {
  let app
  let UserModel
  let regularToken
  let protectedRoutes
  const jwtSecret = 'test-jwt-secret-at-least-thirty-two-characters'

  beforeAll(async () => {
    app = await bootstrapTestApp()
    ;({ UserModel } = require('../../server/dist/infrastructure/database/models/accounts/User.js'))

    const routes = [
      ...parseProtectedRoutes(
        path.resolve(process.cwd(), 'server/src/interfaces/http/routes/accounts.routes.ts'),
        'accountsRouter',
        '/api/accounts'
      ),
      ...parseProtectedRoutes(
        path.resolve(process.cwd(), 'server/src/interfaces/http/routes/common.routes.ts'),
        'commonRouter',
        '/api'
      ),
      ...parseProtectedRoutes(
        path.resolve(process.cwd(), 'server/src/interfaces/http/routes/pmc.routes.ts'),
        'pmcRouter',
        '/api/pmc'
      ),
    ]
    protectedRoutes = dedupeRoutes(routes)
  })

  beforeEach(async () => {
    await resetDatabase()
    const user = await UserModel.create({
      username: 'auth.route.user',
      passwordHash: await bcrypt.hash('RoutePass123', 10),
      groups: ['APPLICANT'],
      permissions: [],
      directPermissions: [],
      isActive: true,
    })
    regularToken = jwt.sign({ userId: String(user._id), type: 'access' }, jwtSecret, { expiresIn: '1h' })
  })

  afterAll(async () => {
    await shutdownTestApp()
  })

  it('should discover at least one protected route from route definitions', () => {
    expect(protectedRoutes.length).toBeGreaterThan(0)
  })

  it('should return 401 when no token is provided for every protected route', async () => {
    for (const { method, routePath } of protectedRoutes) {
      const response = await callRoute(app, method, routePath)
      expect(response.status).toBe(401)
    }
  })

  it('should return 401 for malformed token on every protected route', async () => {
    for (const { method, routePath } of protectedRoutes) {
      const response = await callRoute(app, method, routePath, 'not-a-jwt')
      expect(response.status).toBe(401)
    }
  })

  it('should return 401 for wrong-secret token on every protected route', async () => {
    const wrongSecretToken = jwt.sign(
      { userId: '507f1f77bcf86cd799439011', type: 'access' },
      'wrong-secret-at-least-thirty-two-characters',
      { expiresIn: '1h' }
    )

    for (const { method, routePath } of protectedRoutes) {
      const response = await callRoute(app, method, routePath, wrongSecretToken)
      expect(response.status).toBe(401)
    }
  })

  it('should return 401 for expired token on every protected route', async () => {
    const expiredToken = jwt.sign(
      { userId: '507f1f77bcf86cd799439011', type: 'access', exp: Math.floor(Date.now() / 1000) - 60 },
      jwtSecret
    )

    for (const { method, routePath } of protectedRoutes) {
      const response = await callRoute(app, method, routePath, expiredToken)
      expect(response.status).toBe(401)
    }
  })

  it('should return 403 when authenticated user without required group hits admin users endpoint', async () => {
    const response = await request(app)
      .get('/api/accounts/admin/users/')
      .set('Authorization', `Bearer ${regularToken}`)

    expect(response.status).toBe(403)
  })

  it('should return 403 when authenticated user without required permissions hits pmc protected endpoint', async () => {
    const response = await request(app)
      .get('/api/pmc/applicant-detail/')
      .set('Authorization', `Bearer ${regularToken}`)

    expect(response.status).toBe(403)
  })
})
