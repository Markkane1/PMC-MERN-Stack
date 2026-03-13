import type { NextFunction, Request, Response } from 'express'
import xss from 'xss'

const sanitizeOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'] as string[],
}

function sanitizeString(value: string): string {
  return xss(value, sanitizeOptions)
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeString(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item))
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(source).map(([key, item]) => [key, sanitizeValue(item)]),
    )
  }

  return value
}

export function sanitizeRequestInput(req: Request, _res: Response, next: NextFunction) {
  req.body = sanitizeValue(req.body)
  req.params = sanitizeValue(req.params) as Request['params']
  req.query = sanitizeValue(req.query) as Request['query']
  next()
}

export function normalizeQueryParameters(req: Request, _res: Response, next: NextFunction) {
  const query = req.query as Record<string, unknown>
  req.query = Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  ) as Request['query']

  next()
}
