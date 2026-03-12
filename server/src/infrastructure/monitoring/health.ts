import mongoose from 'mongoose'
import { cacheManager } from '../cache/cacheManager'
import { metricsCollector } from './metrics'
import { ServiceConfigurationModel } from '../database/models/common/ServiceConfiguration'
import { plmisService } from '../../application/services/pmc/PLMISService'

type ServiceHealth = {
  required: boolean
  healthy: boolean | null
  status: 'healthy' | 'degraded' | 'unhealthy' | 'not_configured'
  message?: string
}

type MonitoringHealthReport = {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  httpStatus: 200 | 503
  memory: {
    heapUsed: number
    heapTotal: number
    memoryPercent: number
    criticalThresholdPercent: number
  }
  requiredServices: {
    mongodb: ServiceHealth
  }
  optionalServices: {
    redis: ServiceHealth & { mode?: 'redis' | 'lru-fallback' }
    plmis: ServiceHealth
  }
  requests: number
}

const CRITICAL_MEMORY_THRESHOLD_PERCENT = 95
const OPTIONAL_TIMEOUT_MS = 1500

function timeoutAfter(ms: number) {
  return new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), ms)
  })
}

async function checkPlmisHealth(mongoHealthy: boolean): Promise<ServiceHealth> {
  if (!mongoHealthy) {
    return {
      required: false,
      healthy: null,
      status: 'not_configured',
      message: 'Skipped because MongoDB is unavailable.',
    }
  }

  const config = await ServiceConfigurationModel.findOne({
    $or: [{ serviceName: 'ePay' }, { service_name: 'ePay' }],
  } as any)
    .lean()
    .exec()

  const explicitlyConfigured = Boolean(
    process.env.PLMIS_API_URL ||
      process.env.PLMIS_API_KEY ||
      config?.authEndpoint ||
      (config as any)?.auth_endpoint ||
      config?.generatePsidEndpoint ||
      (config as any)?.generate_psid_endpoint
  )

  if (!explicitlyConfigured || process.env.NODE_ENV === 'test') {
    return {
      required: false,
      healthy: null,
      status: 'not_configured',
      message: explicitlyConfigured
        ? 'PLMIS connectivity checks are skipped in test mode.'
        : 'PLMIS is not configured.',
    }
  }

  const healthy = await Promise.race([
    plmisService.validateConnection(),
    timeoutAfter(OPTIONAL_TIMEOUT_MS),
  ])

  return healthy
    ? {
        required: false,
        healthy: true,
        status: 'healthy',
      }
    : {
        required: false,
        healthy: false,
        status: 'degraded',
        message: 'PLMIS health check failed or timed out.',
      }
}

export async function buildMonitoringHealthReport(): Promise<MonitoringHealthReport> {
  const dashboard = metricsCollector.getDashboardSummary()
  const system = metricsCollector.getLatestSystemMetrics()
  const uptime = system?.uptime || process.uptime()
  const memoryUsage = system?.memoryUsage || process.memoryUsage()
  const heapTotal = Math.max(memoryUsage.heapTotal || 0, 1)
  const memoryPercent = (memoryUsage.heapUsed / heapTotal) * 100

  const mongoHealthy = mongoose.connection.readyState === 1
  const memoryCritical = memoryPercent > CRITICAL_MEMORY_THRESHOLD_PERCENT
  const redisConfigured = Boolean(process.env.REDIS_HOST)
  const redisHealthy = redisConfigured ? await cacheManager.isHealthy() : false

  const requiredServices = {
    mongodb: mongoHealthy
      ? {
          required: true,
          healthy: true,
          status: 'healthy' as const,
        }
      : {
          required: true,
          healthy: false,
          status: 'unhealthy' as const,
          message: 'MongoDB connection is unavailable.',
        },
  }

  const optionalServices = {
    redis: redisConfigured
      ? ({
          required: false,
          healthy: redisHealthy,
          status: redisHealthy ? 'healthy' : 'degraded',
          mode: 'redis',
          ...(redisHealthy ? {} : { message: 'Redis health check failed.' }),
        } as const)
      : ({
          required: false,
          healthy: false,
          status: 'degraded',
          mode: 'lru-fallback',
          message: 'Redis is not configured; using in-memory LRU fallback.',
        } as const),
    plmis: await checkPlmisHealth(mongoHealthy),
  }

  const hasCriticalFailure = !mongoHealthy || memoryCritical
  const hasOptionalDegradation = Object.values(optionalServices).some(
    (service) => service.status === 'degraded'
  )

  const status = hasCriticalFailure
    ? 'unhealthy'
    : hasOptionalDegradation
      ? 'degraded'
      : 'healthy'

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime,
    httpStatus: hasCriticalFailure ? 503 : 200,
    memory: {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      memoryPercent,
      criticalThresholdPercent: CRITICAL_MEMORY_THRESHOLD_PERCENT,
    },
    requiredServices,
    optionalServices,
    requests: dashboard.summary.totalRequests,
  }
}
