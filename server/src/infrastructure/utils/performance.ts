/**
 * Stage 2.4: Performance Profiling & Metrics Collection
 * 
 * Utilities to measure, track, and analyze application performance.
 * Used to identify bottlenecks and validate optimization improvements.
 */

import { performance } from 'perf_hooks'

/**
 * Performance metrics for a single operation
 */
export interface PerformanceMetrics {
  name: string
  duration: number
  startTime: number
  endTime: number
  memory: {
    heapUsed: number
    heapTotal: number
    external: number
  }
}

/**
 * Aggregated performance statistics
 */
export interface PerformanceStats {
  name: string
  count: number
  totalDuration: number
  avgDuration: number
  minDuration: number
  maxDuration: number
  stdDev: number
  p50: number
  p95: number
  p99: number
  memoryAvg: {
    heapUsed: number
    heapTotal: number
    external: number
  }
}

/**
 * Load test result summary
 */
export interface LoadTestResult {
  testName: string
  timestamp: Date
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  totalDuration: number
  avgResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  rps: number // Requests per second
  errors: Array<{ request: number; error: string }>
  slowRequests: Array<{ request: number; duration: number; endpoint: string }>
  memoryStats: {
    initialHeap: number
    peakHeap: number
    finalHeap: number
  }
}

/**
 * Simple timer for measuring operation duration
 */
export class Timer {
  private startTime: number = 0
  private endTime: number = 0

  start(): Timer {
    this.startTime = performance.now()
    return this
  }

  stop(): Timer {
    this.endTime = performance.now()
    return this
  }

  duration(): number {
    return this.endTime - this.startTime
  }

  reset(): Timer {
    this.startTime = 0
    this.endTime = 0
    return this
  }
}

/**
 * Performance profiler for tracking multiple operations
 */
export class PerformanceProfiler {
  private metrics: Map<string, PerformanceMetrics[]> = new Map()

  /**
   * Measure an operation and record its performance
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const startTime = performance.now()
    const startMemory = process.memoryUsage()

    try {
      const result = await fn()
      const endTime = performance.now()
      const endMemory = process.memoryUsage()

      const metrics: PerformanceMetrics = {
        name,
        duration: endTime - startTime,
        startTime,
        endTime,
        memory: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal,
          external: endMemory.external,
        },
      }

      if (!this.metrics.has(name)) {
        this.metrics.set(name, [])
      }
      this.metrics.get(name)!.push(metrics)

      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(name: string): PerformanceStats | null {
    const operationMetrics = this.metrics.get(name)
    if (!operationMetrics || operationMetrics.length === 0) return null

    const durations = operationMetrics.map((m) => m.duration).sort((a, b) => a - b)
    const count = durations.length
    const totalDuration = durations.reduce((a, b) => a + b, 0)
    const avgDuration = totalDuration / count
    const minDuration = durations[0]
    const maxDuration = durations[count - 1]

    // Calculate standard deviation
    const variance =
      durations.reduce((sum, duration) => sum + Math.pow(duration - avgDuration, 2), 0) / count
    const stdDev = Math.sqrt(variance)

    // Calculate percentiles
    const p50 = durations[Math.floor(count * 0.5)]
    const p95 = durations[Math.floor(count * 0.95)]
    const p99 = durations[Math.floor(count * 0.99)]

    // Average memory usage
    const memoryAvg = {
      heapUsed: operationMetrics.reduce((sum, m) => sum + m.memory.heapUsed, 0) / count,
      heapTotal: operationMetrics.reduce((sum, m) => sum + m.memory.heapTotal, 0) / count,
      external: operationMetrics.reduce((sum, m) => sum + m.memory.external, 0) / count,
    }

    return {
      name,
      count,
      totalDuration,
      avgDuration,
      minDuration,
      maxDuration,
      stdDev,
      p50,
      p95,
      p99,
      memoryAvg,
    }
  }

  /**
   * Get all statistics
   */
  getAllStats(): PerformanceStats[] {
    return Array.from(this.metrics.keys())
      .map((name) => this.getStats(name))
      .filter((stat) => stat !== null) as PerformanceStats[]
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    const allStats = this.getAllStats()
    if (allStats.length === 0) return 'No performance data collected'

    let report = '\n=== PERFORMANCE REPORT ===\n\n'

    allStats.forEach((stats) => {
      report += `Operation: ${stats.name}\n`
      report += `-`.repeat(50) + '\n'
      report += `Count:        ${stats.count}\n`
      report += `Total:        ${stats.totalDuration.toFixed(2)}ms\n`
      report += `Average:      ${stats.avgDuration.toFixed(2)}ms\n`
      report += `Min:          ${stats.minDuration.toFixed(2)}ms\n`
      report += `Max:          ${stats.maxDuration.toFixed(2)}ms\n`
      report += `Std Dev:      ${stats.stdDev.toFixed(2)}ms\n`
      report += `P50:          ${stats.p50.toFixed(2)}ms (median)\n`
      report += `P95:          ${stats.p95.toFixed(2)}ms\n`
      report += `P99:          ${stats.p99.toFixed(2)}ms\n`
      report += `Avg Heap:     ${(stats.memoryAvg.heapUsed / 1024 / 1024).toFixed(2)}MB\n`
      report += '\n'
    })

    return report
  }

