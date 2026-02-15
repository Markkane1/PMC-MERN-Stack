/**
 * Week 5: Monitoring & Observability Module
 * Comprehensive performance monitoring and metrics collection
 */

export { metricsCollector, type EndpointMetrics, type SystemMetrics, type CacheMetrics, type DatabaseMetrics, MetricsCollector } from './metrics'

export { generatePrometheusMetrics, formatPrometheusValue, escapeLabelValue, parsePrometheusResult } from './prometheus'

export { monitoringMiddleware, SystemMetricsCollector, recordDatabaseMetric, recordCacheHit, recordCacheMiss, checkAlerts, generatePerformanceReport, type AlertConfig } from './middleware'

export { monitoringRouter } from './routes'
