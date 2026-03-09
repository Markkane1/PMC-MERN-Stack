import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

const mockEnv = vi.hoisted(() => ({
  nodeEnv: 'development',
  jwtExpiresIn: '1h',
}))

vi.mock('../../server/src/infrastructure/config/env', () => ({
  env: mockEnv,
}))

import {
  ACCESS_TOKEN_COOKIE,
  clearAuthCookie,
  getRequestAccessToken,
  setAuthCookie,
} from '../../server/src/interfaces/http/utils/authCookies'

describe('auth cookie utilities', () => {
  function createResponseMock() {
    return {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as Response
  }

  it('should set auth cookie with secure=false in non-production and parse hour duration', () => {
    mockEnv.nodeEnv = 'development'
    mockEnv.jwtExpiresIn = '2h'
    const res = createResponseMock()

    setAuthCookie(res, 'token-123')

    expect((res.cookie as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(ACCESS_TOKEN_COOKIE)
    expect((res.cookie as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]).toBe('token-123')
    expect((res.cookie as unknown as ReturnType<typeof vi.fn>).mock.calls[0][2]).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 2 * 60 * 60 * 1000,
    })
  })

  it('should set secure=true in production and parse numeric duration as seconds', () => {
    mockEnv.nodeEnv = 'production'
    mockEnv.jwtExpiresIn = '120'
    const res = createResponseMock()

    setAuthCookie(res, 'token-abc')

    expect((res.cookie as unknown as ReturnType<typeof vi.fn>).mock.calls[0][2]).toMatchObject({
      secure: true,
      maxAge: 120 * 1000,
    })
  })

  it('should fall back to default maxAge when duration is invalid or empty', () => {
    const res = createResponseMock()

    mockEnv.jwtExpiresIn = 'not-a-duration'
    setAuthCookie(res, 'token-x')
    expect((res.cookie as unknown as ReturnType<typeof vi.fn>).mock.calls[0][2].maxAge).toBe(60 * 60 * 1000)

    ;(res.cookie as unknown as ReturnType<typeof vi.fn>).mockClear()
    mockEnv.jwtExpiresIn = ''
    setAuthCookie(res, 'token-y')
    expect((res.cookie as unknown as ReturnType<typeof vi.fn>).mock.calls[0][2].maxAge).toBe(60 * 60 * 1000)
  })

  it('should clear auth cookie with maxAge 0', () => {
    mockEnv.nodeEnv = 'development'
    mockEnv.jwtExpiresIn = '1h'
    const res = createResponseMock()

    clearAuthCookie(res)

    expect((res.clearCookie as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(ACCESS_TOKEN_COOKIE)
    expect((res.clearCookie as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({
      maxAge: 0,
      httpOnly: true,
      path: '/',
    })
  })
})

describe('getRequestAccessToken', () => {
  it('should read and trim token from Bearer authorization header', () => {
    const req = {
      headers: { authorization: 'Bearer   abc.def.ghi   ' },
      cookies: { [ACCESS_TOKEN_COOKIE]: 'cookie-token' },
    } as unknown as Request

    expect(getRequestAccessToken(req)).toBe('abc.def.ghi')
  })

  it('should read token from cookie when authorization header is missing', () => {
    const req = {
      headers: {},
      cookies: { [ACCESS_TOKEN_COOKIE]: '  cookie-token  ' },
    } as unknown as Request

    expect(getRequestAccessToken(req)).toBe('cookie-token')
  })

  it('should return empty string when token is missing or malformed', () => {
    const malformedHeaderReq = {
      headers: { authorization: 'Token abc' },
      cookies: {},
    } as unknown as Request
    const missingTokenReq = { headers: {}, cookies: {} } as unknown as Request

    expect(getRequestAccessToken(malformedHeaderReq)).toBe('')
    expect(getRequestAccessToken(missingTokenReq)).toBe('')
  })
})
