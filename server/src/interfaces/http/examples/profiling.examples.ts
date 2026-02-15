/**
 * Stage 2.4: Performance Profiling Examples
 * 
 * Real-world examples of how to use performance profiling utilities
 * to identify bottlenecks and measure optimization improvements.
 */

import {
  PerformanceProfiler,
  MemoryProfiler,
  RequestDurationTracker,
  Timer,
} from '../../../infrastructure/utils/performance'

/**
 * Example 1: Profile a database query
 * 
 * Measure how long a MongoDB query takes
 */
export async function profileDatabaseQuery(
  applicantRepository: any,
  filter?: Record<string, any>
) {
  const profiler = new PerformanceProfiler()

  // Measure list query
  await profiler.measure('applicant.list()', () => applicantRepository.list(filter || {}))

  // Measure paginated query
  await profiler.measure('applicant.listPaginated()', () =>
    applicantRepository.listPaginated(filter || {}, 1, 50)
  )

  // Measure aggregation
  await profiler.measure('applicant.getStatsByStatus()', () =>
    applicantRepository.getStatsByStatus()
  )

  // Print report
  console.log(profiler.generateReport())
  console.log('JSON Export:', JSON.stringify(profiler.export(), null, 2))
}

/**
 * Example 2: Detect memory leaks in request handling
 * 
 * Simulates many requests and monitors memory growth
 */
export async function detectMemoryLeaks(
  applicantRepository: any,
  requestCount: number = 1000
) {
  const memoryProfiler = new MemoryProfiler()
  memoryProfiler.snapshot('Start')

  // Simulate requests
  for (let i = 0; i < requestCount; i += 100) {
    // Load and discard data
    await applicantRepository.list({})
    
    if (i % 200 === 0) {
      memoryProfiler.snapshot(`After ${i} requests`)
    }
    
    // Give garbage collector time
    if (global.gc) {
      global.gc()
    }
  }

  memoryProfiler.snapshot('End')
  console.log(memoryProfiler.generateReport())

  if (memoryProfiler.detectMemoryLeak()) {
    console.warn('⚠️  MEMORY LEAK DETECTED! Investigate heap usage.')
  } else {
    console.log('✓ No memory leak detected')
  }
}

/**
 * Example 3: Compare sequential vs parallel query performance
 */
export async function compareSequentialVsParallel(
  applicantRepository: any,
  documentRepository: any,
  feeRepository: any
) {
  const profiler = new PerformanceProfiler()
  const applicantId = 1

  // Sequential approach
  await profiler.measure('Sequential: applicant + docs + fees', async () => {
    const applicant = await applicantRepository.findByNumericId(applicantId)
    const documents = await documentRepository.findByApplicantId(applicantId)
    const fees = await feeRepository.findByApplicantId(applicantId)

    return { applicant, documents, fees }
  })

  // Parallel approach
  await profiler.measure('Parallel: applicant + docs + fees', async () => {
    const [applicant, documents, fees] = await Promise.all([
      applicantRepository.findByNumericId(applicantId),
      documentRepository.findByApplicantId(applicantId),
      feeRepository.findByApplicantId(applicantId),
    ])

    return { applicant, documents, fees }
  })

  const stats = profiler.getAllStats()
  console.log(profiler.generateReport())

  // Calculate improvement
  const sequentialTime = stats[0].avgDuration
  const parallelTime = stats[1].avgDuration
  const improvement = ((sequentialTime - parallelTime) / sequentialTime) * 100

  console.log(`\n📊 Performance Improvement: ${improvement.toFixed(1)}% faster`)
}

/**
 * Example 4: Profile endpoint latency
 * 
 * Track request duration for multiple endpoints
 */
