import { createApp } from './app'
import { connectDb } from './infrastructure/config/db'
import { env } from './infrastructure/config/env'
import { SystemMetricsCollector } from './infrastructure/monitoring'
import { healthCheckAggregator, MemoryHealthCheck } from './infrastructure/ha'
import { initializeServiceTokens } from './interfaces/http/middlewares/externalTokenAuth'

async function start() {
  // Initialize external service tokens for PITB, ePay, etc.
  initializeServiceTokens()

  await connectDb()
  const app = createApp()

  // Week 5: Start system metrics collector (collects metrics every 10s)
  const metricsCollector = new SystemMetricsCollector(10000)
  metricsCollector.start()

  // Week 7: Initialize health checks
  healthCheckAggregator.addCheck(new MemoryHealthCheck('memory', 85))
  healthCheckAggregator.startPeriodicChecks(30000) // Every 30 seconds

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`PMC MERN API running on port ${env.port}`)
    // eslint-disable-next-line no-console
    console.log('📊 Monitoring enabled - Access metrics at http://localhost:${env.port}/monitoring/health')
    // eslint-disable-next-line no-console
    console.log('🚀 HA enabled - Access HA status at http://localhost:${env.port}/ha/status')
  })
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})

