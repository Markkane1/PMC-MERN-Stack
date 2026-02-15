/**
 * Stage 2.4: Sustained Load Test Runner
 * 
 * Run: npm run load:test:sustained
 * 
 * Sustained load test simulating typical production traffic
 * Used to detect memory leaks and performance degradation over time
 */

import {
  runLoadTest,
  formatLoadTestReport,
  createSustainedLoadConfig,
} from './loadTest'
import { MemoryProfiler } from '../infrastructure/utils/performance'

async function main() {
  const config = createSustainedLoadConfig()
  const memoryProfiler = new MemoryProfiler()

  try {
    console.log('Starting sustained load test...')
    console.log('This test simulates typical production traffic patterns\n')

    memoryProfiler.snapshot('Test Start')

    const results = await runLoadTest(config)

    memoryProfiler.snapshot('Test End')

    console.log(formatLoadTestReport(results))
    console.log(memoryProfiler.generateReport())

    // Analyze results
    const failureRate = (results.summary.totalFailed / results.summary.totalRequests) * 100

    console.log('\n📊 SUSTAINED LOAD ANALYSIS:')
    console.log(`  Total Requests:   ${results.summary.totalRequests}`)
    console.log(`  Success Rate:     ${(100 - failureRate).toFixed(1)}%`)
    console.log(`  Avg Response:     ${results.summary.avgResponseTime.toFixed(2)}ms`)
    console.log(`  Sustained RPS:    ${results.summary.overallRps.toFixed(1)}`)

    // Check for memory issues
    const memoryTrend = memoryProfiler.getTrend()
    if (memoryTrend) {
      console.log(`\n💾 MEMORY ANALYSIS:`)
      console.log(`  Initial Heap:     ${(memoryTrend.startHeap / 1024 / 1024).toFixed(2)}MB`)
      console.log(`  Final Heap:       ${(memoryTrend.endHeap / 1024 / 1024).toFixed(2)}MB`)
      console.log(`  Growth:           ${memoryTrend.growthMB.toFixed(2)}MB (${memoryTrend.growthPercentage.toFixed(1)}%)`)

      if (memoryProfiler.detectMemoryLeak()) {
        console.warn(`\n⚠️  WARNING: Potential memory leak detected!`)
        console.warn(
          `  Heap grew by ${memoryTrend.growthPercentage.toFixed(1)}%. ` +
          `This may indicate a memory leak or inefficient caching.`
        )
        process.exit(1)
      } else {
        console.log('  ✓ No memory leak detected')
      }
    }

    process.exit(failureRate > 5 ? 1 : 0)
  } catch (error) {
    console.error('Sustained load test failed:', error)
    process.exit(1)
  }
}

main()
