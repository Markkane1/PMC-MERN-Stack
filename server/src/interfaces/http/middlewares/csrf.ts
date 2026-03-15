import type { NextFunction, Request, Response } from 'express'
import {
  getCsrfCookie,
  getRequestAuthCookie,
  ensureCsrfCookie,
} from '../utils/authCookies'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function hasBearerAuth(req: Request): boolean {
  const header = req.headers.authorization
  return typeof header === 'string' && header.startsWith('Bearer ')
}

function isServiceTokenRequest(req: Request): boolean {
  return Boolean(
    req.headers['x-service-token'] ||
      req.query.service_token ||
      req.query.serviceToken,
  )
}

export function attachCsrfCookie(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (getRequestAuthCookie(req)) {
    ensureCsrfCookie(req, res)
  }
  return next()
}

export function requireCsrfForCookieAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const method = req.method.toUpperCase()
  if (!MUTATING_METHODS.has(method)) {
    return next()
  }

  if (hasBearerAuth(req) || isServiceTokenRequest(req)) {
    return next()
  }

  const authCookie = getRequestAuthCookie(req)
  if (!authCookie) {
    return next()
  }

  const csrfCookie = getCsrfCookie(req)
  const header = req.headers['x-csrf-token']
  const csrfHeader = Array.isArray(header) ? header[0] : header

  if (
    !csrfCookie ||
    typeof csrfHeader !== 'string' ||
    csrfHeader.trim() !== csrfCookie
  ) {
    return res.status(403).json({ message: 'CSRF token validation failed' })
  }

  return next()
}
