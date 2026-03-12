/**
 * Express middleware helpers for cache-backed rate limiting.
 */

import { Request, Response, NextFunction } from 'express'
import { metricsCollector } from '../monitoring/metrics'
import {
  captchaRateLimiter,
  endpointRateLimiter,
  generalApiRateLimiter,
  getClientIpAddress,
  ipRateLimiter,
  loginRateLimiter,
  profileRateLimiter,
  type CacheBackedRateLimiter,
  type RateLimitStatus,
  userRateLimiter,
} from './rateLimiting'

function setRateLimitHeaders(res: Response, status: RateLimitStatus) {
  res.setHeader('X-RateLimit-Limit', String(status.limit))
  res.setHeader('X-RateLimit-Remaining', String(status.remaining))
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(status.resetTime / 1000)))
}

function rateLimitExceededResponse(
  res: Response,
  status: RateLimitStatus,
  error: string
) {
  setRateLimitHeaders(res, status)
  res.setHeader('Retry-After', String(Math.max(1, Math.ceil(status.retryAfterMs / 1000))))

  return res.status(429).json({
    success: false,
    error,
    retryAfter: status.resetTime,
    timestamp: new Date().toISOString(),
  })
}

function runLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
  limiter: CacheBackedRateLimiter,
  key: string,
  error: string,
  onRejected?: () => void
) {
  const status = limiter.isAllowed(key)
  setRateLimitHeaders(res, status)

  if (!status.allowed) {
    onRejected?.()
    return rateLimitExceededResponse(res, status, error)
  }

  return next()
}

export function getClientIp(req: Request): string {
  return getClientIpAddress(req.headers as Record<string, unknown>, req.socket.remoteAddress)
}

export function generalApiRateLimitingMiddleware(req: Request, res: Response, next: NextFunction) {
  return runLimiter(
    req,
    res,
    next,
    generalApiRateLimiter,
    getClientIp(req),
    'Too many requests'
  )
}

export function loginRateLimitingMiddleware(req: Request, res: Response, next: NextFunction) {
  return runLimiter(
    req,
    res,
    next,
    loginRateLimiter,
    getClientIp(req),
    'Too many login attempts, try again later'
  )
}

export function captchaRateLimitingMiddleware(req: Request, res: Response, next: NextFunction) {
  return runLimiter(
    req,
    res,
    next,
    captchaRateLimiter,
    getClientIp(req),
    'Too many CAPTCHA requests, try again later'
  )
}

export function profileRateLimitingMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || (req as any).user?._id
  if (!userId) {
    return next()
  }

  return runLimiter(
    req,
    res,
    next,
    profileRateLimiter,
    String(userId),
    'Profile rate limit exceeded'
  )
}

/**
 * Backward-compatible resilience middleware exports.
 */
export function ipRateLimitingMiddleware(req: Request, res: Response, next: NextFunction) {
  return runLimiter(req, res, next, ipRateLimiter, getClientIp(req), 'Too many requests')
}

export function endpointRateLimitingMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith('/monitoring')) {
    return next()
  }

  return runLimiter(
    req,
    res,
    next,
    endpointRateLimiter,
    `${req.method.toUpperCase()} ${req.path}`,
    'Endpoint rate limit exceeded',
    () => metricsCollector.recordEndpointRequest(req.path, req.method, 0, true)
  )
}

export function userRateLimitingMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || (req as any).user?._id
  if (!userId) {
    return next()
  }

  return runLimiter(
    req,
    res,
    next,
    userRateLimiter,
    String(userId),
    'User rate limit exceeded'
  )
}

export function getRateLimitingStats() {
  return {
    generalApi: generalApiRateLimiter.getStats(),
    login: loginRateLimiter.getStats(),
    captcha: captchaRateLimiter.getStats(),
    profile: profileRateLimiter.getStats(),
    endpointLimits: endpointRateLimiter.getStats(),
  }
}

export function resetRateLimits(scope?: 'ip' | 'endpoint' | 'user', identifier?: string) {
  if (!scope) {
    generalApiRateLimiter.clear()
    loginRateLimiter.clear()
    captchaRateLimiter.clear()
    profileRateLimiter.clear()
    endpointRateLimiter.clear()
    userRateLimiter.clear()
    return { success: true, message: 'All rate limits reset' }
  }

  if (scope === 'ip' && identifier) {
    generalApiRateLimiter.reset(identifier)
    loginRateLimiter.reset(identifier)
    captchaRateLimiter.reset(identifier)
    return { success: true, message: `Rate limits reset for IP: ${identifier}` }
  }

  if (scope === 'endpoint' && identifier) {
    endpointRateLimiter.reset(identifier)
    return { success: true, message: `Rate limit reset for endpoint: ${identifier}` }
  }

  if (scope === 'user' && identifier) {
    userRateLimiter.reset(identifier)
    profileRateLimiter.reset(identifier)
    return { success: true, message: `Rate limit reset for user: ${identifier}` }
  }

  return { success: false, message: 'Invalid reset parameters' }
}
