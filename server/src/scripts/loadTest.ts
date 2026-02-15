/**
 * Stage 2.4: Load Testing Scripts & Configuration
 * 
 * Scripts for running load tests against API endpoints.
 * Helps identify performance bottlenecks and validate optimizations.
 * 
 * Usage: ts-node src/scripts/loadTest.ts
 */

import { performance } from 'perf_hooks'
import { PerformanceProfiler, MemoryProfiler, RequestDurationTracker, Timer } from '../infrastructure/utils/performance'

/**
 * Load test configuration
 */
export interface LoadTestConfig {
  baseUrl: string
  endpoints: Array<{
    name: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    path: string
    body?: Record<string, any>
    headers?: Record<string, string>
  }>
  concurrency: number // Number of parallel requests
  requestsPerEndpoint: number // Total requests per endpoint
  warmupRequests?: number // Requests before starting measurement
  timeout?: number // Request timeout in ms
}

/**
 * Simple HTTP client for load testing
 */
async function makeRequest(
  url: string,
  options: {
    method: string
    body?: string
    headers?: Record<string, string>
    timeout?: number
  }
): Promise<{
  statusCode: number
  duration: number
  success: boolean
  error?: string
}> {
  const startTime = performance.now()
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000)

    const response = await fetch(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const duration = performance.now() - startTime

    return {
      statusCode: response.status,
      duration,
      success: response.status >= 200 && response.status < 300,
    }
  } catch (error) {
    const duration = performance.now() - startTime
    return {
      statusCode: 0,
      duration,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Run concurrent requests with limited concurrency
 */
async function runConcurrentRequests(
  requests: Array<() => Promise<any>>,
  concurrency: number
): Promise<any[]> {
  const results: any[] = []
  const executing: Promise<any>[] = []

  for (const request of requests) {
    const promise = request().then((result) => {
      executing.splice(executing.indexOf(promise), 1)
      return result
    })

    results.push(promise)
    executing.push(promise)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
    }
  }

  return Promise.all(results)
}

/**
 * Execute a single endpoint load test
 */
async function testEndpoint(
  baseUrl: string,
  endpoint: {
    name: string
    method: string
    path: string
    body?: Record<string, any>
    headers?: Record<string, string>
  },
  config: {
    totalRequests: number
    concurrency: number
    warmupRequests?: number
    timeout?: number
  }
): Promise<{
  endpoint: string
  method: string
  totalRequests: number
  successful: number
  failed: number
  avgDuration: number
  minDuration: number
  maxDuration: number
  p95Duration: number
  rps: number
  totalTime: number
  errors: string[]
}> {
  const { totalRequests, concurrency, warmupRequests = 10, timeout = 30000 } = config

  console.log(
    `\n  Testing ${endpoint.method} ${endpoint.path} (${totalRequests + warmupRequests} requests)...`
  )

  const url = `${baseUrl}${endpoint.path}`
  const body = endpoint.body ? JSON.stringify(endpoint.body) : undefined

  // Warmup requests
  if (warmupRequests > 0) {
    const warmupReqs = Array(warmupRequests)
      .fill(null)
      .map(() => () => makeRequest(url, { method: endpoint.method, body, headers: endpoint.headers, timeout }))

    await runConcurrentRequests(warmupReqs, concurrency)
    console.log(`    Warmup complete (${warmupRequests} requests)`)
  }

  // Actual load test
  const testStartTime = performance.now()
  const allRequests = Array(totalRequests)
    .fill(null)
    .map(() => () => makeRequest(url, { method: endpoint.method, body, headers: endpoint.headers, timeout }))

  const results = await runConcurrentRequests(allRequests, concurrency)
  const testTotalTime = performance.now() - testStartTime

  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  const durations = results.map((r) => r.duration).sort((a, b) => a - b)
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
  const minDuration = durations[0]
  const maxDuration = durations[durations.length - 1]
  const p95Duration = durations[Math.floor(durations.length * 0.95)]
  const rps = (totalRequests / testTotalTime) * 1000
  const errors = results.filter((r) => r.error).map((r) => r.error)

  return {
    endpoint: endpoint.path,
    method: endpoint.method,
    totalRequests,
    successful,
    failed,
    avgDuration,
    minDuration,
    maxDuration,
    p95Duration,
    rps,
    totalTime: testTotalTime,
    errors: [...new Set(errors)], // Unique errors
  }
}

/**
 * Execute full load test suite
 */
export async function runLoadTest(config: LoadTestConfig): Promise<{
  totalTests: number
  testResults: any[]
  summary: {
    totalRequests: number
    totalSuccessful: number
    totalFailed: number
    avgResponseTime: number
    totalTime: number
    overallRps: number
  }
}> {
  const profiler = new MemoryProfiler()
  const tracker = new RequestDurationTracker()

  console.log('\n╔════════════════════════════════════════════════════════════════╗')
  console.log('║          PMC LOAD TESTING SUITE                               ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  console.log(`Base URL: ${config.baseUrl}`)
  console.log(`Endpoints: ${config.endpoints.length}`)
  console.log(`Total Requests per Endpoint: ${config.requestsPerEndpoint}`)
  console.log(`Concurrency: ${config.concurrency}`)
  console.log(`Total Estimated Requests: ${config.endpoints.length * config.requestsPerEndpoint}\n`)

  profiler.snapshot('Start')

  const testResults = []
  const overallStartTime = performance.now()

  for (const endpoint of config.endpoints) {
    const result = await testEndpoint(config.baseUrl, endpoint, {
      totalRequests: config.requestsPerEndpoint,
      concurrency: config.concurrency,
      warmupRequests: config.warmupRequests,
      timeout: config.timeout,
    })

    testResults.push(result)

    // Record for tracker
    result.totalRequests && tracker.record(endpoint.path, result.avgDuration)

    console.log(
      `    ✓ ${result.successful}/${result.totalRequests} successful | ` +
        `Avg: ${result.avgDuration.toFixed(2)}ms | ` +
        `RPS: ${result.rps.toFixed(1)}`
    )
  }

  const overallTotalTime = performance.now() - overallStartTime
  profiler.snapshot('End')

  // Calculate summary
  const totalRequests = testResults.reduce((sum, r) => sum + r.totalRequests, 0)
  const totalSuccessful = testResults.reduce((sum, r) => sum + r.successful, 0)
  const totalFailed = testResults.reduce((sum, r) => sum + r.failed, 0)
  const avgResponseTime = testResults.reduce((sum, r) => sum + r.avgDuration * r.totalRequests, 0) / totalRequests
  const overallRps = (totalRequests / overallTotalTime) * 1000

  return {
    totalTests: config.endpoints.length,
    testResults,
    summary: {
      totalRequests,
      totalSuccessful,
      totalFailed,
      avgResponseTime,
      totalTime: overallTotalTime,
      overallRps,
    },
  }
}

/**
 * Format load test results as a report
 */
export function formatLoadTestReport(results: {
  totalTests: number
  testResults: any[]
  summary: any
}): string {
  const { totalTests, testResults, summary } = results
  const successRate = ((summary.totalSuccessful / summary.totalRequests) * 100).toFixed(2)

  let report = '\n╔════════════════════════════════════════════════════════════════╗'
  report += '\n║               LOAD TEST RESULTS SUMMARY                         ║'
  report += '\n╚════════════════════════════════════════════════════════════════╝\n'

  report += `Total Tests:          ${totalTests}\n`
  report += `Total Requests:       ${summary.totalRequests}\n`
  report += `Successful:           ${summary.totalSuccessful} (${successRate}%)\n`
  report += `Failed:               ${summary.totalFailed}\n`
  report += `Avg Response Time:    ${summary.avgResponseTime.toFixed(2)}ms\n`
  report += `Overall RPS:          ${summary.overallRps.toFixed(1)}\n`
  report += `Total Duration:       ${(summary.totalTime / 1000).toFixed(2)}s\n\n`

  report += 'ENDPOINT RESULTS:\n'
  report += '-'.repeat(100) + '\n'
  report += 'Endpoint'.padEnd(30) + ' | Method | Successful | Avg(ms) | Min(ms) | Max(ms) | P95(ms) | RPS\n'
  report += '-'.repeat(100) + '\n'

  testResults.forEach((result) => {
    report += result.endpoint.padEnd(30)
    report += ` | ${result.method.padEnd(6)}`
    report += ` | ${String(result.successful).padStart(10)}`
    report += ` | ${result.avgDuration.toFixed(1).padStart(7)}`
    report += ` | ${result.minDuration.toFixed(1).padStart(7)}`
    report += ` | ${result.maxDuration.toFixed(1).padStart(7)}`
    report += ` | ${result.p95Duration.toFixed(1).padStart(7)}`
    report += ` | ${result.rps.toFixed(1).padStart(7)}\n`
  })

  report += '-'.repeat(100) + '\n'

  // Error summary
  const allErrors: string[] = []
  testResults.forEach((r) => {
    allErrors.push(...r.errors)
  })

  if (allErrors.length > 0) {
    report += '\n⚠️  ERRORS ENCOUNTERED:\n'
    const uniqueErrors = [...new Set(allErrors)]
    uniqueErrors.forEach((error) => {
      const count = allErrors.filter((e) => e === error).length
      report += `  • ${error} (${count} times)\n`
    })
  }

  return report
}

/**
 * Example: Create baseline load test configuration
 */
export function createBaselineConfig(): LoadTestConfig {
  return {
    baseUrl: 'http://localhost:5000',
    endpoints: [
      {
        name: 'Get Districts',
        method: 'GET',
        path: '/api/districts',
      },
      {
        name: 'Get Tehsils',
        method: 'GET',
        path: '/api/tehsils',
      },
      {
        name: 'Get Applicants',
        method: 'GET',
        path: '/api/applicants',
      },
      {
        name: 'Get Dashboard',
        method: 'GET',
        path: '/api/dashboard',
      },
      {
        name: 'Get Applicant Stats',
        method: 'GET',
        path: '/api/applicants/stats',
      },
    ],
    concurrency: 10,
    requestsPerEndpoint: 100,
    warmupRequests: 5,
    timeout: 30000,
  }
}

/**
 * Example: Create stress test configuration (high load)
 */
export function createStressConfig(): LoadTestConfig {
  const baseConfig = createBaselineConfig()
  return {
    ...baseConfig,
    concurrency: 50,
    requestsPerEndpoint: 500,
    warmupRequests: 20,
  }
}

/**
 * Example: Create sustained load test configuration
 */
export function createSustainedLoadConfig(): LoadTestConfig {
  const baseConfig = createBaselineConfig()
  return {
    ...baseConfig,
    concurrency: 25,
    requestsPerEndpoint: 250,
    warmupRequests: 10,
  }
}
