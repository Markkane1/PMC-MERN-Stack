/**
 * Stage 2.3: Parallel Query Executor
 * 
 * Utilities for executing multiple queries in parallel using Promise.all().
 * Critical for dashboards/reports that need multiple data sources.
 * 
 * Benefits:
 * - Execute N queries simultaneously instead of sequentially
 * - Reduce total response time from N × queryTime to 1 × maxQueryTime
 * - Better resource utilization
 * - Faster dashboard/report generation
 */

/**
 * Execute multiple queries in parallel
 * 
 * Usage:
 *   const [users, permissions, stats] = await Promise.all([
 *     userRepository.listAll(),
 *     permissionRepository.listAll(),
 *     statisticsRepository.getSummary()
 *   ])
 */
export function parallelQueries<T extends Promise<any>[]>(queries: T): Promise<Awaited<T>> {
  return Promise.all(queries) as Promise<Awaited<T>>
}

/**
 * Execute queries with error handling
 * Returns { data, error } tuple for each query
 * 
 * Usage:
 *   const results = await safeParallelQueries([
 *     userRepository.listAll().then(data => ({ data, type: 'users' })),
 *     permissionRepository.listAll().then(data => ({ data, type: 'perms' }))
 *   ])
 */
export async function safeParallelQueries<T>(
  queries: Promise<T>[]
): Promise<PromiseSettledResult<T>[]> {
  return Promise.allSettled(queries)
}

/**
 * Execute queries with timeout protection
 * Prevents hanging if query takes too long
 * 
 * Usage:
 *   const [users, stats] = await parallelQueriesWithTimeout(
 *     [userRepository.listAll(), statsRepository.getSummary()],
 *     5000 // 5 second timeout
 *   )
 */
