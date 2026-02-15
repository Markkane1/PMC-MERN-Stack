/**
 * Week 6: Rate Limiting
 * Implements token bucket algorithm with IP-based, endpoint-based, and user-based limiting
 */

interface TokenBucket {
  tokens: number
  lastRefillTime: number
}

export interface RateLimitConfig {
  maxTokens: number // Max concurrent tokens
  refillRate: number // Tokens per second
  windowMs?: number // Time window in ms (alternative to refillRate)
}

export interface RateLimitStatus {
  remaining: number
  limit: number
  resetTime: number
  allowed: boolean
}

/**
 * Token bucket rate limiter
 * Uses token bucket algorithm for smooth rate limiting
 */
export class TokenBucketLimiter {
  private buckets: Map<string, TokenBucket> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      ...config,
      refillRate: config.refillRate ?? 100 / 1000, // 100 tokens per second default
    } as RateLimitConfig
  }

  /**
   * Check and consume tokens for a key
   */
  isAllowed(key: string, tokensRequired: number = 1): RateLimitStatus {
    const now = Date.now()
    let bucket = this.buckets.get(key)

    // Initialize or refill bucket
    if (!bucket) {
      bucket = {
        tokens: this.config.maxTokens,
        lastRefillTime: now,
      }
      this.buckets.set(key, bucket)
    }

    // Refill tokens based on elapsed time
    const elapsedMs = now - bucket.lastRefillTime
    const refillTokens = (elapsedMs * this.config.refillRate) / 1000
    bucket.tokens = Math.min(this.config.maxTokens, bucket.tokens + refillTokens)
    bucket.lastRefillTime = now

    // Check if allowed
    const allowed = bucket.tokens >= tokensRequired
    if (allowed) {
      bucket.tokens -= tokensRequired
    }

    const resetTime = now + (tokensRequired * 1000) / this.config.refillRate

    return {
      remaining: Math.floor(bucket.tokens),
      limit: this.config.maxTokens,
      resetTime,
      allowed,
    }
  }

  /**
   * Get current status without consuming
   */
  getStatus(key: string): RateLimitStatus {
    const now = Date.now()
    let bucket = this.buckets.get(key)

    if (!bucket) {
      return {
        remaining: this.config.maxTokens,
        limit: this.config.maxTokens,
        resetTime: now + 60000,
        allowed: true,
      }
    }

    const elapsedMs = now - bucket.lastRefillTime
    const refillTokens = (elapsedMs * this.config.refillRate) / 1000
    const tokens = Math.min(this.config.maxTokens, bucket.tokens + refillTokens)

    return {
      remaining: Math.floor(tokens),
      limit: this.config.maxTokens,
      resetTime: now + ((this.config.maxTokens - tokens) * 1000) / this.config.refillRate,
      allowed: tokens >= 1,
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.buckets.delete(key)
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.buckets.clear()
  }

  /**
   * Get all active rate limits (for monitoring)
   */
  getAllLimits(): Record<string, RateLimitStatus> {
    const result: Record<string, RateLimitStatus> = {}
    for (const [key] of this.buckets) {
      result[key] = this.getStatus(key)
    }
    return result
  }
}

/**
 * IP-based rate limiter
 * Limits requests per IP address
 */
export class IpRateLimiter {
  private limiter: TokenBucketLimiter

  constructor(requestsPerMinute: number = 100) {
    // Convert requests per minute to tokens per second
    this.limiter = new TokenBucketLimiter({
      maxTokens: requestsPerMinute,
      refillRate: requestsPerMinute / 60,
    })
  }

  isAllowed(ip: string): RateLimitStatus {
    return this.limiter.isAllowed(ip)
  }

  reset(ip: string): void {
    this.limiter.reset(ip)
  }

  clear(): void {
    this.limiter.clear()
  }
}

/**
 * Endpoint-based rate limiter
 * Limits requests per endpoint (path + method)
 */
export class EndpointRateLimiter {
  private limiters: Map<string, TokenBucketLimiter> = new Map()
  private defaultConfig: RateLimitConfig

  constructor(defaultRequestsPerMinute: number = 1000) {
    this.defaultConfig = {
      maxTokens: defaultRequestsPerMinute,
      refillRate: defaultRequestsPerMinute / 60,
    }
  }

  isAllowed(path: string, method: string, tokensRequired: number = 1): RateLimitStatus {
    const key = `${method.toUpperCase()} ${path}`
    let limiter = this.limiters.get(key)

    if (!limiter) {
      limiter = new TokenBucketLimiter(this.defaultConfig)
      this.limiters.set(key, limiter)
    }

    return limiter.isAllowed(key, tokensRequired)
  }

  getStatus(path: string, method: string): RateLimitStatus {
    const key = `${method.toUpperCase()} ${path}`
    const limiter = this.limiters.get(key)

    if (!limiter) {
      return {
        remaining: this.defaultConfig.maxTokens,
        limit: this.defaultConfig.maxTokens,
        resetTime: Date.now() + 60000,
        allowed: true,
      }
    }

    return limiter.getStatus(key)
  }

  reset(path: string, method: string): void {
    const key = `${method.toUpperCase()} ${path}`
    this.limiters.delete(key)
  }

  clear(): void {
    this.limiters.clear()
  }

  getStats(): Record<string, RateLimitStatus> {
    const result: Record<string, RateLimitStatus> = {}
    for (const [key, limiter] of this.limiters) {
      result[key] = limiter.getStatus(key)
    }
    return result
  }
}

/**
 * User-based rate limiter (for authenticated requests)
 * Limits requests per user ID
 */
export class UserRateLimiter {
  private limiter: TokenBucketLimiter

  constructor(requestsPerMinute: number = 500) {
    this.limiter = new TokenBucketLimiter({
      maxTokens: requestsPerMinute,
      refillRate: requestsPerMinute / 60,
    })
  }

  isAllowed(userId: string | number): RateLimitStatus {
    return this.limiter.isAllowed(String(userId))
  }

  reset(userId: string | number): void {
    this.limiter.reset(String(userId))
  }

  clear(): void {
    this.limiter.clear()
  }
}

// Default instances
export const ipRateLimiter = new IpRateLimiter(100) // 100 requests/min per IP
export const endpointRateLimiter = new EndpointRateLimiter(1000) // 1000 requests/min per endpoint
export const userRateLimiter = new UserRateLimiter(500) // 500 requests/min per user
