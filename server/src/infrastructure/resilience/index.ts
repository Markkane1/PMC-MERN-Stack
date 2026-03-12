 /**
 * Week 6: Resilience Module Exports
 * Centralized exports for rate limiting, circuit breakers, and resilience patterns
 */

// Rate limiting
export {
  CacheBackedRateLimiter,
  generalApiRateLimiter,
  loginRateLimiter,
  captchaRateLimiter,
  profileRateLimiter,
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
  generalApiRateLimitingMiddleware,
  loginRateLimitingMiddleware,
  captchaRateLimitingMiddleware,
  profileRateLimitingMiddleware,
  ipRateLimitingMiddleware,
  endpointRateLimitingMiddleware,
  userRateLimitingMiddleware,
  getRateLimitingStats,
  resetRateLimits,
  getClientIp,
} from './middleware'

// Routes
export { resilienceRouter } from './routes'