export async function profileEndpoints(app: any, endpoints: string[]) {
  const tracker = new RequestDurationTracker()

  console.log('Endpoint request durations:')

  for (const endpoint of endpoints) {
    try {
      const timer = new Timer()
      timer.start()

      // Simulate API call (in real scenario, this would be an HTTP request)
      // await fetch(`http://localhost:3000${endpoint}`)

      timer.stop()
      tracker.record(endpoint, timer.duration())

      // In real usage, you'd make multiple requests
      // This is for demonstration
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error)
    }
  }

  console.log(tracker.generateReport())

  const slowEndpoints = tracker.getSlowEndpoints(500)
  if (slowEndpoints.length > 0) {
    console.log('\n⚠️  PERFORMANCE ALERTS:')
    slowEndpoints.forEach((ep: any) => {
      console.log(`  - ${ep.endpoint}: ${ep.avgDuration.toFixed(2)}ms (>500ms threshold)`)
    })
  }
}

/**
 * Example 5: Profile aggregation query performance
 */
export async function profileAggregations(applicantRepository: any) {
  const profiler = new PerformanceProfiler()

  console.log('Profiling aggregation queries...\n')

  // Profile different aggregations
  await profiler.measure('getStatsByStatus', () => applicantRepository.getStatsByStatus())

  await profiler.measure('getStatsByDistrict', () => applicantRepository.getStatsByDistrict())

  await profiler.measure('getDashboardMetrics', () => applicantRepository.getDashboardMetrics())

  // Get statistics
  const allStats = profiler.getAllStats()

  console.log(profiler.generateReport())

  // Identify slowest operation
  const slowest = allStats.reduce((prev: any, current: any) =>
    current.avgDuration > prev.avgDuration ? current : prev
  )

  console.log(
    `\n⚠️  Slowest aggregation: ${slowest.name} (${slowest.avgDuration.toFixed(2)}ms avg)`
  )
}

/**
 * Example 6: Load test with performance profiling
 */
