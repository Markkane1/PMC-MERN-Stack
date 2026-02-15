/**
 * Week 6: Circuit Breaker Pattern
 * Prevents cascading failures by monitoring and failing fast
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number // Failure count to trigger OPEN
  successThreshold: number // Success count to close circuit in HALF_OPEN
  timeout: number // Time (ms) before trying HALF_OPEN
  name: string
}

export interface CircuitBreakerState {
  state: CircuitState
  failures: number
  successes: number
  lastFailureTime?: number
  consecutiveSuccesses: number
}

/**
 * Circuit Breaker implementation
 * Manages failure state and prevents cascading failures
 */
export class CircuitBreaker<T> {
  private config: CircuitBreakerConfig
  private state: CircuitBreakerState
  private nextAttemptTime: number = 0

  constructor(config: CircuitBreakerConfig) {
    this.config = config
    this.state = {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      consecutiveSuccesses: 0,
    }
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<R>(fn: () => Promise<R>): Promise<R> {
    if (this.state.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error(`Circuit breaker "${this.config.name}" is OPEN`)
      }
      // Try HALF_OPEN
      this.state.state = CircuitState.HALF_OPEN
      this.state.consecutiveSuccesses = 0
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Record success
   */
  private onSuccess(): void {
    this.state.failures = 0

    if (this.state.state === CircuitState.HALF_OPEN) {
      this.state.consecutiveSuccesses++

      if (this.state.consecutiveSuccesses >= this.config.successThreshold) {
        this.state.state = CircuitState.CLOSED
        this.state.consecutiveSuccesses = 0
      }
    }
  }

  /**
   * Record failure
   */
  private onFailure(): void {
    this.state.failures++
    this.state.lastFailureTime = Date.now()

    if (this.state.state === CircuitState.HALF_OPEN) {
      // Failure in HALF_OPEN state opens circuit immediately
      this.state.state = CircuitState.OPEN
      this.nextAttemptTime = Date.now() + this.config.timeout
      this.state.consecutiveSuccesses = 0
      return
    }

    if (this.state.failures >= this.config.failureThreshold) {
      this.state.state = CircuitState.OPEN
      this.nextAttemptTime = Date.now() + this.config.timeout
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state }
  }

  /**
   * Get human-readable status
   */
  getStatus(): {
    state: string
    failures: number
    successThreshold?: number
    failureThreshold: number
    canRetry: boolean
  } {
    return {
      state: this.state.state,
      failures: this.state.failures,
      ...(this.state.state === CircuitState.HALF_OPEN && {
        successThreshold: this.config.successThreshold,
      }),
      failureThreshold: this.config.failureThreshold,
      canRetry: this.state.state === CircuitState.CLOSED || Date.now() >= this.nextAttemptTime,
    }
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      consecutiveSuccesses: 0,
    }
    this.nextAttemptTime = 0
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker<any>> = new Map()

  /**
   * Get or create a circuit breaker
   */
  getBreaker<T>(name: string, config?: CircuitBreakerConfig): CircuitBreaker<T> {
    if (!this.breakers.has(name)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000, // 60 seconds
        name,
        ...config,
      }
      this.breakers.set(name, new CircuitBreaker(defaultConfig))
    }
    return this.breakers.get(name)!
  }

  /**
   * Get status of all circuit breakers
   */
  getAllStatus(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [name, breaker] of this.breakers) {
      result[name] = breaker.getStatus()
    }
    return result
  }

  /**
   * Reset a specific breaker
   */
  reset(name: string): void {
    const breaker = this.breakers.get(name)
    if (breaker) {
      breaker.reset()
    }
  }

  /**
   * Reset all breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset()
    }
  }
}

// Default instance
export const circuitBreakerManager = new CircuitBreakerManager()
