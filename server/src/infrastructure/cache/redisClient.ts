import Redis from 'ioredis'

let redisInstance: Redis | null = null

// Minimal dummy client that satisfies the subset of methods used by CacheManager
class NoopRedis {
  async get(_key: string) { return null }
  async setex(_key: string, _ttl: number, _val: string) { return 'OK' }
  async del(_key: string, ..._rest: string[]) { return 0 }
  async keys(_pattern: string) { return [] }
  async ping() { return 'PONG' }
  async info(_section?: string) { return '' }
  async quit() { return Promise.resolve('OK') }
}
const noopRedis = new NoopRedis() as unknown as Redis

/**
 * Returns either a real Redis client or a no-op stub when Redis is not
 * configured. The environment variable `REDIS_HOST` is used as a simple
 * indicator; you may also use a dedicated `REDIS_ENABLED=false` flag.
 */
export function getRedisClient(): Redis {
  const configured = !!process.env.REDIS_HOST
  if (!configured) {
    if (!redisInstance) {
      console.warn('⚠️ Redis not configured, using no-op cache client')
      redisInstance = noopRedis
    }
    return redisInstance
  }

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
      enableOfflineQueue: false, // avoid queuing when disconnected
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
