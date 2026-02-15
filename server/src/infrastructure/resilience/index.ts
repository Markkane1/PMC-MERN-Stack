 /**
 * Week 6: Resilience Module Exports
 * Centralized exports for rate limiting, circuit breakers, and resilience patterns
 */

// Rate limiting
export {
  TokenBucketLimiter,
  IpRateLimiter,
  EndpointRateLimiter,
  UserRateLimiter,
  ipRateLimiter,
  endpointRateLimiter,
  userRateLimiter,
  type RateLimitConfig,
  type RateLimitStatus,
} from './rateLimiting'

// Circuit breaker
export {
  CircuitBreaker,
  CircuitBreakerManager,
  circuitBreakerManager,
  CircuitState,
  type CircuitBreakerConfig,
  type CircuitBreakerState,
} from './circuitBreaker'

// Resilience strategies
export {
  retry,
  retryWithTimeout,
  withTimeout,
  fallback,
  parallelFallback,
  Bulkhead,
  AdaptiveTimeout,
  defaultBulkhead,
  isRetryableError,
  type RetryConfig,
  type TimeoutConfig,
} from './resilience'

// Middleware
export {
  ipRateLimitingMiddleware,
  endpointRateLimitingMiddleware,
  userRateLimitingMiddleware,
  getRateLimitingStats,
  resetRateLimits,
} from './middleware'

// Routes
export { resilienceRouter } from './routes'
