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
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(source)) {
      out[key] = sanitizeValue(item)
    }
    return out
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

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      // Deterministically keep the first value for duplicate keys.
      query[key] = value[0]
    }
  }

  next()
}
