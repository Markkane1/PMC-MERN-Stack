/**
 * Week 5: Monitoring Routes
 * Exposes metrics endpoints and dashboard
 */

import { Router, Request, Response } from 'express'
import { metricsCollector } from './metrics'
import { generatePrometheusMetrics } from './prometheus'
import { generatePerformanceReport, checkAlerts, AlertConfig } from './middleware'

export const monitoringRouter = Router()

/**
 * GET /monitoring/metrics
 * Prometheus metrics endpoint
 */
monitoringRouter.get('/metrics', (req: Request, res: Response) => {
  const metricsText = generatePrometheusMetrics()
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.send(metricsText)
})

/**
 * GET /monitoring/dashboard
 * JSON dashboard with all metrics
 */
monitoringRouter.get('/dashboard', (req: Request, res: Response) => {
  const dashboard = metricsCollector.getDashboardSummary()

  res.json({
    success: true,
    data: dashboard,
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /monitoring/health
 * Service health check
 */
monitoringRouter.get('/health', (req: Request, res: Response) => {
  const dashboard = metricsCollector.getDashboardSummary()
  const system = metricsCollector.getLatestSystemMetrics()

  const isHealthy =
    dashboard.summary.totalRequests > 0 &&
    dashboard.summary.avgResponseTime < 5000 && // <5s avg response
    (!dashboard.system || dashboard.system.memoryPercent < 90) // <90% memory

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    uptime: system?.uptime || 0,
    memory: dashboard.system || null,
    requests: dashboard.summary.totalRequests,
  })
})

/**
 * GET /monitoring/endpoints
 * Detailed endpoint statistics
 */
monitoringRouter.get('/endpoints', (req: Request, res: Response) => {
  const endpoints = metricsCollector.getEndpointMetrics()

  // Sort by totalTime descending
  const sorted = endpoints.sort((a, b) => b.totalTime - a.totalTime)

  res.json({
    success: true,
    count: sorted.length,
    data: sorted,
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /monitoring/endpoints/:method/:path
 * Specific endpoint metrics
 */
monitoringRouter.get('/endpoints/:method/*', (req: Request, res: Response) => {
  const method = req.params.method.toUpperCase()
  const path = `/${req.params[0]}`

  const metric = metricsCollector.getEndpointMetric(method, path)

  if (!metric) {
    return res.status(404).json({
      success: false,
      message: `No metrics for ${method} ${path}`,
    })
  }

  res.json({
    success: true,
    data: {
      ...metric,
      p50: metricsCollector.getEndpointPercentile(method, path, 50),
      p95: metricsCollector.getEndpointPercentile(method, path, 95),
      p99: metricsCollector.getEndpointPercentile(method, path, 99),
    },
  })
})

/**
 * GET /monitoring/cache
 * Cache statistics
 */
monitoringRouter.get('/cache', (req: Request, res: Response) => {
  const cache = metricsCollector.getCacheMetrics()

  res.json({
    success: true,
    data: {
      ...cache,
      hitRate: (cache.hitRate * 100).toFixed(2) + '%',
    },
    timestamp: cache.lastUpdated,
  })
})

/**
 * GET /monitoring/database
 * Database statistics
 */
monitoringRouter.get('/database', (req: Request, res: Response) => {
  const db = metricsCollector.getDatabaseMetrics()

  res.json({
    success: true,
    data: {
      ...db,
      slowQueryRate: db.totalQueries > 0
        ? ((db.slowQueries / db.totalQueries) * 100).toFixed(2) + '%'
        : '0%',
    },
    timestamp: db.lastUpdated,
  })
})

/**
 * GET /monitoring/system
 * System resource metrics
 */
monitoringRouter.get('/system', (req: Request, res: Response) => {
  const system = metricsCollector.getLatestSystemMetrics()
  const history = metricsCollector.getSystemMetricsHistory(
    parseInt(req.query.limit as string) || 50
  )

  if (!system) {
    return res.status(404).json({
      success: false,
      message: 'No system metrics collected yet',
    })
  }

  res.json({
    success: true,
    current: {
      timestamp: system.timestamp,
      uptime: system.uptime,
      memory: {
        heapUsed: system.memoryUsage.heapUsed,
        heapTotal: system.memoryUsage.heapTotal,
        heapPercent: (
          (system.memoryUsage.heapUsed / system.memoryUsage.heapTotal) *
          100
        ).toFixed(2),
        external: system.memoryUsage.external,
        rss: system.memoryUsage.rss,
      },
      cpu: system.cpuUsage,
    },
    history,
  })
})

/**
 * GET /monitoring/report
 * Pretty printed performance report
 */
monitoringRouter.get('/report', (req: Request, res: Response) => {
  const report = generatePerformanceReport()

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.send(report)
})

/**
 * GET /monitoring/alerts
 * Check for configured alerts
 */
monitoringRouter.get('/alerts', (req: Request, res: Response) => {
  const config: AlertConfig = {
    highErrorRate: parseFloat(req.query.errorRate as string) || 5, // 5%
    slowP95ResponseTime: parseFloat(req.query.p95Time as string) || 1000, // 1s
    highMemoryUsage: parseFloat(req.query.memory as string) || 85, // 85%
    slowDatabaseQueries: parseInt(req.query.slowQueries as string) || 100,
  }

  const alerts = checkAlerts(config)

  res.json({
    success: true,
    alerts,
    alertCount: alerts.length,
    hasAlerts: alerts.length > 0,
    timestamp: new Date().toISOString(),
  })
})

/**
 * POST /monitoring/reset
 * Reset all metrics (requires auth in production)
 */
monitoringRouter.post('/reset', (req: Request, res: Response) => {
  // TODO: Add authentication check in production
  metricsCollector.reset()

  res.json({
    success: true,
    message: 'Metrics reset successfully',
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /monitoring/summary
 * Quick summary of key metrics
 */
monitoringRouter.get('/summary', (req: Request, res: Response) => {
  const summary = metricsCollector.getDashboardSummary()

  res.json({
    success: true,
    data: {
      requests: summary.summary.totalRequests,
      errors: summary.summary.totalErrors,
      avgResponseTime: `${summary.summary.avgResponseTime.toFixed(0)}ms`,
      cacheHitRate: `${(summary.cache.hitRate * 100).toFixed(1)}%`,
      totalQueries: summary.database.totalQueries,
      avgQueryTime: `${summary.database.avgTime.toFixed(1)}ms`,
      memory: summary.system
        ? `${summary.system.memoryPercent.toFixed(0)}%`
        : 'N/A',
    },
    timestamp: new Date().toISOString(),
  })
})
