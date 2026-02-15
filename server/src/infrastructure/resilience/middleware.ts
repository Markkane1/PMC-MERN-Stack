/**
 * Week 6: Rate Limiting & Resilience Middleware
 * Integrates rate limiting and resilience patterns into Express middleware
 */

import { Request, Response, NextFunction } from 'express'
import { ipRateLimiter, endpointRateLimiter, userRateLimiter } from './rateLimiting'
import { metricsCollector } from '../monitoring/metrics'

/**
 * IP-based rate limiting middleware
 */
export function ipRateLimitingMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientIp = getClientIp(req)
  const status = ipRateLimiter.isAllowed(clientIp)

  res.setHeader('X-RateLimit-Limit', status.limit)
  res.setHeader('X-RateLimit-Remaining', status.remaining)
  res.setHeader('X-RateLimit-Reset', status.resetTime)

  if (!status.allowed) {
    res.setHeader('Retry-After', Math.ceil((status.resetTime - Date.now()) / 1000))

    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter: status.resetTime,
      timestamp: new Date().toISOString(),
    })
  }

  next()
}

/**
 * Endpoint-based rate limiting middleware
 * Limits per endpoint across all clients
 */
export function endpointRateLimitingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip monitoring endpoints from rate limiting
  if (req.path.startsWith('/monitoring')) {
    return next()
  }

  const status = endpointRateLimiter.isAllowed(req.path, req.method)

  res.setHeader('X-Endpoint-RateLimit-Limit', status.limit)
  res.setHeader('X-Endpoint-RateLimit-Remaining', status.remaining)
  res.setHeader('X-Endpoint-RateLimit-Reset', status.resetTime)

  if (!status.allowed) {
    res.setHeader('Retry-After', Math.ceil((status.resetTime - Date.now()) / 1000))

    metricsCollector.recordEndpointRequest(req.path, req.method, 0, true)

    return res.status(429).json({
      success: false,
      error: 'Endpoint rate limit exceeded',
      retryAfter: status.resetTime,
      timestamp: new Date().toISOString(),
    })
  }

  next()
}

/**
 * User-based rate limiting middleware
 * For authenticated endpoints: limits per user
 */
export function userRateLimitingMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id
  if (!userId) {
    return next() // Not authenticated, skip
  }

  const status = userRateLimiter.isAllowed(userId)

  res.setHeader('X-User-RateLimit-Limit', status.limit)
  res.setHeader('X-User-RateLimit-Remaining', status.remaining)
  res.setHeader('X-User-RateLimit-Reset', status.resetTime)

  if (!status.allowed) {
    res.setHeader('Retry-After', Math.ceil((status.resetTime - Date.now()) / 1000))

    return res.status(429).json({
      success: false,
      error: 'User rate limit exceeded',
      retryAfter: status.resetTime,
      timestamp: new Date().toISOString(),
    })
  }

  next()
}

/**
 * Extract client IP from request
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  )
}

/**
 * Export rate limiting status endpoint data
 */
export function getRateLimitingStats() {
  return {
    ipLimits: ipRateLimiter,
    endpointLimits: endpointRateLimiter.getStats(),
    userLimits: 'Per-user limits tracked',
  }
}

/**
 * Reset rate limits (admin only)
 */
export function resetRateLimits(scope?: 'ip' | 'endpoint' | 'user', identifier?: string) {
  if (!scope) {
    ipRateLimiter.clear()
    endpointRateLimiter.clear()
    userRateLimiter.clear()
    return { success: true, message: 'All rate limits reset' }
  }

  if (scope === 'ip' && identifier) {
    ipRateLimiter.reset(identifier)
    return { success: true, message: `Rate limit reset for IP: ${identifier}` }
  }

  if (scope === 'endpoint' && identifier) {
    const [method, path] = identifier.split(' ')
    endpointRateLimiter.reset(path, method)
    return { success: true, message: `Rate limit reset for endpoint: ${identifier}` }
  }

  if (scope === 'user' && identifier) {
    userRateLimiter.reset(identifier)
    return { success: true, message: `Rate limit reset for user: ${identifier}` }
  }

  return { success: false, message: 'Invalid reset parameters' }
}
