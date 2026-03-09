const path = require('path')
const { execSync } = require('child_process')
const mongoose = require(path.resolve(process.cwd(), 'server/node_modules/mongoose'))
const { MongoMemoryServer } = require('mongodb-memory-server')

let mongoServer
let app

function ensureTestEnv(mongoUri) {
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-thirty-two-characters'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-thirty-two-chars'
  process.env.JWT_EXPIRES_IN = '1h'
  process.env.JWT_REFRESH_EXPIRES_IN = '2h'
  process.env.CORS_ORIGIN = 'http://localhost:5173'
  process.env.MONGO_URI = mongoUri
  process.env.ALLOW_LEGACY_MASTERKEY_LOGIN = 'false'
  process.env.PORT = '0'
}

function ensureServerBuild() {
  const appDistPath = path.resolve(process.cwd(), 'server/dist/app.js')
  if (!require('fs').existsSync(appDistPath)) {
    execSync('npm run build --prefix server', {
      cwd: process.cwd(),
      stdio: 'inherit',
    })
  }
}

async function bootstrapTestApp() {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 60000,
    },
  })
  const mongoUri = mongoServer.getUri()
  ensureTestEnv(mongoUri)

  ensureServerBuild()
  const { createApp } = require(path.resolve(process.cwd(), 'server/dist/app.js'))

  await mongoose.connect(mongoUri)
  app = createApp()
  return app
}

async function resetDatabase() {
  const collections = mongoose.connection.collections
  for (const collection of Object.values(collections)) {
    await collection.deleteMany({})
  }
}

async function shutdownTestApp() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  if (mongoServer) {
    await mongoServer.stop()
  }
}

function getApp() {
  return app
}

module.exports = {
  bootstrapTestApp,
  resetDatabase,
  shutdownTestApp,
  getApp,
}