export async function parallelQueriesWithTimeout<T>(
  queries: Promise<T>[],
  timeoutMs: number
): Promise<T[]> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Query timeout after ${timeoutMs}ms`)),
      timeoutMs
    )
  )

  return Promise.race([Promise.all(queries), timeoutPromise])
}

/**
 * Execute queries and combine results with metadata
 * 
 * Usage:
 *   const results = await parallelQueriesWithMetadata({
 *     users: userRepository.listAll(),
 *     permissions: permissionRepository.listAll(),
 *     stats: statisticsRepository.getSummary()
 *   })
 *   // Returns: { users: [...], permissions: [...], stats: {...} }
 */
export async function parallelQueriesWithMetadata<T extends Record<string, Promise<any>>>(
  queries: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const keys = Object.keys(queries) as (keyof T)[]
  const values = await Promise.all(Object.values(queries))

  const result: any = {}
  keys.forEach((key, index) => {
    result[key] = values[index]
  })

  return result
}

/**
 * Execute queries in batches (for memory efficiency with many queries)
 * 
 * Usage:
 *   const results = await batchParallelQueries(
 *     [query1, query2, query3, query4, query5],
 *     2 // Execute 2 queries at a time
 *   )
 */
export async function batchParallelQueries<T>(
  queries: Promise<T>[],
  batchSize: number = 3
): Promise<T[]> {
  const results: T[] = []

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch)
    results.push(...batchResults)
  }

  return results
}

/**
 * Execute queries and retry on failure
 * 
 * Usage:
 *   const [users, stats] = await parallelQueriesWithRetry(
 *     [userRepository.listAll(), statsRepository.getSummary()],
 *     3 // Retry up to 3 times
 *   )
 */
export async function parallelQueriesWithRetry<T>(
  queries: (() => Promise<T>)[],
  maxRetries: number = 3
): Promise<T[]> {
  const results: T[] = []

  for (const queryFn of queries) {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await queryFn()
        results.push(result)
        break
      } catch (error) {
        lastError = error as Error
        if (attempt < maxRetries - 1) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 100)
          )
        }
      }
    }

    if (lastError && results.length < queries.length) {
      throw lastError
    }
  }

  return results
}

/**
 * Parallel query with circuit breaker pattern
 * Prevents cascading failures
 * 
 * Usage:
 *   const breaker = new CircuitBreakerExecutor({ threshold: 5, timeout: 60000 })
 *   const [users, stats] = await breaker.executeParallel([
 *     userRepository.listAll(),
 *     statsRepository.getSummary()
 *   ])
 */
export class CircuitBreakerExecutor {
  private failureCount = 0
  private lastFailureTime: number | null = null
  private halfOpenTime: number = 0

  constructor(private config: { threshold: number; timeout: number }) {}

  async executeParallel<T>(queries: Promise<T>[]): Promise<T[]> {
    // Check if circuit is open (failed too many times)
    if (
      this.failureCount >= this.config.threshold &&
      Date.now() - (this.lastFailureTime || 0) < this.config.timeout
    ) {
      throw new Error('Circuit breaker OPEN - service is down')
    }

    // Try to execute
    try {
      const results = await Promise.all(queries)

      // Success - reset counter
      this.failureCount = 0
      this.lastFailureTime = null

      return results
    } catch (error) {
      this.failureCount++
      this.lastFailureTime = Date.now()
      throw error
    }
  }

  reset(): void {
    this.failureCount = 0
    this.lastFailureTime = null
  }

  getStatus(): { isOpen: boolean; failureCount: number } {
    return {
      isOpen:
        this.failureCount >= this.config.threshold &&
        Date.now() - (this.lastFailureTime || 0) < this.config.timeout,
      failureCount: this.failureCount,
    }
  }
}

/**
 * Queue-based parallel executor (for memory-constrained environments)
 * Processes queries in order but with max concurrent limit
 * 
 * Usage:
 *   const executor = new QueuedExecutor(3) // Max 3 concurrent
 *   const results = await executor.execute([
 *     () => userRepository.listAll(),
 *     () => statsRepository.getSummary(),
 *     () => permissionRepository.listAll()
 *   ])
 */
export class QueuedExecutor {
  private running = 0
  private queue: Array<() => Promise<any>> = []

  constructor(private maxConcurrent: number = 3) {}

  async execute<T>(queryFunctions: Array<() => Promise<T>>): Promise<T[]> {
    this.queue = [...queryFunctions]
    const results: T[] = new Array(queryFunctions.length)

    const executeNext = async (index: number): Promise<void> => {
      if (index >= queryFunctions.length) return

      this.running++

      try {
        results[index] = await queryFunctions[index]()
      } catch (error) {
        console.error(`Query ${index} failed:`, error)
        throw error
      } finally {
        this.running--
      }

      // Process next if available
      if (this.running < this.maxConcurrent && index + this.maxConcurrent < queryFunctions.length) {
        await executeNext(index + this.maxConcurrent)
      }
    }

    // Start initial batch
    const initialPromises = Array.from({
      length: Math.min(this.maxConcurrent, queryFunctions.length),
    }).map((_, i) => executeNext(i))

    await Promise.all(initialPromises)
    return results
  }
}

/**
 * Response time tracking for parallel queries
 * Useful for monitoring which queries are slow
 * 
 * Usage:
 *   const timed = await timedParallelQueries({
 *     users: userRepository.listAll(),
 *     stats: statsRepository.getSummary()
 *   })
 *   // Returns: { data: {...}, timing: { users: 50ms, stats: 120ms, total: 120ms } }
 */
export async function timedParallelQueries<T extends Record<string, Promise<any>>>(
  queries: T
): Promise<{
  data: { [K in keyof T]: Awaited<T[K]> }
  timing: Record<string, number> & { total: number }
}> {
  const startTime = Date.now()
  const keys = Object.keys(queries) as (keyof T)[]
  const timing: Record<string, number> = {}

  const timedQueries = keys.map(async (key) => {
    const start = Date.now()
    const result = await queries[key]
    timing[key as string] = Date.now() - start
    return result
  })

  const results = await Promise.all(timedQueries)
  const data: any = {}
  keys.forEach((key, index) => {
    data[key] = results[index]
  })

  return {
    data,
    timing: {
      ...timing,
      total: Date.now() - startTime,
    },
  }
}
