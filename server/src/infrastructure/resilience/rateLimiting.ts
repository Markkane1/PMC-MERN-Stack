/**
 * Cache-backed rate limiting primitives.
 * Uses an in-process LRU+TTL store so counters survive across requests without Redis.
 */

import { LruTtlCache } from '../cache/lru'

type RateLimitEntry = {
  count: number
  windowStart: number
  blockUntil: number
}

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  backoffBaseMs?: number
  maxBackoffMs?: number
  keyPrefix?: string
}

export interface RateLimitStatus {
  remaining: number
  limit: number
  resetTime: number
  allowed: boolean
  retryAfterMs: number
}

const DEFAULT_CACHE_SIZE = 10_000
const rateLimitCache = new LruTtlCache<RateLimitEntry>(DEFAULT_CACHE_SIZE)

function nowMs() {
  return Date.now()
}

export class CacheBackedRateLimiter {
  constructor(private readonly config: RateLimitConfig) {}

  isAllowed(key: string): RateLimitStatus {
    const now = nowMs()
    const cacheKey = this.getCacheKey(key)
    const existing = rateLimitCache.get(cacheKey)

    const windowStart =
      existing && now - existing.windowStart < this.config.windowMs
        ? existing.windowStart
        : now
    const windowReset = windowStart + this.config.windowMs
    const entry: RateLimitEntry = existing && now < windowReset
      ? { ...existing, windowStart }
      : { count: 0, windowStart: now, blockUntil: 0 }

    if (entry.blockUntil > now) {
      rateLimitCache.set(cacheKey, entry, this.getEntryTtlMs(entry, windowReset))
      return this.toStatus(entry, false, windowReset)
    }

    entry.count += 1
    const allowed = entry.count <= this.config.maxRequests

    if (!allowed) {
      const overflowCount = entry.count - this.config.maxRequests
      const backoffBaseMs = this.config.backoffBaseMs ?? 0
      const backoffMs = backoffBaseMs > 0
        ? Math.min(
            this.config.maxBackoffMs ?? this.config.windowMs,
            backoffBaseMs * 2 ** Math.max(0, overflowCount - 1)
          )
        : Math.max(0, windowReset - now)

      entry.blockUntil = Math.min(windowReset, now + backoffMs)
    } else {
      entry.blockUntil = 0
    }

    rateLimitCache.set(cacheKey, entry, this.getEntryTtlMs(entry, windowReset))
    return this.toStatus(entry, allowed, windowReset)
  }

  getStatus(key: string): RateLimitStatus {
    const now = nowMs()
    const cacheKey = this.getCacheKey(key)
    const entry = rateLimitCache.get(cacheKey)

    if (!entry) {
      return {
        remaining: this.config.maxRequests,
        limit: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        allowed: true,
        retryAfterMs: 0,
      }
    }

    const windowReset = entry.windowStart + this.config.windowMs
    if (windowReset <= now) {
      rateLimitCache.delete(cacheKey)
      return {
        remaining: this.config.maxRequests,
        limit: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        allowed: true,
        retryAfterMs: 0,
      }
    }

    const allowed = entry.blockUntil <= now && entry.count < this.config.maxRequests
    return this.toStatus(entry, allowed, windowReset)
  }

  reset(key: string): void {
    rateLimitCache.delete(this.getCacheKey(key))
  }

  clear(): void {
    const prefix = `${this.config.keyPrefix || 'rate'}:`
    for (const [cacheKey] of rateLimitCache.entries()) {
      if (cacheKey.startsWith(prefix)) {
        rateLimitCache.delete(cacheKey)
      }
    }
  }

  getStats(): Record<string, RateLimitStatus> {
    const prefix = `${this.config.keyPrefix || 'rate'}:`
    const entries: Array<[string, RateLimitStatus]> = []

    for (const [cacheKey] of rateLimitCache.entries()) {
      if (!cacheKey.startsWith(prefix)) {
        continue
      }

      const key = cacheKey.slice(prefix.length)
      entries.push([key, this.getStatus(key)])
    }

    return Object.fromEntries(entries) as Record<string, RateLimitStatus>
  }

  private getCacheKey(key: string) {
    return `${this.config.keyPrefix || 'rate'}:${key}`
  }

  private getEntryTtlMs(entry: RateLimitEntry, windowReset: number) {
    return Math.max(1_000, Math.max(windowReset, entry.blockUntil || 0) - nowMs())
  }

  private toStatus(entry: RateLimitEntry, allowed: boolean, windowReset: number): RateLimitStatus {
    const now = nowMs()
    const resetTime = entry.blockUntil > now ? entry.blockUntil : windowReset
    const remaining = allowed
      ? Math.max(0, this.config.maxRequests - entry.count)
      : 0

    return {
      remaining,
      limit: this.config.maxRequests,
      resetTime,
      allowed,
      retryAfterMs: Math.max(0, resetTime - now),
    }
  }
}

export function getClientIpAddress(headers: Record<string, unknown>, remoteAddress?: string | null): string {
  const forwardedFor = typeof headers['x-forwarded-for'] === 'string'
    ? headers['x-forwarded-for'].split(',')[0]?.trim()
    : ''
  const realIp = typeof headers['x-real-ip'] === 'string' ? headers['x-real-ip'] : ''
  return forwardedFor || realIp || remoteAddress || 'unknown'
}

export const generalApiRateLimiter = new CacheBackedRateLimiter({
  maxRequests: 200,
  windowMs: 60_000,
  keyPrefix: 'general-api',
})

export const loginRateLimiter = new CacheBackedRateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
  backoffBaseMs: 30_000,
  maxBackoffMs: 15 * 60 * 1000,
  keyPrefix: 'login',
})

export const captchaRateLimiter = new CacheBackedRateLimiter({
  maxRequests: 30,
  windowMs: 15 * 60 * 1000,
  keyPrefix: 'captcha',
})

export const profileRateLimiter = new CacheBackedRateLimiter({
  maxRequests: 120,
  windowMs: 60_000,
  keyPrefix: 'profile',
})

// Backward-compatible exports for resilience routes.
export const ipRateLimiter = generalApiRateLimiter
export const endpointRateLimiter = new CacheBackedRateLimiter({
  maxRequests: 1000,
  windowMs: 60_000,
  keyPrefix: 'endpoint',
})
export const userRateLimiter = new CacheBackedRateLimiter({
  maxRequests: 500,
  windowMs: 60_000,
  keyPrefix: 'user',
})
