/**
 * Week 4: ETag and Cache Validation
 * HTTP 304 Not Modified responses for efficient caching
 */

import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

/**
 * Generate ETag from data
 */
export function generateETag(data: any): string {
  const content = typeof data === 'string' ? data : JSON.stringify(data)
  return `"${crypto.createHash('md5').update(content).digest('hex')}"`
}

/**
 * ETag middleware for conditional requests
 * Responds with 304 Not Modified if ETag matches
 */
export function etagMiddleware(req: Request, res: Response, next: NextFunction) {
  // Store original send method
  const originalSend = res.send

  res.send = ((data: any) => {
    // Generate ETag for response
    const etag = generateETag(data)
    res.setHeader('ETag', etag)

    // Check If-None-Match header
    const ifNoneMatch = req.headers['if-none-match']
    if (ifNoneMatch === etag) {
      // Client has current version, return 304 Not Modified
      res.status(304)
      return res.end()
    }

    // Send full response
    return originalSend.call(res, data)
  }) as any

  next()
}

/**
 * Last-Modified header middleware for time-based validation
 */
export function lastModifiedMiddleware(req: Request, res: Response, next: NextFunction) {
  // Store original send method
  const originalSend = res.send

  res.send = ((data: any) => {
    const now = new Date()
    res.setHeader('Last-Modified', now.toUTCString())

    // Check If-Modified-Since header
    const ifModifiedSince = req.headers['if-modified-since']
    if (ifModifiedSince) {
      const clientDate = new Date(ifModifiedSince)
      // If client version is same or newer, return 304
      if (clientDate >= now) {
        res.status(304)
        return res.end()
      }
    }

    return originalSend.call(res, data)
  }) as any

  next()
}

/**
 * Validate conditional requests
 * Returns object with isModified flag
 */
export function validateConditionalRequest(
  req: Request,
  currentETag: string,
  lastModified: Date
): { isModified: boolean; statusCode: number } {
  // Check If-None-Match (ETag-based)
  const ifNoneMatch = req.headers['if-none-match']
  if (ifNoneMatch && ifNoneMatch === currentETag) {
    return { isModified: false, statusCode: 304 }
  }

  // Check If-Modified-Since (time-based)
  const ifModifiedSince = req.headers['if-modified-since']
  if (ifModifiedSince) {
    const clientDate = new Date(ifModifiedSince)
    if (clientDate >= lastModified) {
      return { isModified: false, statusCode: 304 }
    }
  }

  return { isModified: true, statusCode: 200 }
}

/**
 * Cache validation key builder
 * Creates unique cache key for conditional requests
 */
export function buildCacheKey(
  endpoint: string,
  filters: Record<string, any> = {}
): string {
  const filterStr = Object.entries(filters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  return `${endpoint}:${filterStr || 'all'}`
}