  /**
   * Clear all collected metrics
   */
  clear(): void {
    this.metrics.clear()
  }

  /**
   * Export metrics as JSON for analysis
   */
  export(): Record<string, PerformanceStats[]> {
    const result: Record<string, PerformanceStats[]> = {}
    this.metrics.forEach((metrics, name) => {
      const operationMetrics = this.getStats(name)
      if (operationMetrics) {
        result[name] = [operationMetrics]
      }
    })
    return result
  }
}

/**
 * Memory profiler to detect memory leaks
 */
export class MemoryProfiler {
  private snapshots: Array<{
    timestamp: Date
    heapUsed: number
    heapTotal: number
    external: number
  }> = []

  /**
   * Take a memory snapshot
   */
  snapshot(label?: string): void {
    const memory = process.memoryUsage()
    this.snapshots.push({
      timestamp: new Date(),
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
    })
    if (label) {
      console.log(`[Memory] ${label}: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
    }
  }

  /**
   * Get memory trend (growth over time)
   */
  getTrend(): {
    startHeap: number
    endHeap: number
    growthPercentage: number
    growthMB: number
  } | null {
    if (this.snapshots.length < 2) return null

    const start = this.snapshots[0].heapUsed
    const end = this.snapshots[this.snapshots.length - 1].heapUsed
    const growthBytes = end - start
    const growthMB = growthBytes / 1024 / 1024
    const growthPercentage = (growthBytes / start) * 100

    return {
      startHeap: start,
      endHeap: end,
      growthPercentage,
      growthMB,
    }
  }

  /**
   * Detect potential memory leaks
   */
  detectMemoryLeak(): boolean {
    const trend = this.getTrend()
    if (!trend) return false
    // Flag as potential leak if heap grows more than 50%
    return trend.growthPercentage > 50
  }

  /**
   * Generate memory report
   */
  generateReport(): string {
    if (this.snapshots.length === 0) return 'No memory snapshots taken'

    let report = '\n=== MEMORY PROFILE ===\n\n'

    this.snapshots.forEach((snapshot, i) => {
      report += `Snapshot ${i + 1}: ${snapshot.timestamp.toISOString()}\n`
      report += `  Heap Used:  ${(snapshot.heapUsed / 1024 / 1024).toFixed(2)}MB\n`
      report += `  Heap Total: ${(snapshot.heapTotal / 1024 / 1024).toFixed(2)}MB\n`
      report += `  External:   ${(snapshot.external / 1024 / 1024).toFixed(2)}MB\n`
    })

    const trend = this.getTrend()
    if (trend) {
      report += `\nMemory Growth: ${trend.growthMB.toFixed(2)}MB (${trend.growthPercentage.toFixed(1)}%)\n`
      if (this.detectMemoryLeak()) {
        report += '⚠️  WARNING: Potential memory leak detected!\n'
      }
    }

    return report
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots = []
  }
}

/**
 * Request duration tracker (for integrating with Express middleware)
 */
export class RequestDurationTracker {
  private durations: Map<string, number[]> = new Map()

  /**
   * Record a request duration for an endpoint
   */
  record(endpoint: string, duration: number): void {
    if (!this.durations.has(endpoint)) {
      this.durations.set(endpoint, [])
    }
    this.durations.get(endpoint)!.push(duration)
  }

  /**
   * Get statistics for an endpoint
   */
  getEndpointStats(endpoint: string): {
    count: number
    avg: number
    min: number
    max: number
    p95: number
  } | null {
    const durations = this.durations.get(endpoint)
    if (!durations || durations.length === 0) return null

    const sorted = [...durations].sort((a, b) => a - b)
    const count = sorted.length
    const avg = sorted.reduce((a, b) => a + b, 0) / count
    const min = sorted[0]
    const max = sorted[count - 1]
    const p95 = sorted[Math.floor(count * 0.95)]

    return { count, avg, min, max, p95 }
  }

  /**
   * Get all endpoint statistics
   */
  getAllStats(): Record<
    string,
    {
      count: number
      avg: number
      min: number
      max: number
      p95: number
    }
  > {
    const result: Record<string, any> = {}
    this.durations.forEach((_, endpoint) => {
      const stats = this.getEndpointStats(endpoint)
      if (stats) {
        result[endpoint] = stats
      }
    })
    return result
  }

  /**
   * Find slow endpoints (above threshold)
   */
  getSlowEndpoints(thresholdMs: number = 1000): Array<{
    endpoint: string
    avgDuration: number
  }> {
    const stats = this.getAllStats()
    return Object.entries(stats)
      .filter(([_, stat]) => stat.avg > thresholdMs)
      .map(([endpoint, stat]) => ({
        endpoint,
        avgDuration: stat.avg,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
  }

  /**
   * Generate a report table
   */
  generateReport(): string {
    const allStats = this.getAllStats()
    if (Object.keys(allStats).length === 0) {
      return 'No request duration data collected'
    }

    let report = '\n=== REQUEST DURATION REPORT ===\n\n'
    report += 'Endpoint'.padEnd(40) + ' | Count | Avg(ms) | Min(ms) | Max(ms) | P95(ms)\n'
    report += '-'.repeat(100) + '\n'

    Object.entries(allStats)
      .sort((a, b) => b[1].avg - a[1].avg)
      .forEach(([endpoint, stats]) => {
        report += endpoint.padEnd(40)
        report += ' | ' + String(stats.count).padStart(5)
        report += ' | ' + stats.avg.toFixed(1).padStart(7)
        report += ' | ' + stats.min.toFixed(1).padStart(7)
        report += ' | ' + stats.max.toFixed(1).padStart(7)
        report += ' | ' + stats.p95.toFixed(1).padStart(7) + '\n'
      })

    const slowEndpoints = this.getSlowEndpoints()
    if (slowEndpoints.length > 0) {
      report += '\n⚠️  SLOW ENDPOINTS (>1000ms avg):\n'
      slowEndpoints.forEach((endpoint) => {
        report += `  ${endpoint.endpoint}: ${endpoint.avgDuration.toFixed(2)}ms\n`
      })
    }

    return report
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.durations.clear()
  }
}

/**
 * Export all for easy importing
 */
export const profiling = {
  Timer,
  PerformanceProfiler,
  MemoryProfiler,
  RequestDurationTracker,
}
