import { ApiLogModel } from '../../infrastructure/database/models/common/ApiLog'
import { AuditLogModel } from '../../infrastructure/database/models/common/AuditLog'
import { AccessLogModel } from '../../infrastructure/database/models/common/AccessLog'

export async function logApiCall(params: {
  serviceName: string
  endpoint: string
  requestData?: Record<string, unknown>
  responseData?: Record<string, unknown>
  statusCode?: number
}) {
  try {
    await ApiLogModel.create({
      serviceName: params.serviceName,
      endpoint: params.endpoint,
      requestData: params.requestData,
      responseData: params.responseData,
      statusCode: params.statusCode,
    })
  } catch {
    // best-effort logging
  }
}

export async function logAudit(params: {
  userId?: string
  username?: string
  action: string
  modelName?: string
  objectId?: string
  description?: string
  ipAddress?: string
  timestamp?: Date
}) {
  try {
    await AuditLogModel.create({
      userId: params.userId,
      username: params.username,
      action: params.action,
      modelName: params.modelName,
      objectId: params.objectId,
      description: params.description,
      ipAddress: params.ipAddress,
      timestamp: params.timestamp || new Date(),
    })
  } catch {
    // best-effort logging
  }
}

export async function logAccess(params: {
  userId?: string
  username?: string
  modelName?: string
  objectId?: string
  method?: string
  ipAddress?: string
  endpoint?: string
  timestamp?: Date
}) {
  try {
    await AccessLogModel.create({
      userId: params.userId,
      username: params.username,
      modelName: params.modelName,
      objectId: params.objectId,
      method: params.method,
      ipAddress: params.ipAddress,
      endpoint: params.endpoint,
      timestamp: params.timestamp || new Date(),
    })
  } catch {
    // best-effort logging
  }
}
