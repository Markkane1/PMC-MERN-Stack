import IORedis from 'ioredis'
import { LRUCache } from 'lru-cache'

const LRU_FALLBACK_MAX_ENTRIES = 500
const LRU_FALLBACK_TTL_MS = 5 * 60 * 1000

export interface CacheClient {
  get(key: string): Promise<string | null>
  setex(key: string, ttl: number, value: string): Promise<string>
  del(key: string, ...rest: string[]): Promise<number>
  keys(pattern: string): Promise<string[]>
  ping(): Promise<string>
  info(section?: string): Promise<string>
  quit(): Promise<string>
}

let redisInstance: CacheClient | null = null

function wildcardPatternToRegex(pattern: string) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`)
}

class LruRedisFallback implements CacheClient {
  private readonly cache = new LRUCache<string, string>({
    max: LRU_FALLBACK_MAX_ENTRIES,
    ttl: LRU_FALLBACK_TTL_MS,
  })

  async get(key: string) {
    return this.cache.get(key) ?? null
  }

  async setex(key: string, ttl: number, value: string) {
    this.cache.set(key, value, { ttl: ttl * 1000 })
    return 'OK'
  }

  async del(key: string, ...rest: string[]) {
    const keys = [key, ...rest]
    let deleted = 0
    for (const targetKey of keys) {
      if (this.cache.delete(targetKey)) {
        deleted += 1
      }
    }
    return deleted
  }

  async keys(pattern: string) {
    const regex = wildcardPatternToRegex(pattern)
    return Array.from(this.cache.keys()).filter((key) => regex.test(key))
  }

  async ping() {
    return 'PONG'
  }

  async info(_section?: string) {
    return `used_memory_human:lru-fallback (${this.cache.size} entries)\r`
  }

  async quit() {
    this.cache.clear()
    return 'OK'
  }
}

const lruFallback = new LruRedisFallback()

/**
 * Returns either a real Redis client or an in-memory LRU-backed fallback when Redis
 * is not configured. The fallback implements the subset of Redis methods used by the app.
 */
export function getRedisClient(): CacheClient {
  const configured = Boolean(process.env.REDIS_HOST)
  if (!configured) {
    if (!redisInstance) {
      console.warn('Redis not configured, using in-memory LRU cache client')
      redisInstance = lruFallback
    }
    return redisInstance
  }

  if (!redisInstance) {
    const rawClient = new IORedis({
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
      enableOfflineQueue: false,
      lazyConnect: false,
    })

    rawClient.on('error', (err) => {
      console.error('Redis error:', err.message)
    })

    rawClient.on('connect', () => {
      console.log('Redis connected')
    })

    rawClient.on('disconnect', () => {
      console.log('Redis disconnected')
    })

    redisInstance = {
      get: (key) => rawClient.get(key),
      setex: (key, ttl, value) => rawClient.setex(key, ttl, value),
      del: (key, ...rest) => rawClient.del(key, ...rest),
      keys: (pattern) => rawClient.keys(pattern),
      ping: () => rawClient.ping(),
      info: (section) => (section ? rawClient.info(section) : rawClient.info()),
      quit: () => rawClient.quit(),
    }
  }

  return redisInstance!
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit()
    redisInstance = null
    console.log('Cache client connection closed')
  }
}

export { IORedis as Redis }
