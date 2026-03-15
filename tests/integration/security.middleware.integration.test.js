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

describe('Security middleware protections', () => {
  let app
  let UserModel
  let adminToken
  let userToken

  beforeAll(async () => {
    app = await bootstrapTestApp()
    ;({ UserModel } = require('../../server/dist/infrastructure/database/models/accounts/User.js'))
  })

  beforeEach(async () => {
    await resetDatabase()

    const adminUser = await UserModel.create({
      username: 'admin.user',
      passwordHash: await bcrypt.hash('AdminPass123', 10),
      groups: ['Admin'],
      permissions: ['pmc.add_psidtracking'],
      directPermissions: [],
      isActive: true,
    })

    const regularUser = await UserModel.create({
      username: 'regular.user',
      passwordHash: await bcrypt.hash('RegularPass123', 10),
      groups: ['APPLICANT'],
      permissions: [],
      directPermissions: [],
      isActive: true,
    })

    adminToken = jwt.sign(
      { userId: String(adminUser._id), type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    userToken = jwt.sign(
      { userId: String(regularUser._id), type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )
  })

  afterAll(async () => {
    await shutdownTestApp()
  })

  it('rejects payment intimation without user or service authentication', async () => {
    const response = await request(app)
      .post('/api/pmc/payment-intimation/')
      .send({})

    expect(response.status).toBe(401)
  })

  it('rejects cookie-authenticated writes when the CSRF header is missing', async () => {
    const response = await request(app)
      .post('/api/accounts/logout/')
      .set('Cookie', [`pmc_access_token=${userToken}`])
      .send({})

    expect(response.status).toBe(403)
    expect(response.body.message).toBe('CSRF token validation failed')
  })

  it('allows cookie-authenticated writes when the CSRF cookie and header match', async () => {
    const response = await request(app)
      .post('/api/accounts/logout/')
      .set('Cookie', [`pmc_access_token=${userToken}`, 'pmc_csrf_token=test-csrf-token'])
      .set('X-CSRF-Token', 'test-csrf-token')
      .send({})

    expect(response.status).toBe(200)
  })

  it('rejects HA management endpoints for anonymous clients', async () => {
    const response = await request(app)
      .post('/ha/load-balancer/nodes')
      .send({ id: 'node-1', host: '127.0.0.1', port: 9999 })

    expect(response.status).toBe(401)
  })

  it('allows HA management endpoints for admin users', async () => {
    const response = await request(app)
      .post('/ha/load-balancer/nodes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ id: 'node-1', host: '127.0.0.1', port: 9999 })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
  })

  it('rejects resilience reset endpoints for anonymous clients', async () => {
    const response = await request(app)
      .post('/resilience/circuit-breakers/reset-all')
      .send({})

    expect(response.status).toBe(401)
  })
})
