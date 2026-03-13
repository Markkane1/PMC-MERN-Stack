import type { Request, Response, CookieOptions } from 'express'
import { env } from '../../../infrastructure/config/env'

export const ACCESS_TOKEN_COOKIE = 'pmc_access_token'

function parseDurationToMs(value: string): number {
  const trimmed = String(value || '').trim()
  if (!trimmed) return 60 * 60 * 1000

  const plain = Number(trimmed)
  if (Number.isFinite(plain)) {
    // Treat plain numeric values as seconds for JWT compatibility.
    return Math.max(plain, 1) * 1000
  }

  const match = /^(\d+)\s*([smhd])$/i.exec(trimmed)
  if (!match) return 60 * 60 * 1000

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  const multiplier =
    unit === 's'
      ? 1000
      : unit === 'm'
        ? 60 * 1000
        : unit === 'h'
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000

  return Math.max(amount, 1) * multiplier
}

function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: parseDurationToMs(env.jwtExpiresIn),
  }
}

export function setAuthCookie(res: Response, accessToken: string) {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, authCookieOptions())
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, {
    ...authCookieOptions(),
    maxAge: 0,
  })
}

export function getRequestAccessToken(req: Request): string {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    return header.replace('Bearer ', '').trim()
  }

  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies
  const cookieToken =
    cookies && typeof cookies === 'object'
      ? Reflect.get(cookies, ACCESS_TOKEN_COOKIE)
      : undefined
  return typeof cookieToken === 'string' ? cookieToken.trim() : ''
}
