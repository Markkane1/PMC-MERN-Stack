import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalRedisHost = process.env.REDIS_HOST

describe('cache fallback client', () => {
  beforeEach(() => {
    delete process.env.REDIS_HOST
    vi.resetModules()
  })

  afterEach(async () => {
    const { closeRedis } = await import('../../server/src/infrastructure/cache/redisClient')
    await closeRedis()
    vi.useRealTimers()
    vi.restoreAllMocks()
    if (originalRedisHost) {
      process.env.REDIS_HOST = originalRedisHost
    } else {
      delete process.env.REDIS_HOST
    }
  })

  it('uses the in-memory LRU fallback when Redis is not configured', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { getRedisClient } = await import('../../server/src/infrastructure/cache/redisClient')

    const client = getRedisClient()
    await client.setex('alpha', 60, 'value')

    expect(await client.get('alpha')).toBe('value')
    expect(await client.ping()).toBe('PONG')
    expect(warnSpy).toHaveBeenCalledWith('Redis not configured, using in-memory LRU cache client')
  })

  it('expires fallback entries based on TTL', async () => {
    const { getRedisClient } = await import('../../server/src/infrastructure/cache/redisClient')

    const client = getRedisClient()
    await client.setex('short-lived', 1, 'value')

    expect(await client.get('short-lived')).toBe('value')
    await new Promise((resolve) => setTimeout(resolve, 1100))
    expect(await client.get('short-lived')).toBeNull()
  })

  it('evicts the least recently used entry after 500 cached items', async () => {
    const { getRedisClient } = await import('../../server/src/infrastructure/cache/redisClient')
    const client = getRedisClient()

    for (let index = 0; index <= 500; index += 1) {
      await client.setex(`key-${index}`, 60, `value-${index}`)
    }

    expect(await client.get('key-0')).toBeNull()
    expect(await client.get('key-500')).toBe('value-500')
  })
})
