import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CircuitBreakerExecutor,
  QueuedExecutor,
  batchParallelQueries,
  parallelQueries,
  parallelQueriesWithMetadata,
  parallelQueriesWithRetry,
  parallelQueriesWithTimeout,
  safeParallelQueries,
  timedParallelQueries,
} from '../../server/src/infrastructure/utils/parallelQueries'

describe('parallelQueries utilities', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should resolve all queries in parallel', async () => {
    const result = await parallelQueries([Promise.resolve(1), Promise.resolve('ok')])
    expect(result).toEqual([1, 'ok'])
  })

  it('should return fulfilled and rejected results with safeParallelQueries', async () => {
    const result = await safeParallelQueries([Promise.resolve('a'), Promise.reject(new Error('fail'))])
    expect(result[0].status).toBe('fulfilled')
    expect(result[1].status).toBe('rejected')
  })

  it('should return results before timeout when all queries complete quickly', async () => {
    const result = await parallelQueriesWithTimeout([Promise.resolve('done')], 100)
    expect(result).toEqual(['done'])
  })

  it('should throw timeout error when queries exceed timeout limit', async () => {
    vi.useFakeTimers()
    const never = new Promise<string>(() => undefined)
    const pending = parallelQueriesWithTimeout([never], 100)
    const assertion = expect(pending).rejects.toThrow('Query timeout after 100ms')
    await vi.advanceTimersByTimeAsync(100)
    await assertion
  })

  it('should preserve object keys in parallelQueriesWithMetadata', async () => {
    const result = await parallelQueriesWithMetadata({
      users: Promise.resolve(['u1']),
      total: Promise.resolve(5),
    })
    expect(result).toEqual({ users: ['u1'], total: 5 })
  })

  it('should process queries in batches and keep result ordering', async () => {
    const queries = [Promise.resolve(1), Promise.resolve(2), Promise.resolve(3), Promise.resolve(4)]
    const result = await batchParallelQueries(queries, 2)
    expect(result).toEqual([1, 2, 3, 4])
  })

  it('should retry failed query functions and eventually resolve', async () => {
    vi.useFakeTimers()
    let attempts = 0
    const resultPromise = parallelQueriesWithRetry(
      [
        async () => {
          attempts += 1
          if (attempts < 2) {
            throw new Error('temporary')
          }
          return 'ok'
        },
      ],
      3
    )
    await vi.runAllTimersAsync()
    await expect(resultPromise).resolves.toEqual(['ok'])
    expect(attempts).toBe(2)
  })

  it('should throw last error when retries are exhausted', async () => {
    const result = parallelQueriesWithRetry(
      [
        async () => {
          throw new Error('permanent')
        },
      ],
      1
    )
    await expect(result).rejects.toThrow('permanent')
  })
})

describe('CircuitBreakerExecutor', () => {
  it('should open circuit after threshold failures and reset after reset call', async () => {
    const breaker = new CircuitBreakerExecutor({ threshold: 2, timeout: 60_000 })
    const failingQuery = Promise.reject(new Error('db down'))

    await expect(breaker.executeParallel([failingQuery])).rejects.toThrow('db down')
    await expect(breaker.executeParallel([Promise.reject(new Error('db down'))])).rejects.toThrow('db down')
    await expect(breaker.executeParallel([Promise.resolve('ok')])).rejects.toThrow(
      'Circuit breaker OPEN - service is down'
    )

    expect(breaker.getStatus().isOpen).toBe(true)
    breaker.reset()
    expect(breaker.getStatus().isOpen).toBe(false)
  })
})

describe('QueuedExecutor', () => {
  it('should execute all query functions and return ordered results', async () => {
    const executor = new QueuedExecutor(2)
    const queryFunctions = [
      async () => 1,
      async () => 2,
      async () => 3,
      async () => 4,
    ]

    const result = await executor.execute(queryFunctions)
    expect(result).toEqual([1, 2, 3, 4])
  })

  it('should throw when any queued query fails', async () => {
    const executor = new QueuedExecutor(2)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const queryFunctions = [
      async () => 1,
      async () => {
        throw new Error('queue failure')
      },
      async () => 3,
    ]

    await expect(executor.execute(queryFunctions)).rejects.toThrow('queue failure')
    expect(errorSpy).toHaveBeenCalled()
  })
})

describe('timedParallelQueries', () => {
  it('should return data and timing metadata for each key', async () => {
    const result = await timedParallelQueries({
      users: Promise.resolve(['a']),
      stats: Promise.resolve({ total: 10 }),
    })

    expect(result.data).toEqual({
      users: ['a'],
      stats: { total: 10 },
    })
    expect(result.timing.users).toBeTypeOf('number')
    expect(result.timing.stats).toBeTypeOf('number')
    expect(result.timing.total).toBeTypeOf('number')
    expect(result.timing.total).toBeGreaterThanOrEqual(0)
  })
})
