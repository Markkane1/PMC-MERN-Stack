/**
 * Week 4: HTTP Headers Optimization
 * Cache-Control, Vary, and other header optimizations
 */

import { Request, Response, NextFunction } from 'express'

export interface CacheConfig {
  public?: boolean
  private?: boolean
  maxAge?: number // in seconds
  sMaxAge?: number // CDN cache in seconds
  mustRevalidate?: boolean
  noCache?: boolean
  noStore?: boolean
  immutable?: boolean
}

/**
 * Build Cache-Control header value
 */
export function buildCacheControl(config: CacheConfig): string {
  const directives: string[] = []

  if (config.public) directives.push('public')
  if (config.private) directives.push('private')
  if (config.noStore) directives.push('no-store')
  if (config.noCache) directives.push('no-cache')
  if (config.mustRevalidate) directives.push('must-revalidate')
  if (config.immutable) directives.push('immutable')
  if (config.maxAge !== undefined) directives.push(`max-age=${config.maxAge}`)
  if (config.sMaxAge !== undefined) directives.push(`s-maxage=${config.sMaxAge}`)

  return directives.join(', ')
}

/**
 * Set Cache-Control header based on endpoint type
 */
export function setCacheControl(res: Response, config: CacheConfig): void {
  const cacheControl = buildCacheControl(config)
  res.setHeader('Cache-Control', cacheControl)
}

/**
 * Cache configuration presets for common endpoint types
 */
export const CACHE_PRESETS = {
  // Public, cacheable for long time (resources, static data)
  LONG_CACHE: {
    public: true,
    maxAge: 86400, // 24 hours
    sMaxAge: 604800, // CDN: 7 days
    immutable: true,
  },

  // Public, moderate cache (list endpoints)
  MODERATE_CACHE: {
    public: true,
    maxAge: 3600, // 1 hour
    sMaxAge: 3600,
  },

  // Public, short cache (frequently changing data)
  SHORT_CACHE: {
    public: true,
    maxAge: 300, // 5 minutes
    sMaxAge: 300,
  },

  // Private, short cache (user-specific data)
  PRIVATE_SHORT_CACHE: {
    private: true,
    maxAge: 300, // 5 minutes
  },

  // Private, longer cache (user data)
  PRIVATE_MODERATE_CACHE: {
    private: true,
    maxAge: 1800, // 30 minutes
  },

  // No caching (sensitive/dynamic data)
  NO_CACHE: {
    private: true,
    noCache: true,
    mustRevalidate: true,
  },

  // Do not cache at all (critical ops)
  NO_STORE: {
    noStore: true,
  },
}

/**
 * Middleware factory for caching specific endpoints
 */
export function cacheControlMiddleware(config: CacheConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    setCacheControl(res, config)
    next()
  }
}

/**
 * Vary header builder for CDN cache busting
 * Tells CDN to cache separately based on these headers
 */
export function setVaryHeader(res: Response, headers: string[]): void {
  const existing = res.getHeader('Vary') as string
  const allHeaders = existing ? `${existing}, ${headers.join(', ')}` : headers.join(', ')
  res.setHeader('Vary', allHeaders)
}

/**
 * Set standard HTTP headers for API responses
 */
export function setSecurityHeaders(res: Response): void {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
}

/**
 * Comprehensive HTTP optimization middleware
 * Applies caching, vary headers, and security headers
 */
export function httpOptimizationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const path = req.path

  // Apply cache config based on endpoint
  if (path.includes('/api/districts') || path.includes('/api/tehsils')) {
    setCacheControl(res, CACHE_PRESETS.MODERATE_CACHE)
    setVaryHeader(res, ['Accept-Encoding', 'Accept'])
  } else if (path.includes('/api/applicants') && req.method === 'GET') {
    setCacheControl(res, CACHE_PRESETS.SHORT_CACHE)
    setVaryHeader(res, ['Accept-Encoding', 'Authorization'])
  } else if (path.includes('/api/') && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
    // Mutations: no cache
    setCacheControl(res, CACHE_PRESETS.NO_STORE)
  } else if (path.includes('/assets/')) {
    // Static assets: long cache with immutable
    setCacheControl(res, CACHE_PRESETS.LONG_CACHE)
  } else {
    // Default: short cache
    setCacheControl(res, CACHE_PRESETS.SHORT_CACHE)
  }

  // Set security headers
  setSecurityHeaders(res)

  // Add timing header (for monitoring)
  res.setHeader('X-Response-Time', `${Date.now()}ms`)

  next()
}

/**
 * Streaming response helper for large datasets
 * Sends data in chunks rather than all at once
 */
export function streamResponse(res: Response, data: any[], chunkSize: number = 100) {
  res.setHeader('Transfer-Encoding', 'chunked')
  res.setHeader('Content-Type', 'application/json')

  let current = 0
  const total = data.length

  const sendChunk = () => {
    if (current >= total) {
      res.end()
      return
    }

    const chunk = data.slice(current, current + chunkSize)
    current += chunkSize

    res.write(JSON.stringify(chunk))
    res.write('\n') // Newline for parsing

    // Send next chunk asynchronously
    setImmediate(sendChunk)
  }

  sendChunk()
}

/**
 * Example middleware chain for express:
 *
 * app.use(compressionMiddleware)
 * app.use(etagMiddleware)
 * app.use(fieldFilteringMiddleware)
 * app.use(httpOptimizationMiddleware)
 *
 * // Now all endpoints automatically get:
 * // - Gzip compression
 * // - ETag validation
 * // - Field filtering
 * // - Cache-Control headers
 * // - Vary headers for CDN
 * // - Security headers
 */
