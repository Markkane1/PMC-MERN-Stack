import mongoose from 'mongoose'
import { env } from '../infrastructure/config/env'
import { ApiLogModel } from '../infrastructure/database/models/common/ApiLog'
import { AuditLogModel } from '../infrastructure/database/models/common/AuditLog'
import { AccessLogModel } from '../infrastructure/database/models/common/AccessLog'
import { ExternalServiceTokenModel } from '../infrastructure/database/models/common/ExternalServiceToken'
import { ServiceConfigurationModel } from '../infrastructure/database/models/common/ServiceConfiguration'
import { UserModel } from '../infrastructure/database/models/accounts/User'

const batchSize = parseInt(process.env.MONGO_BATCH_SIZE || '1000', 10)

function log(message: string) {
  // eslint-disable-next-line no-console
  console.log(message)
}

async function collectionExists(name: string) {
  return mongoose.connection.db!.listCollections({ name }).hasNext()
}

async function fetchRaw(name: string) {
  return mongoose.connection.db!.collection(name).find({}).toArray()
}

async function upsertBatched(model: mongoose.Model<any>, docs: Record<string, any>[]) {
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize)
    if (!batch.length) continue
    const ops = batch.map((doc) => ({
      updateOne: {
        filter: { legacyId: doc.legacyId },
        update: { $set: doc },
        upsert: true,
      },
    }))
    await model.bulkWrite(ops, { ordered: false })
  }
}

async function main() {
  log(`Mongo: ${env.mongoUri}`)
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })

  try {
    const userDocs = await UserModel.find({}, { _id: 1, djangoId: 1, username: 1 }).lean()
    const userMap = new Map<number, { id: mongoose.Types.ObjectId; username?: string }>()
    for (const user of userDocs) {
      if (typeof user.djangoId === 'number') {
        userMap.set(user.djangoId, { id: user._id as mongoose.Types.ObjectId, username: user.username })
      }
    }

    if (await collectionExists('pmc_api_apilog')) {
      const rows = await fetchRaw('pmc_api_apilog')
      const docs = rows.map((row: any) => ({
        legacyId: row.id,
        serviceName: row.service_name || 'unknown',
        endpoint: row.endpoint || '',
        requestData: row.request_data || undefined,
        responseData: row.response_data || undefined,
        statusCode: row.status_code ?? undefined,
        createdAt: row.created_at || undefined,
        updatedAt: row.created_at || undefined,
      }))
      log(`Upserting api logs: ${docs.length}`)
      await upsertBatched(ApiLogModel, docs)
    }

    if (await collectionExists('pmc_api_auditlog')) {
      const rows = await fetchRaw('pmc_api_auditlog')
      const docs = rows.map((row: any) => {
        const mappedUser = typeof row.user_id === 'number' ? userMap.get(row.user_id) : undefined
        return {
          legacyId: row.id,
          userId: mappedUser?.id,
          username: mappedUser?.username,
          action: row.action || 'unknown',
          modelName: row.model_name || undefined,
          objectId: row.object_id ? String(row.object_id) : undefined,
          description: row.description || undefined,
          ipAddress: row.ip_address || undefined,
          timestamp: row.timestamp || undefined,
          createdAt: row.timestamp || undefined,
          updatedAt: row.timestamp || undefined,
        }
      })
      log(`Upserting audit logs: ${docs.length}`)
      await upsertBatched(AuditLogModel, docs)
    }

    if (await collectionExists('pmc_api_externalservicetoken')) {
      const rows = await fetchRaw('pmc_api_externalservicetoken')
      const docs = rows.map((row: any) => ({
        legacyId: row.id,
        serviceName: row.service_name || 'unknown',
        accessToken: row.access_token || '',
        expiresAt: row.expires_at || undefined,
        createdAt: row.created_at || undefined,
        updatedAt: row.updated_at || row.created_at || undefined,
      }))
      log(`Upserting external service tokens: ${docs.length}`)
      await upsertBatched(ExternalServiceTokenModel, docs)
    }

    if (await collectionExists('api_accesslog')) {
      const rows = await fetchRaw('api_accesslog')
      const docs = rows.map((row: any) => {
        const mappedUser = typeof row.user_id === 'number' ? userMap.get(row.user_id) : undefined
        return {
          legacyId: row.id,
          userId: mappedUser?.id,
          username: mappedUser?.username,
          modelName: row.model_name || undefined,
          objectId: row.object_id ? String(row.object_id) : undefined,
          method: row.method || undefined,
          ipAddress: row.ip_address || undefined,
          endpoint: row.endpoint || undefined,
          timestamp: row.timestamp || undefined,
          createdAt: row.timestamp || undefined,
          updatedAt: row.timestamp || undefined,
        }
      })
      log(`Upserting access logs: ${docs.length}`)
      await upsertBatched(AccessLogModel, docs)
    }
    if (await collectionExists('pmc_api_serviceconfiguration')) {
      const rows = await fetchRaw('pmc_api_serviceconfiguration')
      const docs = rows.map((row: any) => ({
        legacyId: row.id,
        serviceName: row.service_name || 'unknown',
        baseUrl: row.base_url || undefined,
        authEndpoint: row.auth_endpoint || undefined,
        generatePsidEndpoint: row.generate_psid_endpoint || undefined,
        transactionStatusEndpoint: row.transaction_status_endpoint || undefined,
        clientId: row.client_id || undefined,
        clientSecret: row.client_secret || undefined,
        createdAt: row.updated_at || undefined,
        updatedAt: row.updated_at || undefined,
      }))
      log(`Upserting service configurations: ${docs.length}`)
      await upsertBatched(ServiceConfigurationModel, docs)
    }
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

