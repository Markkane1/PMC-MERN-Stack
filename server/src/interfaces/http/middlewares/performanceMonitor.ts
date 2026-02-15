/**
 * Stage 2.4: Performance Monitoring Middleware
 * 
 * Middleware for Express to automatically track response times,
 * identify bottlenecks, and generate performance reports.
 */

import { Request, Response, NextFunction } from 'express'
import { RequestDurationTracker, Timer } from '../../../infrastructure/utils/performance'

/**
 * Performance monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean
  slowThreshold: number // Ms to report slow requests
  excludePatterns?: RegExp[] // URL patterns to exclude
  groupByPath?: boolean // Group stats by path
}

/**
 * Response time tracking middleware
 */
export class ResponseTimeMonitor {
  private tracker = new RequestDurationTracker()
  private config: MonitoringConfig
  private requestSamples: Array<{
    timestamp: Date
    endpoint: string
    method: string
    duration: number
    statusCode: number
  }> = []

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enabled: true,
      slowThreshold: 1000,
      excludePatterns: [/^\/health/, /^\/metrics/, /\.js$/, /\.css$/, /\.png$/],
      groupByPath: true,
      ...config,
    }
  }

  /**
   * Express middleware
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next()
      }

      // Check if URL should be excluded
      if (this.shouldExclude(req.path)) {
        return next()
      }

      const timer = new Timer()
      timer.start()
      const self = this

      // Intercept response
      const originalSend = res.send.bind(res)
      res.send = function (data: any) {
        timer.stop()
        const duration = timer.duration()

        // Record the request
        const endpoint = req.baseUrl + req.path
        self.tracker.record(endpoint, duration)

        // Store sample
        self.requestSamples.push({
          timestamp: new Date(),
          endpoint,
          method: req.method,
          duration,
          statusCode: res.statusCode,
        })

        // Keep only last 1000 samples
        if (self.requestSamples.length > 1000) {
          self.requestSamples.shift()
        }

        // Log slow requests
        if (duration > self.config.slowThreshold!) {
          console.warn(
            `[SLOW] ${req.method} ${endpoint} - ${duration.toFixed(2)}ms (threshold: ${self.config.slowThreshold}ms)`
          )
        }

        // Call original send
        return originalSend(data)
      } as any

      next()
    }
  }

  /**
   * Check if URL should be excluded from monitoring
   */
  private shouldExclude(path: string): boolean {
    return this.config.excludePatterns?.some((pattern) => pattern.test(path)) || false
  }

  /**
   * Get statistics for a specific operation
   */
  getStats() {
    return this.tracker.getAllStats()
  }

  /**
   * Get slow endpoints
   */
  getSlowEndpoints(threshold?: number): Array<{ endpoint: string; avgDuration: number }> {
    return this.tracker.getSlowEndpoints(threshold || this.config.slowThreshold)
  }

  /**
   * Get recent slow requests
   */
  getRecentSlowRequests(
    minutes: number = 5
  ): Array<{
    timestamp: Date
    endpoint: string
    method: string
    duration: number
    statusCode: number
  }> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return this.requestSamples.filter(
      (s) => s.timestamp > cutoff && s.duration > this.config.slowThreshold!
    )
  }

  /**
   * Get performance health score (0-100)
   */
  getHealthScore(): number {
    const stats = this.tracker.getAllStats()
    if (Object.keys(stats).length === 0) return 100

    const slowEndpoints = this.tracker.getSlowEndpoints(this.config.slowThreshold)
    const totalEndpoints = Object.keys(stats).length

    if (totalEndpoints === 0) return 100

    const slowPercentage = (slowEndpoints.length / totalEndpoints) * 100
    const healthScore = Math.max(0, 100 - slowPercentage * 2)

    return Math.round(healthScore)
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const stats = this.tracker.getAllStats()
    const slowEndpoints = this.tracker.getSlowEndpoints()
    const healthScore = this.getHealthScore()

    let report = '\n╔════════════════════════════════════════════════════════════════╗'
    report += '\n║            REAL-TIME PERFORMANCE REPORT                        ║'
    report += '\n╚════════════════════════════════════════════════════════════════╝\n'

    report += `⏱️  Health Score: ${healthScore}/100\n`
    report += `📊 Total Endpoints Monitored: ${Object.keys(stats).length}\n`
    report += `⚠️  Slow Endpoints (>${this.config.slowThreshold}ms): ${slowEndpoints.length}\n`
    report += `📈 Total Requests: ${Object.values(stats).reduce((sum: number, s: any) => sum + s.count, 0)}\n\n`

    report += 'TOP ENDPOINTS BY AVERAGE RESPONSE TIME:\n'
    report += '-'.repeat(80) + '\n'
    report += 'Endpoint'.padEnd(40) + ' | Avg(ms) | Count | Min(ms) | Max(ms)\n'
    report += '-'.repeat(80) + '\n'

    Object.entries(stats)
      .sort((a, b) => (b[1] as any).avg - (a[1] as any).avg)
      .slice(0, 10)
      .forEach(([endpoint, stat]) => {
        const s = stat as any
        report += endpoint.substring(0, 40).padEnd(40)
        report += ` | ${s.avg.toFixed(1).padStart(7)}`
        report += ` | ${String(s.count).padStart(5)}`
        report += ` | ${s.min.toFixed(1).padStart(7)}`
        report += ` | ${s.max.toFixed(1).padStart(7)}\n`
      })

    if (slowEndpoints.length > 0) {
      report += '\n⚠️  SLOW ENDPOINTS:\n'
      slowEndpoints.slice(0, 5).forEach((endpoint: any) => {
        report += `  • ${endpoint.endpoint}: ${endpoint.avgDuration.toFixed(2)}ms\n`
      })
    }

    return report
  }

  /**
   * Export metrics for analysis
   */
  export() {
    return {
      stats: this.tracker.getAllStats(),
      slowEndpoints: this.tracker.getSlowEndpoints(),
      healthScore: this.getHealthScore(),
      timestamp: new Date(),
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.tracker.clear()
    this.requestSamples = []
  }
}

