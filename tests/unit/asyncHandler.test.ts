import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { asyncHandler } from '../../server/src/shared/utils/asyncHandler'

describe('asyncHandler', () => {
  it('should call wrapped async function with req, res, and next', async () => {
    const fn = vi.fn().mockResolvedValue(undefined)
    const wrapped = asyncHandler(fn)
    const req = {} as Request
    const res = {} as Response
    const next = vi.fn() as NextFunction

    wrapped(req, res, next)
    await Promise.resolve()

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(req, res, next)
    expect(next).not.toHaveBeenCalled()
  })

  it('should pass rejected error to next', async () => {
    const error = new Error('boom')
    const fn = vi.fn().mockRejectedValue(error)
    const wrapped = asyncHandler(fn)
    const req = {} as Request
    const res = {} as Response
    const next = vi.fn() as NextFunction

    wrapped(req, res, next)
    await Promise.resolve()

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(error)
  })
})
