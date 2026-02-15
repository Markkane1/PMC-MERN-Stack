/**
 * Stage 1: Simple In-Memory Cache
 * 
 * Fast, lightweight caching for frequently accessed read-only data.
 * No external dependencies - uses Node.js Map.
 * 
 * Usage:
 *   getCache('districts:all') // Check cache
 *   setCache('districts:all', data, 3600) // Cache for 1 hour
 *   clearCache('districts:all') // Clear specific key
 *   clearAllCache() // Clear everything
 */

interface CacheEntry {
  value: any
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

/**
 * Cleanup expired entries periodically
 */
setInterval(() => {
  const now = Date.now()
  let cleaned = 0

  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) {
      cache.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    console.log(`[Cache] Cleaned ${cleaned} expired entries`)
  }
}, 60000) // Run every minute

/**
 * Get value from cache
 * @param key Cache key
 * @returns Value or null if not found/expired
 */
export function getCache(key: string): any | null {
  const entry = cache.get(key)

  if (!entry) {
    return null
  }

  // Check if expired
  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }

  return entry.value
}

/**
 * Set value in cache
 * @param key Cache key
 * @param value Value to cache
 * @param ttlSeconds Time to live in seconds
 */
export function setCache(key: string, value: any, ttlSeconds: number = 3600): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

/**
 * Clear specific cache entry
 * @param key Cache key to clear
 */
export function clearCache(key: string): void {
  cache.delete(key)
}

/**
 * Clear cache entries by pattern
 * @param pattern Pattern to match (e.g., "districts:*")
 */
export function clearCachePattern(pattern: string): void {
  const regex = new RegExp(pattern.replace(/\*/g, '.*'))
  let cleared = 0

  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key)
      cleared++
    }
  }

  if (cleared > 0) {
    console.log(`[Cache] Cleared ${cleared} entries matching pattern: ${pattern}`)
  }
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  const count = cache.size
  cache.clear()
  if (count > 0) {
    console.log(`[Cache] Cleared ${count} entries`)
  }
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  }
}
