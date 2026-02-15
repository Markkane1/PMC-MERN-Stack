/**
 * Stage 2.4: Baseline Load Test Runner
 * 
 * Run: npm run load:test:baseline
 * 
 * Baseline load test with moderate concurrency on core endpoints
 */

import {
  runLoadTest,
  formatLoadTestReport,
  createBaselineConfig,
} from './loadTest'

async function main() {
  const config = createBaselineConfig()

  try {
    console.log('Starting baseline load test...')
    const results = await runLoadTest(config)

    console.log(formatLoadTestReport(results))

    // Exit with success code if all requests succeeded
    const failureRate = (results.summary.totalFailed / results.summary.totalRequests) * 100
    if (failureRate > 5) {
      console.warn(`\n⚠️  WARNING: High failure rate (${failureRate.toFixed(1)}%)`)
      process.exit(1)
    } else {
      console.log('\n✓ Baseline load test completed successfully')
      process.exit(0)
    }
  } catch (error) {
    console.error('Load test failed:', error)
    process.exit(1)
  }
}

main()
