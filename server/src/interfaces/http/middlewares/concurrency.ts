/**
 * Stage 2.3: Concurrent Request Middleware & Utilities
 * 
 * Middleware to track and optimize concurrent requests.
 * Prevents memory exhaustion and connection pool depletion.
 */

import { Request, Response, NextFunction } from 'express'

/**
 * Track active requests and connection pool status
 */
export class RequestTracker {
  private activeRequests = new Map<string, { startTime: number; endpoint: string }>()
  private totalRequests = 0
  private peakConcurrent = 0

  /**
   * Middleware to track requests
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestId = `${req.method}-${req.path}-${Date.now()}`
      const startTime = Date.now()

      this.activeRequests.set(requestId, {
        startTime,
        endpoint: req.path,
      })

      this.totalRequests++
      this.peakConcurrent = Math.max(this.peakConcurrent, this.activeRequests.size)

      // Track response time
      res.on('finish', () => {
        const duration = Date.now() - startTime
        this.activeRequests.delete(requestId)

        // Log slow requests
        if (duration > 1000) {
          console.warn(`[SLOW] ${req.method} ${req.path} took ${duration}ms`)
        }
      })

      next()
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      activeRequests: this.activeRequests.size,
      totalRequests: this.totalRequests,
      peakConcurrent: this.peakConcurrent,
      avgRequestsPerMinute: (this.totalRequests / (Date.now() / 60000)) | 0,
    }
  }

  /**
   * Get slow/hanging requests
   */
  getSlowRequests(thresholdMs: number = 5000) {
    const now = Date.now()
    return Array.from(this.activeRequests.entries())
      .filter(([_, req]) => now - req.startTime > thresholdMs)
      .map(([id, req]) => ({
        id,
        endpoint: req.endpoint,
        duration: now - req.startTime,
      }))
  }
}

/**
 * Connection pool monitor
 * Prevents exhausting the MongoDB connection pool
 */
export class ConnectionPoolMonitor {
  private poolSize: number
  private activeConnections = 0
  private waitingRequests = 0
  private readonly maxWaitTime = 5000 // 5 seconds

  constructor(maxPoolSize: number = 100) {
    this.poolSize = maxPoolSize
  }

  /**
   * Middleware to limit concurrent connections
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Check if pool is saturated
      if (this.activeConnections >= this.poolSize * 0.9) {
        this.waitingRequests++

        // Wait for a connection to become available
        const waitStart = Date.now()
        while (this.activeConnections >= this.poolSize) {
          if (Date.now() - waitStart > this.maxWaitTime) {
            this.waitingRequests--
            return res.status(503).json({
              error: 'Service temporarily unavailable - connection pool exhausted',
              retryAfter: 5,
            })
          }
          await new Promise((resolve) => setTimeout(resolve, 10))
        }

        this.waitingRequests--
      }

      this.activeConnections++

      res.on('finish', () => {
        this.activeConnections--
      })

      next()
    }
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      activeConnections: this.activeConnections,
      availableConnections: this.poolSize - this.activeConnections,
      waitingRequests: this.waitingRequests,
      poolUtilization: (this.activeConnections / this.poolSize) * 100,
      isNearCapacity: this.activeConnections > this.poolSize * 0.8,
    }
  }
}

/**
 * Batch request combiner
 * Combines multiple similar queries into one
 * Useful for reducing database load with many concurrent requests
 */
export class BatchRequestCombiner {
  private batches = new Map<string, Promise<any>>()
  private batchTimeoutMs = 50 // Wait 50ms to collect requests

  /**
   * Get result - batches with same key together
   */
  async get<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
    // If batch exists, return its promise
    if (this.batches.has(key)) {
      return this.batches.get(key)!
    }

    // Create new batch
    const batchPromise = new Promise<T>((resolve) => {
      setTimeout(async () => {
        try {
          const result = await queryFn()
          resolve(result)
        } finally {
          this.batches.delete(key)
        }
      }, this.batchTimeoutMs)
    })

    this.batches.set(key, batchPromise)
    return batchPromise
  }

  /**
   * Clear all pending batches
   */
  clear() {
    this.batches.clear()
  }

  /**
   * Get pending batches count
   */
  getPendingCount() {
    return this.batches.size
  }
}

/**
 * Example: Using RequestTracker middleware in app initialization
 * 
 * const tracker = new RequestTracker()
 * app.use(tracker.middleware())
 * 
 * // Later, get metrics
 * app.get('/api/admin/metrics', (req, res) => {
 *   res.json(tracker.getMetrics())
 * })
 */

/**
 * Example: Using ConnectionPoolMonitor middleware
 * 
 * const poolMonitor = new ConnectionPoolMonitor(100)
 * app.use(poolMonitor.middleware())
 * 
 * app.get('/api/admin/pool-status', (req, res) => {
 *   res.json(poolMonitor.getStatus())
 * })
 */

/**
 * Example: Using BatchRequestCombiner
 * 
 * const combiner = new BatchRequestCombiner()
 * 
 * router.get('/districts/:id', async (req, res) => {
 *   const district = await combiner.get(
 *     `district:${req.params.id}`,
 *     () => districtRepository.findByDistrictId(Number(req.params.id))
 *   )
 *   res.json(district)
 * })
 * 
 * // Multiple simultaneous requests for same district?
 * // They all get batched into ONE database query!
 */

/**
 * Middleware to prevent N+1 queries (request batching pattern)
 * Collects similar requests and executes them together
 */
export class RequestBatcher {
  private queue: Map<string, Array<{ resolve: Function; reject: Function }>> = new Map()
  private processTimer: NodeJS.Timeout | null = null
  private readonly batchIntervalMs = 25 // Process batch every 25ms

  /**
   * Add request to batch
   */
  async addToBatch<T>(
    key: string,
    id: string,
    queryFn: (ids: string[]) => Promise<Map<string, T>>
  ): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this.queue.has(key)) {
        this.queue.set(key, [])
      }

      const batchKey = `${key}:${id}`
      this.queue.get(key)!.push({ resolve, reject })

      // Schedule batch processing if not already scheduled
      if (!this.processTimer) {
        this.processTimer = setTimeout(() => this.processBatch(key, queryFn), this.batchIntervalMs)
      }
    })
  }

  /**
   * Process a batch of requests
   */
  private async processBatch<T>(
    key: string,
    queryFn: (ids: string[]) => Promise<Map<string, T>>
  ) {
    const requests = this.queue.get(key) || []
    this.queue.delete(key)
    this.processTimer = null

    if (requests.length === 0) return

    try {
      // Extract IDs from request properties
      const ids = requests.map((_, i) => String(i))
      const results = await queryFn(ids)

      // Resolve each request with its result
      requests.forEach((req, index) => {
        const result = results.get(String(index))
        req.resolve(result || null)
      })
    } catch (error) {
      requests.forEach((req) => req.reject(error))
    }
  }
}
