/**
 * Week 5: Metrics Collection & Performance Tracking
 * Tracks API performance, database queries, cache hit rates, etc.
 */

export interface EndpointMetrics {
  path: string
  method: string
  count: number
  totalTime: number
  avgTime: number
  minTime: number
  maxTime: number
  errorCount: number
  errorRate: number
  lastUpdated: Date
}

export interface SystemMetrics {
  timestamp: Date
  uptime: number
  memoryUsage: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  cpuUsage: {
    user: number
    system: number
  }
  activeSockets: number
  activeHandles: number
}

export interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
  avgResponseTime: number
  lastUpdated: Date
}

export interface DatabaseMetrics {
  totalQueries: number
  totalTime: number
  avgTime: number
  slowQueries: number
  lastUpdated: Date
}

/**
 * Central metrics collection class
 * Tracks all performance metrics across the application
 */
export class MetricsCollector {
  private endpointMetrics: Map<string, EndpointMetrics> = new Map()
  private cacheMetrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    avgResponseTime: 0,
    lastUpdated: new Date(),
  }
  private dbMetrics: DatabaseMetrics = {
    totalQueries: 0,
    totalTime: 0,
    avgTime: 0,
    slowQueries: 0,
    lastUpdated: new Date(),
  }
  private systemMetrics: SystemMetrics[] = []
  private readonly maxHistorySize = 1000

  /**
   * Record endpoint request metrics
   */
  recordEndpointRequest(
    path: string,
    method: string,
    responseTime: number,
    isError: boolean = false
  ): void {
    const key = `${method} ${path}`
    let metrics = this.endpointMetrics.get(key)

    if (!metrics) {
      metrics = {
        path,
        method,
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errorCount: 0,
        errorRate: 0,
        lastUpdated: new Date(),
      }
      this.endpointMetrics.set(key, metrics)
    }

    metrics.count += 1
    metrics.totalTime += responseTime
    metrics.avgTime = metrics.totalTime / metrics.count
    metrics.minTime = Math.min(metrics.minTime, responseTime)
    metrics.maxTime = Math.max(metrics.maxTime, responseTime)

    if (isError) {
      metrics.errorCount += 1
      metrics.errorRate = metrics.errorCount / metrics.count
    }

    metrics.lastUpdated = new Date()
  }

  /**
   * Record cache hit/miss
   */
  recordCacheHit(responseTime: number): void {
    this.cacheMetrics.hits += 1
    this.updateCacheMetrics(responseTime)
  }

  recordCacheMiss(responseTime: number): void {
    this.cacheMetrics.misses += 1
    this.updateCacheMetrics(responseTime)
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(queryTime: number, isSlow: boolean = false): void {
    this.dbMetrics.totalQueries += 1
    this.dbMetrics.totalTime += queryTime
    this.dbMetrics.avgTime = this.dbMetrics.totalTime / this.dbMetrics.totalQueries

    if (isSlow) {
      this.dbMetrics.slowQueries += 1
    }

    this.dbMetrics.lastUpdated = new Date()
  }

  /**
   * Record system metrics
   */
  recordSystemMetrics(): void {
    const memUsage = process.memoryUsage()
    const uptime = process.uptime()

    const metrics: SystemMetrics = {
      timestamp: new Date(),
      uptime,
      memoryUsage: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      cpuUsage: process.cpuUsage(),
      activeSockets: -1, // Would need to count from net module
      activeHandles: -1, // Would need to count from active handles
    }

    this.systemMetrics.push(metrics)

    // Keep history size limited
    if (this.systemMetrics.length > this.maxHistorySize) {
      this.systemMetrics.shift()
    }
  }

  /**
   * Get all endpoint metrics
   */
  getEndpointMetrics(): EndpointMetrics[] {
    return Array.from(this.endpointMetrics.values())
      .sort((a, b) => b.totalTime - a.totalTime) // Sort by slowest first
  }

  /**
   * Get metrics for specific endpoint
   */
  getEndpointMetric(method: string, path: string): EndpointMetrics | null {
    const key = `${method} ${path}`
    return this.endpointMetrics.get(key) || null
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics(): CacheMetrics {
    const total = this.cacheMetrics.hits + this.cacheMetrics.misses
    return {
      ...this.cacheMetrics,
      hitRate: total > 0 ? this.cacheMetrics.hits / total : 0,
    }
  }

  /**
   * Get database metrics
   */
  getDatabaseMetrics(): DatabaseMetrics {
    return { ...this.dbMetrics }
  }

  /**
   * Get latest system metrics
   */
  getLatestSystemMetrics(): SystemMetrics | null {
    return this.systemMetrics.length > 0
      ? this.systemMetrics[this.systemMetrics.length - 1]
      : null
  }

  /**
   * Get system metrics history
   */
  getSystemMetricsHistory(limit: number = 100): SystemMetrics[] {
    const start = Math.max(0, this.systemMetrics.length - limit)
    return this.systemMetrics.slice(start)
  }

  /**
   * Get percentile for endpoint response time
   */
  getEndpointPercentile(method: string, path: string, percentile: number): number {
    const metric = this.getEndpointMetric(method, path)
    if (!metric || metric.count === 0) return 0

    // Rough estimate: avgTime ± stddev
    const avgTime = metric.avgTime
    const range = metric.maxTime - metric.minTime

    if (percentile <= 50) {
      return metric.minTime + (range * percentile) / 100
    } else {
      return metric.avgTime + (range * (percentile - 50)) / 100
    }
  }

  /**
   * Get summary dashboard data
   */
  getDashboardSummary() {
    const endpoints = this.getEndpointMetrics()
    const cache = this.getCacheMetrics()
    const db = this.getDatabaseMetrics()
    const system = this.getLatestSystemMetrics()

    return {
      summary: {
        totalEndpoints: endpoints.length,
        totalRequests: endpoints.reduce((sum, e) => sum + e.count, 0),
        totalErrors: endpoints.reduce((sum, e) => sum + e.errorCount, 0),
        avgResponseTime: endpoints.length > 0
          ? endpoints.reduce((sum, e) => sum + e.avgTime, 0) / endpoints.length
          : 0,
      },
      cache,
      database: {
        ...db,
        slowQueryRate: db.totalQueries > 0 ? db.slowQueries / db.totalQueries : 0,
      },
      system: system ? {
        uptime: system.uptime,
        memoryUsed: system.memoryUsage.heapUsed,
        memoryTotal: system.memoryUsage.heapTotal,
        memoryPercent: (system.memoryUsage.heapUsed / system.memoryUsage.heapTotal) * 100,
      } : null,
      endpoints: endpoints.slice(0, 10), // Top 10 slowest
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.endpointMetrics.clear()
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgResponseTime: 0,
      lastUpdated: new Date(),
    }
    this.dbMetrics = {
      totalQueries: 0,
      totalTime: 0,
      avgTime: 0,
      slowQueries: 0,
      lastUpdated: new Date(),
    }
    this.systemMetrics = []
  }

  /**
   * Private helper: update cache metrics
   */
  private updateCacheMetrics(responseTime: number): void {
    const total = this.cacheMetrics.hits + this.cacheMetrics.misses
    this.cacheMetrics.hitRate = this.cacheMetrics.hits / total
    this.cacheMetrics.avgResponseTime = responseTime // Simplified - would average properly
    this.cacheMetrics.lastUpdated = new Date()
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector()
