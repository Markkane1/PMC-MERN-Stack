const fs = require('fs')
const os = require('os')
const path = require('path')
const { execSync } = require('child_process')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(600000)

const TEST_JWT_SECRET = 'file-upload-security-test-secret-123456789012345'
const PASSWORD_HASH = '$2b$10$Et2im5s8dr6ICB8T3wN5cenUl.Ck6m1b.tY5jP6fwv0I7gA0wE6vm'

let mongoServer
let app
let createApp
let connectDb
let signTokens
let UserModel
let ApplicantDetailModel
let DistrictModel

let userA
let userB
let tokenA
let tokenB
let seededApplicant
let seededDistrict

let tempDir
let uploadRoot
let requestCounter = 0

function nextIp() {
  requestCounter += 1
  const third = Math.floor(requestCounter / 250)
  const fourth = (requestCounter % 250) + 1
  return `10.70.${third}.${fourth}`
}

function binaryParser(res, callback) {
  res.setEncoding('binary')
  let data = ''
  res.on('data', (chunk) => {
    data += chunk
  })
  res.on('end', () => {
    callback(null, Buffer.from(data, 'binary'))
  })
}

function createTempFile(filename, content) {
  const filePath = path.join(tempDir, filename)
  fs.writeFileSync(filePath, content)
  return filePath
}

function attachOptions(filename, contentType) {
  return {
    filename,
    contentType,
  }
}

function toAccessibleMediaUrl(documentUrl) {
  const normalized = String(documentUrl || '').replace(/\/+$/, '')
  const prefix = '/api/pmc/media/'
  if (!normalized.startsWith(prefix)) return normalized

  const rest = normalized.slice(prefix.length)
  if (rest.startsWith('media/')) {
    return `${prefix}${rest}/`
  }
  return `${prefix}media/${rest}/`
}

async function uploadDistrictDocument({
  token,
  filePath,
  filename,
  contentType,
  districtId = seededDistrict.districtId,
  documentType = 'SECURITY_TEST',
  title = 'S7 Upload Test',
}) {
  return request(app)
    .post('/api/pmc/district-documents/')
    .set('Authorization', `Bearer ${token}`)
    .set('X-Forwarded-For', nextIp())
    .set('Connection', 'close')
    .field('district', String(districtId))
    .field('document_type', documentType)
    .field('title', title)
    .attach('document', filePath, attachOptions(filename, contentType))
}

