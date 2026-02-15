/**
 * Week 6: Resilience Strategies
 * Provides retry, timeout, fallback, and bulkhead patterns
 */

export interface RetryConfig {
  maxRetries: number
  delayMs: number // Initial delay
  backoffMultiplier: number // Exponential backoff coefficient
  maxDelayMs: number
  retryableErrors?: (error: Error) => boolean
}

export interface TimeoutConfig {
  timeoutMs: number
  onTimeout?: () => void | Promise<void>
}

/**
 * Retry with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 100,
    backoffMultiplier = 2,
    maxDelayMs = 10000,
    retryableErrors = isRetryableError,
  } = config

  let lastError: Error | null = null
  let delay = delayMs

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries || !retryableErrors(lastError)) {
        throw error
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay = Math.min(delay * backoffMultiplier, maxDelayMs)
    }
  }

  throw lastError
}

/**
 * Execute function with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  config: TimeoutConfig
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(async () => {
      if (config.onTimeout) {
        try {
          await config.onTimeout()
        } catch (err) {
          // Ignore timeout handler errors
        }
      }
      reject(new Error(`Operation timeout after ${config.timeoutMs}ms`))
    }, config.timeoutMs)

    fn()
      .then((result) => {
        clearTimeout(timeoutHandle)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeoutHandle)
        reject(error)
      })
  })
}

/**
 * Retry with timeout
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  retryConfig: Partial<RetryConfig> = {},
  timeoutConfig: TimeoutConfig = { timeoutMs: 5000 }
): Promise<T> {
  const { maxRetries = 3, delayMs = 100, backoffMultiplier = 2, maxDelayMs = 10000 } = retryConfig

  let lastError: Error | null = null
  let delay = delayMs

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(fn, timeoutConfig)
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
      delay = Math.min(delay * backoffMultiplier, maxDelayMs)
    }
  }

  throw lastError
}

/**
 * Fallback pattern - try multiple strategies in order
 */
export async function fallback<T>(
  strategies: Array<() => Promise<T>>,
  fallbackValue?: T
): Promise<T> {
  let lastError: Error | null = null

  for (const strategy of strategies) {
    try {
      return await strategy()
    } catch (error) {
      lastError = error as Error
      continue
    }
  }

  if (fallbackValue !== undefined) {
    return fallbackValue
  }

  throw lastError || new Error('All fallback strategies failed')
}

/**
 * Parallel execution with fallback
 */
export async function parallelFallback<T>(
  strategies: Array<() => Promise<T>>,
  timeoutMs: number = 5000,
  fallbackValue?: T
): Promise<T> {
  const promises = strategies.map((strategy) =>
    withTimeout(strategy, { timeoutMs }).catch((err) => ({ error: err } as any))
  )

  for (const result of await Promise.all(promises)) {
    if (result && typeof result === 'object' && !('error' in result)) {
      return result as T
    }
  }

  if (fallbackValue !== undefined) {
    return fallbackValue
  }

  throw new Error('All parallel strategies failed')
}

/**
 * Bulkhead pattern - limit concurrent executions
 */
export class Bulkhead {
  private activeCount: number = 0
  private readonly maxConcurrent: number
  private readonly queue: Array<(value?: any) => void> = []

  constructor(maxConcurrent: number = 10) {
    this.maxConcurrent = maxConcurrent
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    while (this.activeCount >= this.maxConcurrent) {
      await new Promise((resolve) => this.queue.push(resolve))
    }

    this.activeCount++

    try {
      return await fn()
    } finally {
      this.activeCount--
      const resolve = this.queue.shift()
      if (resolve) {
        resolve()
      }
    }
  }

  /**
   * Get current concurrency stats
   */
  getStats() {
    return {
      active: this.activeCount,
      queued: this.queue.length,
      max: this.maxConcurrent,
      available: Math.max(0, this.maxConcurrent - this.activeCount),
    }
  }
}

/**
 * Determine if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()

  // Network errors
  if (message.includes('econnreset') || message.includes('econnrefused')) {
    return true
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('etimedout')) {
    return true
  }

  // Service unavailable
  if (message.includes('503') || message.includes('service unavailable')) {
    return true
  }

  // Too many requests
  if (message.includes('429') || message.includes('too many requests')) {
    return true
  }

  return false
}

/**
 * Adaptive timeout - increases retry time based on failures
 */
export class AdaptiveTimeout {
  private baseTimeoutMs: number
  private maxTimeoutMs: number
  private failureCount: number = 0
  private lastResetTime: number = Date.now()

  constructor(baseTimeoutMs: number = 1000, maxTimeoutMs: number = 30000) {
    this.baseTimeoutMs = baseTimeoutMs
    this.maxTimeoutMs = maxTimeoutMs
  }

  /**
   * Get current timeout (increases with failures)
   */
  getCurrentTimeout(): number {
    const multiplier = Math.pow(2, Math.min(this.failureCount, 4)) // Cap at 2^4 = 16x
    return Math.min(this.baseTimeoutMs * multiplier, this.maxTimeoutMs)
  }

  /**
   * Record failure
   */
  recordFailure(): void {
    this.failureCount++
  }

  /**
   * Record success
   */
  recordSuccess(): void {
    this.failureCount = Math.max(0, this.failureCount - 1)
  }

  /**
   * Reset if no failures for duration
   */
  resetIfQuiet(quietDurationMs: number = 60000): void {
    if (Date.now() - this.lastResetTime > quietDurationMs && this.failureCount > 0) {
      this.failureCount = 0
      this.lastResetTime = Date.now()
    }
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      failureCount: this.failureCount,
      currentTimeoutMs: this.getCurrentTimeout(),
      baseTimeoutMs: this.baseTimeoutMs,
      maxTimeoutMs: this.maxTimeoutMs,
    }
  }
}

// Default bulkhead instance for general use
export const defaultBulkhead = new Bulkhead(50) // 50 concurrent operations max
