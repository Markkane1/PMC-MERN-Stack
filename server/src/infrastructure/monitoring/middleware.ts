/**
 * Week 5: Monitoring Middleware
 * Hooks into request/response lifecycle to collect metrics
 */

import { Request, Response, NextFunction } from 'express'
import { metricsCollector } from './metrics'

/**
 * Request monitoring middleware
 * Tracks response time, cache hits/misses, errors
 */
export function monitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()
  const startMemory = process.memoryUsage().heapUsed

  // Store start time for other middlewares
  ;(req as any).startTime = startTime

  // Override send/json to capture response
  const originalSend = res.send.bind(res)
  const originalJson = res.json.bind(res)

  res.send = ((data: any) => {
    const responseTime = Date.now() - startTime
    const isError = res.statusCode >= 400

    // Record endpoint metrics
    metricsCollector.recordEndpointRequest(req.path, req.method, responseTime, isError)

    // Add response time header
    res.setHeader('X-Response-Time', `${responseTime}ms`)

    // Record memory usage
    const endMemory = process.memoryUsage().heapUsed
    const memoryDelta = endMemory - startMemory
    if (memoryDelta > 0.5 * 1024 * 1024) { // >0.5MB increase
      res.setHeader('X-Memory-Delta', `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`)
    }

    return originalSend(data)
  }) as any

  res.json = ((data: any) => {
    const responseTime = Date.now() - startTime
    const isError = res.statusCode >= 400

    metricsCollector.recordEndpointRequest(req.path, req.method, responseTime, isError)
    res.setHeader('X-Response-Time', `${responseTime}ms`)

    return originalJson(data)
  }) as any

  next()
}

/**
 * System metrics collection middleware
 * Records system stats at regular intervals
 */
export class SystemMetricsCollector {
  private interval: NodeJS.Timeout | null = null
  private readonly intervalMs: number

  constructor(intervalMs: number = 10000) { // 10 seconds default
    this.intervalMs = intervalMs
  }

