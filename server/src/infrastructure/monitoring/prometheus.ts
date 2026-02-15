/**
 * Week 5: Prometheus Metrics Exporter
 * Exposes metrics in Prometheus format for scraping
 */

import { metricsCollector } from './metrics'

export interface PrometheusMetric {
  name: string
  help: string
  type: 'counter' | 'gauge' | 'histogram' | 'summary'
  samples: Array<{ labels: Record<string, string>; value: number | string }>
}

/**
 * Generate Prometheus-formatted metrics
 */
export function generatePrometheusMetrics(): string {
  const lines: string[] = []

  // Endpoint metrics
  const endpoints = metricsCollector.getEndpointMetrics()

  lines.push('# HELP http_requests_total Total number of HTTP requests')
  lines.push('# TYPE http_requests_total counter')
  endpoints.forEach((endpoint) => {
    lines.push(
      `http_requests_total{method="${endpoint.method}",path="${endpoint.path}"} ${endpoint.count}`
    )
  })

  lines.push('')
  lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds')
  lines.push('# TYPE http_request_duration_seconds gauge')
  endpoints.forEach((endpoint) => {
    lines.push(
      `http_request_duration_seconds{method="${endpoint.method}",path="${endpoint.path}",quantile="avg"} ${(endpoint.avgTime / 1000).toFixed(4)}`
    )
    lines.push(
      `http_request_duration_seconds{method="${endpoint.method}",path="${endpoint.path}",quantile="min"} ${(endpoint.minTime / 1000).toFixed(4)}`
    )
    lines.push(
      `http_request_duration_seconds{method="${endpoint.method}",path="${endpoint.path}",quantile="max"} ${(endpoint.maxTime / 1000).toFixed(4)}`
    )
  })

  lines.push('')
  lines.push('# HELP http_requests_errors_total Total number of HTTP request errors')
  lines.push('# TYPE http_requests_errors_total counter')
  endpoints.filter((e) => e.errorCount > 0).forEach((endpoint) => {
    lines.push(
      `http_requests_errors_total{method="${endpoint.method}",path="${endpoint.path}"} ${endpoint.errorCount}`
    )
  })

  // Cache metrics
  const cache = metricsCollector.getCacheMetrics()

  lines.push('')
  lines.push('# HELP cache_hits_total Total number of cache hits')
  lines.push('# TYPE cache_hits_total counter')
  lines.push(`cache_hits_total ${cache.hits}`)

  lines.push('')
  lines.push('# HELP cache_misses_total Total number of cache misses')
  lines.push('# TYPE cache_misses_total counter')
  lines.push(`cache_misses_total ${cache.misses}`)

  lines.push('')
  lines.push('# HELP cache_hit_ratio Cache hit ratio (0-1)')
  lines.push('# TYPE cache_hit_ratio gauge')
  lines.push(`cache_hit_ratio ${cache.hitRate.toFixed(4)}`)

  // Database metrics
  const db = metricsCollector.getDatabaseMetrics()

  lines.push('')
  lines.push('# HELP database_queries_total Total number of database queries')
  lines.push('# TYPE database_queries_total counter')
  lines.push(`database_queries_total ${db.totalQueries}`)

  lines.push('')
  lines.push('# HELP database_query_duration_seconds Database query duration in seconds')
  lines.push('# TYPE database_query_duration_seconds gauge')
  lines.push(
    `database_query_duration_seconds{quantile="avg"} ${(db.avgTime / 1000).toFixed(4)}`
  )

  lines.push('')
  lines.push('# HELP database_slow_queries_total Total number of slow database queries')
  lines.push('# TYPE database_slow_queries_total counter')
  lines.push(`database_slow_queries_total ${db.slowQueries}`)

  // System metrics
  const system = metricsCollector.getLatestSystemMetrics()

  if (system) {
    lines.push('')
    lines.push('# HELP process_uptime_seconds Process uptime in seconds')
    lines.push('# TYPE process_uptime_seconds gauge')
    lines.push(`process_uptime_seconds ${system.uptime.toFixed(2)}`)

    lines.push('')
    lines.push('# HELP process_memory_heap_bytes Process memory heap in bytes')
    lines.push('# TYPE process_memory_heap_bytes gauge')
    lines.push(
      `process_memory_heap_bytes{type="used"} ${system.memoryUsage.heapUsed}`
    )
    lines.push(
      `process_memory_heap_bytes{type="total"} ${system.memoryUsage.heapTotal}`
    )

    lines.push('')
    lines.push('# HELP process_memory_external_bytes External memory in bytes')
    lines.push('# TYPE process_memory_external_bytes gauge')
    lines.push(`process_memory_external_bytes ${system.memoryUsage.external}`)

    lines.push('')
    lines.push('# HELP process_memory_rss_bytes Resident set size in bytes')
    lines.push('# TYPE process_memory_rss_bytes gauge')
    lines.push(`process_memory_rss_bytes ${system.memoryUsage.rss}`)

    lines.push('')
    lines.push('# HELP process_cpu_user_seconds CPU user time in seconds')
    lines.push('# TYPE process_cpu_user_seconds counter')
    lines.push(`process_cpu_user_seconds ${(system.cpuUsage.user / 1000000).toFixed(2)}`)

    lines.push('')
    lines.push('# HELP process_cpu_system_seconds CPU system time in seconds')
    lines.push('# TYPE process_cpu_system_seconds counter')
    lines.push(`process_cpu_system_seconds ${(system.cpuUsage.system / 1000000).toFixed(2)}`)
  }

  return lines.join('\n')
}

/**
 * Format metric value for Prometheus
 */
export function formatPrometheusValue(value: number): string {
  if (value === Infinity) return '+Inf'
  if (value === -Infinity) return '-Inf'
  if (Number.isNaN(value)) return 'NaN'
  return String(value)
}

/**
 * Escape label value for Prometheus
 */
export function escapeLabelValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
}

/**
 * Parse Prometheus query result
 */
export function parsePrometheusResult(result: string): Record<string, number> {
  const metrics: Record<string, number> = {}

  result.split('\n').forEach((line) => {
    if (line.startsWith('#')) return // Skip comments

    const match = line.match(/^([^\s{]+)\s+(.+)$/)
    if (!match) return

    const [, metricName, value] = match
    metrics[metricName] = parseFloat(value)
  })

  return metrics
}
