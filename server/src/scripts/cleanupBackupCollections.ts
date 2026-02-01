import mongoose from 'mongoose'
import { env } from '../infrastructure/config/env'

function log(message: string) {
  // eslint-disable-next-line no-console
  console.log(message)
}

async function main() {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })
  try {
    const collections = await mongoose.connection.db!.listCollections().toArray()
    const bakCollections = collections
      .map((c) => c.name)
      .filter((name) => name.includes('_bak_'))

    if (!bakCollections.length) {
      log('No _bak_ collections found.')
      return
    }

    for (const name of bakCollections) {
      log(`Dropping ${name}`)
      await mongoose.connection.db!.dropCollection(name)
    }
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
