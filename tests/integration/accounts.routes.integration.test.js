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

describe('Accounts API Integration', () => {
  let app
  let UserModel
  let userRepositoryMongo
  let regularUser
  let superUser
  let regularToken
  let superToken

  const jwtSecret = 'test-jwt-secret-at-least-thirty-two-characters'

  beforeAll(async () => {
    app = await bootstrapTestApp()
    ;({ UserModel } = require('../../server/dist/infrastructure/database/models/accounts/User.js'))
    ;({ userRepositoryMongo } = require('../../server/dist/infrastructure/database/repositories/accounts/index.js'))
  })

  beforeEach(async () => {
    await resetDatabase()

    regularUser = await UserModel.create({
      username: 'regular.user',
      passwordHash: await bcrypt.hash('RegularPass123', 10),
      groups: ['APPLICANT'],
      permissions: [],
      directPermissions: [],
      isActive: true,
    })

    superUser = await UserModel.create({
      username: 'super.user',
      passwordHash: await bcrypt.hash('SuperPass123', 10),
      groups: ['Super', 'Admin'],
      permissions: [],
      directPermissions: [],
      isActive: true,
      isSuperadmin: true,
    })

    regularToken = jwt.sign({ userId: String(regularUser._id), type: 'access' }, jwtSecret, { expiresIn: '1h' })
    superToken = jwt.sign({ userId: String(superUser._id), type: 'access' }, jwtSecret, { expiresIn: '1h' })
  })

  afterAll(async () => {
    await shutdownTestApp()
  })

  it('should register a new user and persist it in database', async () => {
    const payload = {
      username: 'new.user',
      password: 'ValidPass123',
      first_name: 'New',
      last_name: 'User',
    }

    const response = await request(app).post('/api/accounts/register/').send(payload)

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ username: 'new.user' })

    const created = await UserModel.findOne({ username: 'new.user' }).lean()
    expect(created).toBeTruthy()
    expect(created.passwordHash).not.toBe(payload.password)
  })

  it('should reject duplicate username registration with 400', async () => {
    const response = await request(app).post('/api/accounts/register/').send({
      username: 'regular.user',
      password: 'AnotherPass123',
    })

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('message')
  })

  it('should return 400 when registration fields are missing', async () => {
    const response = await request(app).post('/api/accounts/register/').send({})
    expect(response.status).toBe(400)
  })

  it('should login with valid credentials and set auth cookie', async () => {
    const response = await request(app).post('/api/accounts/login/').send({
      username: 'regular.user',
      password: 'RegularPass123',
    })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('user')
    expect(response.headers['set-cookie']).toBeDefined()
    expect(response.headers['set-cookie'][0]).toContain('pmc_access_token=')
  })

  it('should return 401 for invalid login credentials', async () => {
    const response = await request(app).post('/api/accounts/login/').send({
      username: 'regular.user',
      password: 'WrongPassword123',
    })

    expect(response.status).toBe(401)
  })

  it('should return 401 when requesting profile without token', async () => {
    const response = await request(app).get('/api/accounts/profile/')
    expect(response.status).toBe(401)
  })

  it('should return profile for authenticated user with valid token', async () => {
    const response = await request(app)
      .get('/api/accounts/profile/')
      .set('Authorization', `Bearer ${regularToken}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      username: 'regular.user',
    })
  })

  it('should return 403 for regular user accessing admin users endpoint', async () => {
    const response = await request(app)
      .get('/api/accounts/admin/users/')
      .set('Authorization', `Bearer ${regularToken}`)

    expect(response.status).toBe(403)
  })

  it('should return admin users list for super user and avoid sensitive passwordHash exposure', async () => {
    const response = await request(app)
      .get('/api/accounts/admin/users/')
      .set('Authorization', `Bearer ${superToken}`)

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    if (response.body.length > 0) {
      expect(response.body[0]).not.toHaveProperty('passwordHash')
    }
  })

  it('should return 400 for invalid object id in admin user update route', async () => {
    const response = await request(app)
      .patch('/api/accounts/admin/users/not-an-id/')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ is_active: false })

    expect(response.status).toBe(400)
  })

  it('should return 404 for non-existing user id in admin user update route', async () => {
    const nonExistingId = '507f191e810c19729de860ea'
    const response = await request(app)
      .patch(`/api/accounts/admin/users/${nonExistingId}/`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ is_active: false })

    expect(response.status).toBe(404)
  })

  it('should return 500 with safe message when repository throws server error', async () => {
    const spy = jest.spyOn(userRepositoryMongo, 'listAll').mockRejectedValueOnce(new Error('db exploded'))

    const response = await request(app)
      .get('/api/accounts/admin/users/')
      .set('Authorization', `Bearer ${superToken}`)

    expect(response.status).toBe(500)
    expect(response.body).toHaveProperty('message')
    expect(response.body.message).toBe('An error occurred')
    expect(JSON.stringify(response.body)).not.toMatch(/stack|Mongo|db exploded/i)

    spy.mockRestore()
  })
})
