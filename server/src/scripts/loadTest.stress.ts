/**
 * Stage 2.4: Stress Load Test Runner
 * 
 * Run: npm run load:test:stress
 * 
 * High-intensity stress test with maximum concurrency
 * Used to find breaking points and max capacity
 */

import {
  runLoadTest,
  formatLoadTestReport,
  createStressConfig,
} from './loadTest'

async function main() {
  const config = createStressConfig()

  try {
    console.log('Starting stress load test...')
    console.log('⚠️  WARNING: This test will generate high load. Ensure system resources are available.\n')

    const results = await runLoadTest(config)

    console.log(formatLoadTestReport(results))

    // Analyze results
    const failureRate = (results.summary.totalFailed / results.summary.totalRequests) * 100
    const avgTime = results.summary.avgResponseTime

    console.log('\n📊 STRESS TEST ANALYSIS:')
    console.log(`  Total Requests:   ${results.summary.totalRequests}`)
    console.log(`  Successful:       ${results.summary.totalSuccessful} (${(100 - failureRate).toFixed(1)}%)`)
    console.log(`  Failed:           ${results.summary.totalFailed} (${failureRate.toFixed(1)}%)`)
    console.log(`  Avg Response:     ${avgTime.toFixed(2)}ms`)
    console.log(`  Peak RPS:         ${results.summary.overallRps.toFixed(1)}`)

    if (failureRate > 10) {
      console.warn(`\n⚠️  System struggling under stress: ${failureRate.toFixed(1)}% failure rate`)
    } else if (failureRate > 1) {
      console.warn(`\n⚠️  Some failures detected: ${failureRate.toFixed(1)}% failure rate`)
    } else {
      console.log('\n✓ System handling stress well')
    }

    process.exit(failureRate > 20 ? 1 : 0)
  } catch (error) {
    console.error('Stress test failed:', error)
    process.exit(1)
  }
}

main()
