/**
 * Week 6: Resilience Management Routes
 * API endpoints for monitoring and managing rate limits, circuit breakers
 */

import { Router, Request, Response } from 'express'
import { ipRateLimiter, endpointRateLimiter, userRateLimiter } from './rateLimiting'
import { circuitBreakerManager } from './circuitBreaker'
import { getRateLimitingStats, resetRateLimits } from './middleware'

export const resilienceRouter = Router()

/**
 * GET /rate-limits
 * Get all rate limiting stats
 */
resilienceRouter.get('/rate-limits', (req: Request, res: Response) => {
  const response = {
    success: true,
    data: {
      summary: {
        ipLimiters: 'Active IP-based rate limiters',
        endpointLimiters: 'Active endpoint-based rate limiters',
      },
      endpointLimits: endpointRateLimiter.getStats(),
    },
    timestamp: new Date().toISOString(),
  }

  res.json(response)
})

/**
 * GET /rate-limits/ip/:ip
 * Get rate limit status for specific IP
 */
resilienceRouter.get('/rate-limits/ip/:ip', (req: Request, res: Response) => {
  const { ip } = req.params
  const status = ipRateLimiter.isAllowed(ip)

  res.json({
    success: true,
    data: {
      ip,
      status,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /rate-limits/endpoint
 * Get rate limits for all endpoints
 */
resilienceRouter.get('/rate-limits/endpoint', (req: Request, res: Response) => {
  const limits = endpointRateLimiter.getStats()

  res.json({
    success: true,
    data: {
      endpoints: limits,
      total: Object.keys(limits).length,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * DELETE /rate-limits/reset
 * Reset all rate limits
 */
resilienceRouter.delete('/rate-limits/reset', (req: Request, res: Response) => {
  const { scope, identifier } = req.query

  const result = resetRateLimits(
    scope as 'ip' | 'endpoint' | 'user' | undefined,
    identifier as string | undefined
  )

  res.json({
    success: result.success,
    data: result,
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /circuit-breakers
 * Get status of all circuit breakers
 */
resilienceRouter.get('/circuit-breakers', (req: Request, res: Response) => {
  const status = circuitBreakerManager.getAllStatus()

  res.json({
    success: true,
    data: {
      breakers: status,
      total: Object.keys(status).length,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * POST /circuit-breakers/:name/reset
 * Reset a specific circuit breaker
 */
resilienceRouter.post('/circuit-breakers/:name/reset', (req: Request, res: Response) => {
  const { name } = req.params
  circuitBreakerManager.reset(name)

  res.json({
    success: true,
    data: {
      message: `Circuit breaker "${name}" reset`,
      breaker: name,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * POST /circuit-breakers/reset-all
 * Reset all circuit breakers
 */
resilienceRouter.post('/circuit-breakers/reset-all', (req: Request, res: Response) => {
  circuitBreakerManager.resetAll()

  res.json({
    success: true,
    data: {
      message: 'All circuit breakers reset',
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /resilience/summary
 * Get comprehensive resilience status
 */
resilienceRouter.get('/resilience/summary', (req: Request, res: Response) => {
  const rateLimits = endpointRateLimiter.getStats()
  const circuitBreakers = circuitBreakerManager.getAllStatus()

  const summary = {
    timestamp: new Date().toISOString(),
    rateLimit: {
      activeEndpoints: Object.keys(rateLimits).length,
      endpoints: rateLimits,
    },
    circuitBreakers: {
      total: Object.keys(circuitBreakers).length,
      breakers: circuitBreakers,
      byState: {
        CLOSED: Object.values(circuitBreakers).filter((cb: any) => cb.state === 'CLOSED').length,
        OPEN: Object.values(circuitBreakers).filter((cb: any) => cb.state === 'OPEN').length,
        HALF_OPEN: Object.values(circuitBreakers).filter((cb: any) => cb.state === 'HALF_OPEN')
          .length,
      },
    },
  }

  res.json({
    success: true,
    data: summary,
  })
})

/**
 * GET /resilience/health
 * Check overall resilience health
 */
resilienceRouter.get('/resilience/health', (req: Request, res: Response) => {
  const circuitBreakers = circuitBreakerManager.getAllStatus()
  const openCount = Object.values(circuitBreakers).filter((cb: any) => cb.state === 'OPEN').length

  const isHealthy = openCount === 0
  const statusCode = isHealthy ? 200 : 503

  res.status(statusCode).json({
    success: isHealthy,
    data: {
      healthy: isHealthy,
      openCircuits: openCount,
      totalCircuits: Object.keys(circuitBreakers).length,
      message: isHealthy ? 'All systems operational' : `${openCount} circuit breaker(s) OPEN`,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /resilience/strategies
 * Get available resilience strategies
 */
resilienceRouter.get('/resilience/strategies', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      strategies: {
        rateLimit: {
          description: 'Token bucket rate limiting per IP, endpoint, and user',
          endpoints: ['GET /resilience/rate-limits', 'GET /resilience/rate-limits/ip/:ip'],
        },
        circuitBreaker: {
          description: 'Circuit breaker pattern with CLOSED/OPEN/HALF_OPEN states',
          endpoints: [
            'GET /resilience/circuit-breakers',
            'POST /resilience/circuit-breakers/:name/reset',
          ],
        },
        retry: {
          description: 'Automatic retry with exponential backoff',
          integrated: true,
        },
        timeout: {
          description: 'Request timeout protection',
          integrated: true,
        },
        bulkhead: {
          description: 'Concurrency control (50 concurrent max)',
          integrated: true,
        },
      },
    },
    timestamp: new Date().toISOString(),
  })
})
