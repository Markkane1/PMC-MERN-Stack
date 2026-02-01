import { createApp } from './app'
import { connectDb } from './infrastructure/config/db'
import { env } from './infrastructure/config/env'

async function start() {
  await connectDb()
  const app = createApp()
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`PMC MERN API running on port ${env.port}`)
  })
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