export async function profileLoadTest(
  makeRequest: (endpoint: string) => Promise<any>,
  endpoints: string[],
  requestsPerEndpoint: number = 100
) {
  const profiler = new PerformanceProfiler()
  const memoryProfiler = new MemoryProfiler()
  const tracker = new RequestDurationTracker()

  memoryProfiler.snapshot('Test Start')

  console.log(
    `Running load test: ${endpoints.length} endpoints, ${requestsPerEndpoint} requests each\n`
  )

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`)

    for (let i = 0; i < requestsPerEndpoint; i++) {
      const result = await profiler.measure(`${endpoint}[${i}]`, () => makeRequest(endpoint))
      // This would be filled in with actual timing
    }

    const stats = profiler.getStats(endpoint)
    if (stats) {
      tracker.record(endpoint, stats.avgDuration)
      console.log(`  ✓ Avg: ${stats.avgDuration.toFixed(2)}ms, P95: ${stats.p95.toFixed(2)}ms`)
    }
  }

  memoryProfiler.snapshot('Test End')

  console.log('\n' + profiler.generateReport())
  console.log(memoryProfiler.generateReport())
  console.log(tracker.generateReport())
}

/**
 * Example 7: Benchmark concurrent vs queued execution
 */
export async function benchmarkConcurrency(
  executeQuery: (id: number) => Promise<any>,
  queryCount: number = 100
) {
  const profiler = new PerformanceProfiler()

  console.log(`Benchmarking concurrent execution with ${queryCount} queries\n`)

  // Sequential execution
  await profiler.measure('Sequential (sequential for loop)', async () => {
    const results: any[] = []
    for (let i = 0; i < queryCount; i++) {
      results.push(await executeQuery(i))
    }
    return results
  })

  // Concurrent execution (Promise.all)
  await profiler.measure('Concurrent (Promise.all)', async () => {
    const promises = Array.from({ length: queryCount }, (_, i) => executeQuery(i))
    return Promise.all(promises)
  })

  // Batch execution (process in groups)
  await profiler.measure('Batched (groups of 10)', async () => {
    const batchSize = 10
    const results: any[] = []

    for (let i = 0; i < queryCount; i += batchSize) {
      const batch = Array.from(
        { length: Math.min(batchSize, queryCount - i) },
        (_, j) => executeQuery(i + j)
      )
      const batchResults = await Promise.all(batch)
      results.push(...batchResults)
    }

    return results
  })

  const stats = profiler.getAllStats()
  console.log(profiler.generateReport())

  // Calculate improvement percentages
  const sequential = stats[0].avgDuration
  const concurrent = stats[1].avgDuration
  const batched = stats[2].avgDuration

  console.log(`\n📊 CONCURRENCY COMPARISON:`)
  console.log(`  Sequential:  ${sequential.toFixed(2)}ms (baseline)`)
  console.log(`  Concurrent:  ${concurrent.toFixed(2)}ms (${((sequential - concurrent) / sequential * 100).toFixed(1)}% faster)`)
  console.log(`  Batched:     ${batched.toFixed(2)}ms (${((sequential - batched) / sequential * 100).toFixed(1)}% faster)`)
}

/**
 * Example 8: Profile cache hit/miss performance
 */
export async function profileCaching(
  cacheService: any,
  repository: any,
  districtId: number,
  iterations: number = 100
) {
  const profiler = new PerformanceProfiler()
  const cacheKey = `district:${districtId}`

  console.log(`Profiling cache performance over ${iterations} iterations\n`)

  // Clear cache first
  if (cacheService.clearCache) {
    cacheService.clearCache(cacheKey)
  }

  // Profile with cache misses
  await profiler.measure('Cache misses (no cache)', async () => {
    for (let i = 0; i < Math.ceil(iterations / 10); i++) {
      // Clear cache to simulate misses
      if (cacheService.clearCache) {
        cacheService.clearCache(cacheKey)
      }
      await repository.findByDistrictId(districtId)
    }
  })

  // Profile with cache hits
  await profiler.measure('Cache hits (with cache)', async () => {
    for (let i = 0; i < iterations; i++) {
      // Cache should hit on subsequent calls
      await repository.findByDistrictId(districtId)
    }
  })

  const stats = profiler.getAllStats()
  console.log(profiler.generateReport())

  const missTime = stats[0].avgDuration
  const hitTime = stats[1].avgDuration
  const improvement = ((missTime - hitTime) / missTime) * 100

  console.log(`\n💾 CACHING IMPACT:`)
  console.log(`  Cache Miss: ${missTime.toFixed(2)}ms`)
  console.log(`  Cache Hit:  ${hitTime.toFixed(2)}ms`)
  console.log(`  Improvement: ${improvement.toFixed(1)}%`)
}

/**
 * Example 9: Profile pagination performance
 */
export async function profilePaginationPerformance(repository: any, totalPages: number = 10) {
  const profiler = new PerformanceProfiler()
  const tracker = new RequestDurationTracker()

  console.log(`Profiling pagination performance (${totalPages} pages)\n`)

  for (let page = 1; page <= totalPages; page++) {
    const result = await profiler.measure(`Page ${page}`, () =>
      repository.listPaginated({}, page, 50)
    )
    tracker.record(`/api/applicants?page=${page}`, 0) // Would get actual timing
  }

  console.log(profiler.generateReport())
  console.log(tracker.generateReport())

  const stats = profiler.getAllStats()
  const avgTime = stats.reduce((sum: number, s: any) => sum + s.avgDuration, 0) / stats.length

  console.log(`\n📄 PAGINATION STATS:`)
  console.log(`  Average page load: ${avgTime.toFixed(2)}ms`)
  console.log(`  Consistent performance: ${stats.every((s: any) => Math.abs(s.avgDuration - avgTime) < 50) ? '✓ Yes' : '⚠ No'}`)
}

export const profiling = {
  profileDatabaseQuery,
  detectMemoryLeaks,
  compareSequentialVsParallel,
  profileEndpoints,
  profileAggregations,
  profileLoadTest,
  benchmarkConcurrency,
  profileCaching,
  profilePaginationPerformance,
}
