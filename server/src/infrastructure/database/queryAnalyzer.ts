import mongoose from 'mongoose'

/**
 * Week 3: Query Performance Analysis
 * Identifies and reports slow database queries
 */

export async function analyzeSlowQueries(
  slowThreshold: number = 100  // milliseconds
): Promise<void> {
  const db = mongoose.connection.db
  if (!db) throw new Error('Database not connected')

  try {
    console.log('\n🔍 Analyzing slow queries from profiling collection...')
    console.log(`   Slow query threshold: ${slowThreshold}ms\n`)

    // Fetch slow queries from system.profile collection
    const profile = db.collection('system.profile')
    const slowQueries = await profile
      .find({ millis: { $gt: slowThreshold } })
      .sort({ ts: -1 })
      .limit(30)
      .toArray()

    if (slowQueries.length === 0) {
      console.log('✅ No slow queries found!')
      return
    }

    console.log(`Found ${slowQueries.length} slow queries:\n`)

    // Group by collection
    const byCollection: Record<string, any[]> = {}
    slowQueries.forEach((q: any) => {
      const collection = q.ns?.split('.')[1] || 'unknown'
      if (!byCollection[collection]) {
        byCollection[collection] = []
      }
      byCollection[collection].push(q)
    })

    // Display results by collection
    Object.entries(byCollection).forEach(([collection, queries]) => {
      console.log(`\n📍 Collection: ${collection}`)
      console.log('─'.repeat(80))

      queries.slice(0, 5).forEach((q: any, idx: number) => {
        console.log(`\n${idx + 1}. Operation: ${q.op}`)
        console.log(`   Duration: ${q.millis}ms`)
        console.log(`   Docs scanned: ${q.nscanned || 'unknown'}`)
        console.log(`   Docs returned: ${q.nreturned || 'unknown'}`)
        if (q.command?.filter) {
          console.log(`   Filter: ${JSON.stringify(q.command.filter)}`)
        }
        if (q.command?.sort) {
          console.log(`   Sort: ${JSON.stringify(q.command.sort)}`)
        }
      })
    })

    console.log('\n\n💡 Optimization Tips:')
    console.log('   1. Create indexes on frequently filtered fields')
    console.log('   2. Use composite indexes for multiple filter conditions')
    console.log('   3. Add projection to exclude unnecessary fields')
    console.log('   4. Use .lean() for read-only queries')
    console.log('\n✅ Query analysis complete\n')
  } catch (error) {
    console.error('Error during query analysis:', error)
  }
}

/**
 * Get index information for a collection
 */
export async function getCollectionIndexes(collectionName: string): Promise<void> {
  const collection = mongoose.connection.collection(collectionName)
  if (!collection) {
    console.error(`Collection ${collectionName} not found`)
    return
  }

  try {
    const indexes = await collection.listIndexes().toArray()

    console.log(`\n📋 Indexes for collection: ${collectionName}`)
    console.log('─'.repeat(80))

    indexes.forEach((idx: any, i: number) => {
      console.log(`\n${i + 1}. ${idx.name}`)
      console.log(`   Keys: ${JSON.stringify(idx.key)}`)
      if (idx.unique) console.log(`   Unique: true`)
      if (idx.sparse) console.log(`   Sparse: true`)
      if (idx.expireAfterSeconds) console.log(`   TTL: ${idx.expireAfterSeconds}s`)
    })

    console.log('\n')
  } catch (error) {
    console.error('Error fetching indexes:', error)
  }
}

/**
 * Get database performance statistics
 */
export async function getDatabaseStats(): Promise<void> {
  const db = mongoose.connection.db
  if (!db) throw new Error('Database not connected')

  try {
    console.log('\n📊 Database Performance Statistics')
    console.log('═'.repeat(80))

    // Get server status
    const serverStatus = await db.admin().serverStatus()

    console.log('\n🔹 Connections:')
    console.log(
      `   Current: ${serverStatus?.connections?.current} | Available: ${serverStatus?.connections?.available}`
    )

    console.log('\n🔹 Memory (MB):')
    console.log(
      `   Resident: ${(serverStatus?.mem?.resident || 0).toFixed(2)} | Virtual: ${(serverStatus?.mem?.virtual || 0).toFixed(2)}`
    )

    console.log('\n🔹 Operations:')
    if (serverStatus?.opcounters) {
      const ops = serverStatus.opcounters
      console.log(`   Insert: ${ops.insert} | Query: ${ops.query} | Update: ${ops.update} | Delete: ${ops.delete}`)
    }

    console.log('\n🔹 Global Lock:')
    if (serverStatus?.globalLock) {
      const lock = serverStatus.globalLock
      console.log(`   Total Time: ${(lock.totalTime / 1000000).toFixed(2)}s`)
      console.log(`   Lock Time: ${(lock.lockTime / 1000000).toFixed(2)}s`)
    }

    console.log('\n')
  } catch (error) {
    console.error('Error fetching database stats:', error)
  }
}

export default {
  analyzeSlowQueries,
  getCollectionIndexes,
  getDatabaseStats,
}
