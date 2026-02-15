import Redis from 'ioredis'

let redisInstance: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      enableOfflineQueue: true,
      lazyConnect: false,
    })

    redisInstance.on('error', (err) => {
      console.error('❌ Redis error:', err.message)
    })

    redisInstance.on('connect', () => {
      console.log('✅ Redis connected')
    })

    redisInstance.on('disconnect', () => {
      console.log('⚠️  Redis disconnected')
    })
  }

  return redisInstance
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit()
    redisInstance = null
    console.log('✅ Redis connection closed')
  }
}

export { Redis }
