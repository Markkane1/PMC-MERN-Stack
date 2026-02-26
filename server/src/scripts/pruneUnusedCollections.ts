import mongoose from 'mongoose'
import { env } from '../infrastructure/config/env'
import { API_COLLECTION_ALLOW_SET } from '../infrastructure/database/collectionAllowList'

function log(message: string) {
  // eslint-disable-next-line no-console
  console.log(message)
}

function isSystemCollection(name: string) {
  return name.startsWith('system.')
}

async function main() {
  const shouldApply = process.argv.includes('--apply')

  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })
  try {
    const collections = await mongoose.connection.db!.listCollections().toArray()
    const allNames = collections.map((c) => c.name).filter((name) => !isSystemCollection(name))
    const pruneCandidates = allNames.filter((name) => !API_COLLECTION_ALLOW_SET.has(name))

    if (!pruneCandidates.length) {
      log('No unused collections detected.')
      return
    }

    log(`Unused collections (${pruneCandidates.length}):`)
    for (const name of pruneCandidates) {
      log(`- ${name}`)
    }

    if (!shouldApply) {
      log('Dry run only. Re-run with --apply to drop these collections.')
      return
    }

    for (const name of pruneCandidates) {
      log(`Dropping ${name}`)
      await mongoose.connection.db!.dropCollection(name)
    }
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})