/**
 * Endpoint statistics cache (for health check endpoints)
 */
export class PerformanceCache {
  private cache: any = null
  private lastUpdate: Date = new Date()
  private cacheTtl: number = 10000 // 10 seconds

  constructor(private monitor: ResponseTimeMonitor) {}

  /**
   * Get cached stats (or refresh if stale)
   */
  getStats() {
    const now = new Date()
    if (!this.cache || now.getTime() - this.lastUpdate.getTime() > this.cacheTtl) {
      this.cache = this.monitor.export()
      this.lastUpdate = now
    }
    return this.cache
  }

  /**
   * Invalidate cache
   */
  invalidate(): void {
    this.cache = null
  }
}

/**
 * Performance health check endpoint helper
 * 
 * Usage in Express:
 * app.get('/health/performance', (req, res) => {
 *   const status = performanceChecker.getHealthStatus();
 *   res.status(status.healthy ? 200 : 503).json(status);
 * });
 */
export class PerformanceHealthChecker {
  constructor(
    private monitor: ResponseTimeMonitor,
    private thresholds: {
      maxAvgResponseTime: number
      maxP95ResponseTime: number
      maxSlowEndpoints: number
    } = {
      maxAvgResponseTime: 1000,
      maxP95ResponseTime: 5000,
      maxSlowEndpoints: 5,
    }
  ) {}

  /**
   * Get health status
   */
  getHealthStatus(): {
    healthy: boolean
    status: string
    score: number
    checks: Record<string, boolean>
    details: Record<string, any>
  } {
    const stats = this.monitor.getStats()
    const slowEndpoints = this.monitor.getSlowEndpoints()

    const allValues = Object.values(stats)
    const allDurations = allValues.length > 0 ? allValues.flatMap((s: any) => Array(s.count).fill(s.avg)) : []
    const avgResponseTime =
      allDurations.length > 0 ? allDurations.reduce((a: number, b: number) => a + b) / allDurations.length : 0

    const p95Values = allValues.map((s: any) => s.p95).filter((v: any) => v !== undefined)
    const maxP95 = p95Values.length > 0 ? Math.max(...(p95Values as number[])) : 0

    const checks = {
      avgResponseTime: avgResponseTime < this.thresholds.maxAvgResponseTime,
      p95ResponseTime: maxP95 < this.thresholds.maxP95ResponseTime,
      slowEndpoints: slowEndpoints.length < this.thresholds.maxSlowEndpoints,
    }

    const healthy = Object.values(checks).every((check) => check)
    const score = this.monitor.getHealthScore()

    return {
      healthy,
      status: healthy ? 'healthy' : 'degraded',
      score,
      checks,
      details: {
        avgResponseTime: avgResponseTime.toFixed(2),
        maxP95ResponseTime: maxP95.toFixed(2),
        slowEndpointCount: slowEndpoints.length,
        monitoredEndpoints: Object.keys(stats).length,
        timestamp: new Date().toISOString(),
      },
    }
  }
}

export const monitoring = {
  ResponseTimeMonitor,
  PerformanceCache,
  PerformanceHealthChecker,
}
