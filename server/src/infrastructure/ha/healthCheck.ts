/**
 * Week 7: Health Checks
 * Implements various health check strategies
 */

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
}

export interface HealthCheckResult {
  status: HealthStatus
  timestamp: number
  checks: Record<string, any>
  message?: string
  responseTimeMs?: number
}

export interface HealthCheckConfig {
  name: string
  timeoutMs?: number
  intervalMs?: number
}

/**
 * Base health check
 */
export abstract class HealthCheck {
  protected config: HealthCheckConfig

  constructor(config: HealthCheckConfig) {
    this.config = {
      timeoutMs: 5000,
      intervalMs: 30000,
      ...config,
    }
  }

  abstract check(): Promise<HealthCheckResult>

  getName(): string {
    return this.config.name
  }
}

/**
 * HTTP endpoint health check
 */
export class HttpHealthCheck extends HealthCheck {
  private url: string

  constructor(name: string, url: string, timeoutMs?: number) {
    super({ name, timeoutMs })
    this.url = url
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutHandle = setTimeout(() => controller.abort(), this.config.timeoutMs || 5000)

      const response = await fetch(this.url, {
        method: 'GET',
        signal: controller.signal,
      })

      clearTimeout(timeoutHandle)

      const responseTime = Date.now() - startTime
      const isHealthy = response.status >= 200 && response.status < 300

      return {
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        timestamp: Date.now(),
        checks: {
          httpStatus: response.status,
          responseTime: responseTime,
          url: this.url,
        },
        responseTimeMs: responseTime,
      }
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: Date.now(),
        checks: {
          error: (error as Error).message,
          url: this.url,
        },
        responseTimeMs: Date.now() - startTime,
      }
    }
  }
}

/**
 * Memory health check
 */
export class MemoryHealthCheck extends HealthCheck {
  private thresholdPercent: number

  constructor(name: string = 'memory', thresholdPercent: number = 85) {
    super({ name })
    this.thresholdPercent = thresholdPercent
  }

  async check(): Promise<HealthCheckResult> {
    const mem = process.memoryUsage()
    const heapUsedPercent = (mem.heapUsed / mem.heapTotal) * 100
    const rssPercent = (mem.rss / (require('os').totalmem() || 1)) * 100

    const status =
      heapUsedPercent > this.thresholdPercent || rssPercent > this.thresholdPercent
        ? HealthStatus.DEGRADED
        : HealthStatus.HEALTHY

    return {
      status,
      timestamp: Date.now(),
      checks: {
        heapUsedPercent: heapUsedPercent.toFixed(2),
        heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(2),
        heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2),
        rssPercent: rssPercent.toFixed(2),
        threshold: this.thresholdPercent,
      },
    }
  }
}

/**
 * Disk space health check
 */
export class DiskHealthCheck extends HealthCheck {
  private path: string
  private thresholdPercent: number

  constructor(name: string = 'disk', path: string = '/', thresholdPercent: number = 90) {
    super({ name })
    this.path = path
    this.thresholdPercent = thresholdPercent
  }

  async check(): Promise<HealthCheckResult> {
    try {
      const diskSpace = await this.getDiskSpace(this.path)

      if (!diskSpace) {
        return {
          status: HealthStatus.UNHEALTHY,
          timestamp: Date.now(),
          checks: { error: 'Unable to determine disk space' },
        }
      }

      const usedPercent = (diskSpace.used / diskSpace.total) * 100
      const status =
        usedPercent > this.thresholdPercent ? HealthStatus.DEGRADED : HealthStatus.HEALTHY

      return {
        status,
        timestamp: Date.now(),
        checks: {
          path: this.path,
          total: (diskSpace.total / 1024 / 1024 / 1024).toFixed(2),
          used: (diskSpace.used / 1024 / 1024 / 1024).toFixed(2),
          free: (diskSpace.free / 1024 / 1024 / 1024).toFixed(2),
          usedPercent: usedPercent.toFixed(2),
          threshold: this.thresholdPercent,
        },
      }
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: Date.now(),
        checks: { error: (error as Error).message },
      }
    }
  }

  private async getDiskSpace(
    path: string
  ): Promise<{ total: number; used: number; free: number } | null> {
    try {
      // Note: This is a simplified implementation
      // In production, use 'diskusage' or similar npm package
      return {
        total: 1000000000000, // 1TB placeholder
        used: 500000000000, // 500GB placeholder
        free: 500000000000, // 500GB placeholder
      }
    } catch {
      return null
    }
  }
}

/**
 * Database connection health check
 */
export class DatabaseHealthCheck extends HealthCheck {
  private connectionTest: () => Promise<boolean>

  constructor(name: string, connectionTest: () => Promise<boolean>) {
    super({ name })
    this.connectionTest = connectionTest
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      const isConnected = await this.connectionTest()
      const responseTime = Date.now() - startTime

      return {
        status: isConnected ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        timestamp: Date.now(),
        checks: {
          connected: isConnected,
          responseTime,
        },
        responseTimeMs: responseTime,
      }
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: Date.now(),
        checks: { error: (error as Error).message },
        responseTimeMs: Date.now() - startTime,
      }
    }
  }
}

/**
 * Health Check Aggregator
 */
export class HealthCheckAggregator {
  private checks: Map<string, { check: HealthCheck; lastResult?: HealthCheckResult }> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  addCheck(check: HealthCheck): void {
    this.checks.set(check.getName(), { check })
  }

  removeCheck(name: string): void {
    const interval = this.intervals.get(name)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(name)
    }
    this.checks.delete(name)
  }

  async runAllChecks(): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {}

    for (const [name, { check }] of this.checks) {
      try {
        const result = await check.check()
        results[name] = result
        this.checks.get(name)!.lastResult = result
      } catch (error) {
        results[name] = {
          status: HealthStatus.UNHEALTHY,
          timestamp: Date.now(),
          checks: { error: (error as Error).message },
        }
      }
    }

    return results
  }

  async getOverallStatus(): Promise<{
    status: HealthStatus
    results: Record<string, HealthCheckResult>
  }> {
    const results = await this.runAllChecks()

    // Overall status: HEALTHY if all healthy, DEGRADED if some degraded, UNHEALTHY if any unhealthy
    let overallStatus = HealthStatus.HEALTHY

    for (const result of Object.values(results)) {
      if (result.status === HealthStatus.UNHEALTHY) {
        overallStatus = HealthStatus.UNHEALTHY
        break
      }
      if (result.status === HealthStatus.DEGRADED && overallStatus === HealthStatus.HEALTHY) {
        overallStatus = HealthStatus.DEGRADED
      }
    }

    return { status: overallStatus, results }
  }

  startPeriodicChecks(intervalMs: number = 30000): void {
    for (const [name, { check }] of this.checks) {
      if (!this.intervals.has(name)) {
        const interval = setInterval(async () => {
          try {
            const result = await check.check()
            this.checks.get(name)!.lastResult = result
          } catch (error) {
            this.checks.get(name)!.lastResult = {
              status: HealthStatus.UNHEALTHY,
              timestamp: Date.now(),
              checks: { error: (error as Error).message },
            }
          }
        }, intervalMs)

        this.intervals.set(name, interval)
      }
    }
  }

  stopPeriodicChecks(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval)
    }
    this.intervals.clear()
  }

  getLastResults(): Record<string, HealthCheckResult | undefined> {
    const results: Record<string, HealthCheckResult | undefined> = {}
    for (const [name, { lastResult }] of this.checks) {
      results[name] = lastResult
    }
    return results
  }
}

// Default health check aggregator
export const healthCheckAggregator = new HealthCheckAggregator()
