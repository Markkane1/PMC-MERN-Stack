import { getRedisClient, Redis } from './redisClient'
import { getCache, setCache, clearCache, clearCachePattern, getCacheStats } from './memory'

interface CacheOptions {
  ttl?: number
  namespace?: string
}

export class CacheManager {
  private redis: Redis
  private namespace: string
  private useMemoryFallback: boolean

  constructor(namespace: string = 'pmc') {
    this.redis = getRedisClient()
    this.namespace = namespace
    this.useMemoryFallback = !process.env.REDIS_HOST
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key)
    if (this.useMemoryFallback) {
      return (getCache(fullKey) as T | null) ?? null
    }

    try {
      const value = await this.redis.get(fullKey)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 3600
    const fullKey = this.getKey(key)
    if (this.useMemoryFallback) {
      setCache(fullKey, value, ttl)
      return
    }

    try {
      await this.redis.setex(fullKey, ttl, JSON.stringify(value))
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
    }
  }

  async del(key: string): Promise<void> {
    const fullKey = this.getKey(key)
    if (this.useMemoryFallback) {
      clearCache(fullKey)
      return
    }

    try {
      await this.redis.del(fullKey)
    } catch (error) {
      console.error(`Cache del error for key ${key}:`, error)
    }
  }

  async delPattern(pattern: string): Promise<void> {
    const fullPattern = this.getKey(pattern)
    if (this.useMemoryFallback) {
      clearCachePattern(fullPattern)
      return
    }

    try {
      const keys = await this.redis.keys(fullPattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error(`Cache delPattern error for pattern ${pattern}:`, error)
    }
  }

  async clear(): Promise<void> {
    const pattern = this.getKey('*')
    if (this.useMemoryFallback) {
      clearCachePattern(pattern)
      return
    }

    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache clear error:', error)
    }
  }

  async isHealthy(): Promise<boolean> {
    if (this.useMemoryFallback) {
      return true
    }

    try {
      const pong = await this.redis.ping()
      return pong === 'PONG'
    } catch {
      return false
    }
  }

  async getStats(): Promise<{ keys: number; memory: string } | null> {
    if (this.useMemoryFallback) {
      const stats = getCacheStats()
      return { keys: stats.size, memory: 'memory-fallback' }
    }

    try {
      const pattern = this.getKey('*')
      const keys = await this.redis.keys(pattern)
      const info = await this.redis.info('memory')
      const memoryMatch = info.match(/used_memory_human:(.+?)\r/)
      const memory = memoryMatch ? memoryMatch[1] : 'unknown'
      return { keys: keys.length, memory }
    } catch {
      return null
    }
  }
}

export const cacheManager = new CacheManager()