  start(): void {
    if (this.interval) return

    this.interval = setInterval(() => {
      metricsCollector.recordSystemMetrics()
    }, this.intervalMs)

    // Unref so it doesn't keep the process alive
    this.interval.unref()
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}

/**
 * Database query monitoring helper
 * Call from database query interceptor
 */
export function recordDatabaseMetric(
  queryTime: number,
  slowThreshold: number = 100 // 100ms
): void {
  const isSlow = queryTime > slowThreshold
  metricsCollector.recordDatabaseQuery(queryTime, isSlow)
}

/**
 * Cache monitoring helper
 * Call from cache hit/miss handlers
 */
export function recordCacheHit(responseTime: number): void {
  metricsCollector.recordCacheHit(responseTime)
}

export function recordCacheMiss(responseTime: number): void {
  metricsCollector.recordCacheMiss(responseTime)
}

/**
 * Alert checking helper
 * Returns alerts based on thresholds
 */
export interface AlertConfig {
  highErrorRate?: number // percentage
  slowP95ResponseTime?: number // milliseconds
  highMemoryUsage?: number // percentage
  slowDatabaseQueries?: number // count
}

export function checkAlerts(config: AlertConfig = {}): string[] {
  const alerts: string[] = []
  const dashboard = metricsCollector.getDashboardSummary()

  // High error rate alert
  if (config.highErrorRate !== undefined) {
    const totalRequests = dashboard.summary.totalRequests
    if (totalRequests > 0) {
      const errorRate = (dashboard.summary.totalErrors / totalRequests) * 100
      if (errorRate > config.highErrorRate) {
        alerts.push(
          `⚠️ HIGH_ERROR_RATE: ${errorRate.toFixed(2)}% (threshold: ${config.highErrorRate}%)`
        )
      }
    }
  }

  // High response time alert (P95)
  if (config.slowP95ResponseTime !== undefined) {
    const avgResponseTime = dashboard.summary.avgResponseTime
    if (avgResponseTime > config.slowP95ResponseTime) {
      alerts.push(
        `⚠️ SLOW_RESPONSE_TIME: ${avgResponseTime.toFixed(2)}ms (threshold: ${config.slowP95ResponseTime}ms)`
      )
    }
  }

  // High memory usage alert
  if (config.highMemoryUsage !== undefined && dashboard.system) {
    if (dashboard.system.memoryPercent > config.highMemoryUsage) {
      alerts.push(
        `⚠️ HIGH_MEMORY_USAGE: ${dashboard.system.memoryPercent.toFixed(2)}% (threshold: ${config.highMemoryUsage}%)`
      )
    }
  }

  // Slow database queries alert
  if (config.slowDatabaseQueries !== undefined) {
    if (dashboard.database.slowQueries > config.slowDatabaseQueries) {
      alerts.push(
        `⚠️ SLOW_QUERIES: ${dashboard.database.slowQueries} slow queries (threshold: ${config.slowDatabaseQueries})`
      )
    }
  }

  return alerts
}

/**
 * Performance report generator
 */
export function generatePerformanceReport(): string {
  const dashboard = metricsCollector.getDashboardSummary()
  const lines: string[] = []

  lines.push('╔════════════════════════════════════════════════════════════════╗')
  lines.push('║           PERFORMANCE MONITORING REPORT                        ║')
  lines.push('╚════════════════════════════════════════════════════════════════╝')

  lines.push('')
  lines.push('📊 SUMMARY')
  lines.push('─'.repeat(60))
  lines.push(`   Total Endpoints:      ${dashboard.summary.totalEndpoints}`)
  lines.push(`   Total Requests:       ${dashboard.summary.totalRequests}`)
  lines.push(`   Total Errors:         ${dashboard.summary.totalErrors}`)
  lines.push(
    `   Avg Response Time:    ${dashboard.summary.avgResponseTime.toFixed(2)}ms`
  )

  lines.push('')
  lines.push('💾 CACHE')
  lines.push('─'.repeat(60))
  lines.push(`   Hits:                 ${dashboard.cache.hits}`)
  lines.push(`   Misses:               ${dashboard.cache.misses}`)
  lines.push(`   Hit Rate:             ${(dashboard.cache.hitRate * 100).toFixed(2)}%`)

  lines.push('')
  lines.push('🗄️  DATABASE')
  lines.push('─'.repeat(60))
  lines.push(`   Total Queries:        ${dashboard.database.totalQueries}`)
  lines.push(`   Avg Query Time:       ${dashboard.database.avgTime.toFixed(2)}ms`)
  lines.push(`   Slow Queries:         ${dashboard.database.slowQueries}`)
  lines.push(
    `   Slow Query Rate:      ${(dashboard.database.slowQueryRate * 100).toFixed(2)}%`
  )

  if (dashboard.system) {
    lines.push('')
    lines.push('🖥️  SYSTEM')
    lines.push('─'.repeat(60))
    lines.push(`   Uptime:               ${dashboard.system.uptime.toFixed(2)}s`)
    lines.push(`   Memory Used:          ${(dashboard.system.memoryUsed / 1024 / 1024).toFixed(2)}MB`)
    lines.push(`   Memory Total:         ${(dashboard.system.memoryTotal / 1024 / 1024).toFixed(2)}MB`)
    lines.push(`   Memory Usage:         ${dashboard.system.memoryPercent.toFixed(2)}%`)
  }

  if (dashboard.endpoints.length > 0) {
    lines.push('')
    lines.push('🐢 TOP 10 SLOWEST ENDPOINTS')
    lines.push('─'.repeat(60))
    dashboard.endpoints.slice(0, 10).forEach((ep, idx) => {
      lines.push(
        `   ${idx + 1}. ${ep.method.padEnd(6)} ${ep.path.padEnd(30)} ${ep.avgTime.toFixed(2)}ms (${ep.count} reqs)`
      )
    })
  }

  lines.push('')
  lines.push('═'.repeat(60))

  return lines.join('\n')
}
