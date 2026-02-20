import { Request, Response, NextFunction } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'

/**
 * External Service Token Authentication Middleware
 * Allows external systems (PITB, ePay) to authenticate using service tokens
 * instead of user JWT tokens
 */

export interface ServiceToken {
  id: string
  token: string
  service: string
  expiresAt: Date
  active: boolean
}

// In-memory store for service tokens (in production, use a database)
const serviceTokenStore = new Map<string, ServiceToken>()

/**
 * Initialize default service tokens (PITB and ePay)
 */
export function initializeServiceTokens() {
  const tokens = [
    {
      id: 'pitb-service',
      token: process.env.PITB_SERVICE_TOKEN || 'pitb-token-' + Math.random().toString(36).substr(2, 9),
      service: 'PITB',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      active: true,
    },
    {
      id: 'epay-service',
      token: process.env.EPAY_SERVICE_TOKEN || 'epay-token-' + Math.random().toString(36).substr(2, 9),
      service: 'ePay',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      active: true,
    },
  ]

  tokens.forEach((token) => {
    serviceTokenStore.set(token.token, token)
  })

  console.log('Service tokens initialized:', tokens.map((t) => ({ service: t.service, token: t.token })))
}

/**
 * Authenticate external service using service token
 * Token can be sent via:
 * - Authorization header: "Bearer SERVICE_TOKEN"
 * - X-Service-Token header
 * - service_token query parameter
 */
export const authenticateServiceToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from various sources
    const authHeader = req.headers.authorization || ''
    const serviceTokenHeader = req.headers['x-service-token'] as string | undefined
    const queryToken = (req.query.service_token as string) || (req.query.serviceToken as string) || undefined

    let token: string | null = null

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else if (serviceTokenHeader) {
      token = serviceTokenHeader
    } else if (queryToken) {
      token = queryToken
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Service token is required',
        code: 'SERVICE_TOKEN_MISSING',
      })
    }

    // Validate token
    const serviceToken = serviceTokenStore.get(token)

    if (!serviceToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or unknown service token',
        code: 'SERVICE_TOKEN_INVALID',
      })
    }

    // Check if token is active
    if (!serviceToken.active) {
      return res.status(401).json({
        success: false,
        message: 'Service token is inactive',
        code: 'SERVICE_TOKEN_INACTIVE',
      })
    }

    // Check if token is expired
    if (new Date() > serviceToken.expiresAt) {
      return res.status(401).json({
        success: false,
        message: 'Service token has expired',
        code: 'SERVICE_TOKEN_EXPIRED',
      })
    }

    // Attach service info to request for downstream handlers
    ;(req as any).serviceToken = serviceToken
    ;(req as any).isServiceCall = true
    ;(req as any).serviceName = serviceToken.service

    next()
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Service token authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: 'SERVICE_TOKEN_AUTH_ERROR',
    })
  }
})

/**
 * Middleware that allows EITHER user JWT auth OR service token auth
 * Used for endpoints that accept both authenticated users and external services
 */
export const authenticateUserOrService = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || ''
  const serviceTokenHeader = req.headers['x-service-token'] as string | undefined

  // Check if it's a service token request
  if (serviceTokenHeader || (authHeader.toLowerCase().includes('bearer') && isServiceToken(authHeader.substring(7)))) {
    return authenticateServiceToken(req, res, next)
  }

  // Otherwise, fall back to user authentication
  // This would be imported from your existing auth middleware
  next()
}

/**
 * Check if a token is a service token (not a JWT)
 */
function isServiceToken(token: string): boolean {
  // Simple heuristic: service tokens don't have dots (JWT tokens do)
  // In production, you might want more robust detection
  return !token.includes('.') || serviceTokenStore.has(token)
}

/**
 * Register a new service token (admin only in production)
 */
export function registerServiceToken(
  service: string,
  expiryDays: number = 365
): { token: string; id: string; info: string } {
  const token = `service-${service.toLowerCase()}-${Math.random().toString(36).substr(2, 20)}`
  const id = `${service.toLowerCase()}-service-${Date.now()}`

  const serviceToken: ServiceToken = {
    id,
    token,
    service,
    expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
    active: true,
  }

  serviceTokenStore.set(token, serviceToken)

  return {
    token,
    id,
    info: `Service token for ${service} registered. Valid for ${expiryDays} days.`,
  }
}

/**
 * Revoke a service token
 */
export function revokeServiceToken(token: string): boolean {
  const serviceToken = serviceTokenStore.get(token)
  if (serviceToken) {
    serviceToken.active = false
    return true
  }
  return false
}

/**
 * Get all active service tokens (admin only)
 */
export function getActiveServiceTokens() {
  return Array.from(serviceTokenStore.values()).filter((t) => t.active && new Date() < t.expiresAt)
}