describe('S7 File Upload Security', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pmc-s7-file-upload-'))
    uploadRoot = path.join(tempDir, 'uploads')
    fs.mkdirSync(uploadRoot, { recursive: true })

    process.env.NODE_ENV = 'test'
    process.env.JWT_SECRET = TEST_JWT_SECRET
    process.env.JWT_REFRESH_SECRET = `${TEST_JWT_SECRET}-refresh`
    process.env.JWT_EXPIRES_IN = '1h'
    process.env.JWT_REFRESH_EXPIRES_IN = '7d'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    process.env.MONGO_URI = mongoServer.getUri()
    process.env.ALLOW_LEGACY_MASTERKEY_LOGIN = 'false'
    process.env.UPLOAD_DIR = uploadRoot

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
    ;({ DistrictModel } = require('../../server/dist/infrastructure/database/models/pmc/District'))

    app = createApp()
    app.set('trust proxy', 1)

    await connectDb()

    const uploadPermissions = [
      'pmc.add_applicantdocument',
      'pmc.add_districtplasticcommitteedocument',
      'pmc.view_applicantdocument',
      'pmc.view_districtplasticcommitteedocument',
    ]

    userA = await UserModel.create({
      username: 'upload.user.a@test.local',
      email: 'upload.user.a@test.local',
      passwordHash: PASSWORD_HASH,
      groups: ['APPLICANT'],
      permissions: uploadPermissions,
      directPermissions: [],
      isActive: true,
      isSuperadmin: false,
    })

    userB = await UserModel.create({
      username: 'upload.user.b@test.local',
      email: 'upload.user.b@test.local',
      passwordHash: PASSWORD_HASH,
      groups: ['APPLICANT'],
      permissions: uploadPermissions,
      directPermissions: [],
      isActive: true,
      isSuperadmin: false,
    })

    seededApplicant = await ApplicantDetailModel.create({
      firstName: 'Uploader',
      lastName: 'A',
      cnic: '3520212345671',
      mobileNo: '03001234567',
      trackingNumber: 'TRACK-UPLOAD-A',
      createdBy: userA._id,
      assignedGroup: 'APPLICANT',
    })

    seededDistrict = await DistrictModel.create({
      districtId: 9901,
      divisionId: 99,
      districtName: 'Security District',
      districtCode: 'SEC-99',
    })

    tokenA = signTokens(String(userA._id)).access
    tokenB = signTokens(String(userB._id)).access
  })

  afterAll(async () => {
    if (UserModel?.db) {
      await UserModel.db.dropDatabase()
      await UserModel.db.close()
    }
    if (mongoServer) {
      await mongoServer.stop()
    }
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('confirms a valid upload works on district-documents route', async () => {
    const validFile = createTempFile('valid.pdf', Buffer.from('%PDF-1.4\nvalid'))
    const res = await uploadDistrictDocument({
      token: tokenA,
      filePath: validFile,
      filename: 'valid.pdf',
      contentType: 'application/pdf',
    })

    expect(res.status).toBe(201)
    expect(typeof res.body.document).toBe('string')
    expect(res.body.document).toMatch(/^\/api\/pmc\/media\//)
  })

  describe('File Type Bypass', () => {
    const bypassCases = [
      {
        label: 'JavaScript payload renamed to image.jpg',
        filename: 'image.jpg',
        contentType: 'image/jpeg',
        content: Buffer.from("/*x*/<script>alert('xss')</script>"),
      },
      {
        label: 'HTML payload renamed to document.pdf',
        filename: 'document.pdf',
        contentType: 'application/pdf',
        content: Buffer.from("<html><body><script>alert('xss')</script></body></html>"),
      },
      {
        label: 'double extension malware.jpg.exe',
        filename: 'malware.jpg.exe',
        contentType: 'image/jpeg',
        content: Buffer.from('malware'),
      },
      {
        label: 'file with no extension',
        filename: 'payload',
        contentType: 'application/pdf',
        content: Buffer.from('payload-no-extension'),
      },
    ]

    it.each(bypassCases)('handles bypass case safely: $label', async ({ filename, contentType, content }) => {
      const filePath = createTempFile(`bypass-${Date.now()}-${Math.random()}`, content)
      const uploadRes = await uploadDistrictDocument({
        token: tokenA,
        filePath,
        filename,
        contentType,
        documentType: 'BYPASS_TEST',
      })

      if (uploadRes.status === 201) {
        const mediaRes = await request(app)
          .get(toAccessibleMediaUrl(uploadRes.body.document))
          .set('X-Forwarded-For', nextIp())
          .buffer(true)
          .parse(binaryParser)

        const bodyText = Buffer.isBuffer(mediaRes.body)
          ? mediaRes.body.toString('utf8')
          : Buffer.from(String(mediaRes.text || ''), 'utf8').toString()

        expect(mediaRes.status).toBe(200)
        expect((mediaRes.headers['content-type'] || '').toLowerCase()).not.toContain('text/html')
        expect(bodyText).not.toMatch(/<script>|javascript:|onerror=|onload=/i)
      } else {
        expect(uploadRes.status).toBe(400)
      }
    })
  })

  it('strips or neutralizes malicious script content in uploaded JPG metadata before serving', async () => {
    const scriptPayload = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.from("JFIF\0<script>alert('xss')</script>"),
      Buffer.from([0xff, 0xd9]),
    ])
    const filePath = createTempFile('malicious-metadata.jpg', scriptPayload)

    const uploadRes = await uploadDistrictDocument({
      token: tokenA,
      filePath,
      filename: 'malicious-metadata.jpg',
      contentType: 'image/jpeg',
      documentType: 'MALICIOUS_CONTENT',
    })

    expect(uploadRes.status).toBe(201)
    expect(uploadRes.body.document).toMatch(/^\/api\/pmc\/media\//)

    const mediaRes = await request(app)
      .get(toAccessibleMediaUrl(uploadRes.body.document))
      .set('X-Forwarded-For', nextIp())
      .buffer(true)
      .parse(binaryParser)

    const servedText = Buffer.isBuffer(mediaRes.body)
      ? mediaRes.body.toString('utf8')
      : Buffer.from(String(mediaRes.text || ''), 'utf8').toString()

    expect(mediaRes.status).toBe(200)
    expect(servedText).not.toContain("<script>alert('xss')</script>")
  })

  it('sanitizes or rejects path traversal filenames', async () => {
    const sample = createTempFile('sample.pdf', Buffer.from('%PDF-1.4 traversal test'))
    const pathTraversalNames = ['../../etc/passwd', '../server.js']

    for (const filename of pathTraversalNames) {
      const res = await uploadDistrictDocument({
        token: tokenA,
        filePath: sample,
        filename,
        contentType: 'application/pdf',
        documentType: 'PATH_TRAVERSAL',
      })

      if (res.status === 201) expect(res.body.document).not.toContain('..')
      else expect(res.status).toBe(400)
    }
  })

  it('blocks direct file URL access by another user', async () => {
    const privateFile = createTempFile('private.pdf', Buffer.from('%PDF-1.4 private'))
    const uploadRes = await uploadDistrictDocument({
      token: tokenA,
      filePath: privateFile,
      filename: 'private.pdf',
      contentType: 'application/pdf',
      documentType: 'PRIVATE_ACCESS',
      title: `Private file for user A ${seededApplicant.numericId}`,
    })

    expect(uploadRes.status).toBe(201)
    expect(uploadRes.body.document).toMatch(/^\/api\/pmc\/media\//)

    const accessByUserB = await request(app)
      .get(toAccessibleMediaUrl(uploadRes.body.document))
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Forwarded-For', nextIp())

    expect(accessByUserB.status).toBe(403)
  })

  it('rejects executable uploads (.js, .sh, .php, .py, .exe)', async () => {
    const payloadPath = createTempFile('exec-payload.txt', Buffer.from('echo pwned'))
    const executableExts = ['.js', '.sh', '.php', '.py', '.exe']

    for (const ext of executableExts) {
      const res = await uploadDistrictDocument({
        token: tokenA,
        filePath: payloadPath,
        filename: `malicious${ext}`,
        contentType: 'application/octet-stream',
        documentType: 'EXECUTABLE_TEST',
      })

      expect(res.status).toBe(400)
    }
  })

  it('enforces file size limits (100MB should be rejected with 413)', async () => {
    const largePath = createTempFile('oversized-100mb.pdf', Buffer.alloc(100 * 1024 * 1024, 0x41))

    const res = await uploadDistrictDocument({
      token: tokenA,
      filePath: largePath,
      filename: 'oversized-100mb.pdf',
      contentType: 'application/pdf',
      documentType: 'SIZE_LIMIT',
    })

    expect(res.status).toBe(413)
  })
})
