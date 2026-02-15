/**
 * Week 4: Field Filtering for Reduced Payload
 * Client can request specific fields via ?fields=id,name,status
 */

import { Request, Response, NextFunction } from 'express'

/**
 * Parse fields parameter from query string
 * Example: ?fields=id,name,status
 */
export function parseFieldsParam(fieldsParam?: string): string[] | null {
  if (!fieldsParam) return null

  return fieldsParam
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f.length > 0)
}

/**
 * Filter object to only include requested fields
 */
export function filterFields<T extends Record<string, any>>(
  data: T,
  fields: string[]
): Partial<T> {
  if (!fields || fields.length === 0) return data

  const filtered: Partial<T> = {}
  fields.forEach((field) => {
    if (field in data) {
      filtered[field as keyof T] = data[field]
    }
  })

  return filtered
}

/**
 * Filter array of objects to requested fields
 */
export function filterFieldsArray<T extends Record<string, any>>(
  data: T[],
  fields: string[]
): Partial<T>[] {
  if (!fields || fields.length === 0) return data
  return data.map((item) => filterFields(item, fields))
}

/**
 * Middleware to handle field filtering from query param
 * Usage: res.json(data) will automatically filter if ?fields param present
 */
export function fieldFilteringMiddleware(req: Request, res: Response, next: NextFunction) {
  const fieldsParam = req.query.fields as string | undefined
  const fields = parseFieldsParam(fieldsParam)

  // Store fields on request for use in controllers
  ;(req as any).selectedFields = fields

  // Override send to apply field filtering
  const originalSend = res.send

  res.send = ((data: any) => {
    if (!fields || !data) {
      return originalSend.call(res, data)
    }

    let filtered = data
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data

      if (Array.isArray(parsed)) {
        filtered = filterFieldsArray(parsed, fields)
      } else if (typeof parsed === 'object' && parsed !== null) {
        filtered = filterFields(parsed, fields)
      }

      return originalSend.call(res, filtered)
    } catch {
      return originalSend.call(res, data)
    }
  }) as any

  next()
}

/**
 * Get fields from request (set by middleware)
 */
export function getRequestFields(req: Request): string[] | null {
  return (req as any).selectedFields || null
}

/**
 * Calculate payload size reduction
 */
export function calculatePayloadReduction(
  original: any,
  filtered: any
): {
  originalSize: number
  filteredSize: number
  reduction: number
  percentage: number
} {
  const originalJson = JSON.stringify(original)
  const filteredJson = JSON.stringify(filtered)

  const originalSize = new TextEncoder().encode(originalJson).length
  const filteredSize = new TextEncoder().encode(filteredJson).length
  const reduction = originalSize - filteredSize

  return {
    originalSize,
    filteredSize,
    reduction,
    percentage: Math.round((reduction / originalSize) * 100),
  }
}

/**
 * Validate requested fields against allowed fields
 * Prevents information disclosure
 */
export function validateRequestedFields(
  requested: string[],
  allowed: string[]
): string[] {
  return requested.filter((field) => allowed.includes(field))
}

/**
 * Example usage in controller:
 *
 * export async function getApplicants(req: Request, res: Response) {
 *   const applicants = await Applicant.find().lean()
 *   const fields = getRequestFields(req)
 *
 *   if (fields) {
 *     return res.json(filterFieldsArray(applicants, fields))
 *   }
 *   return res.json(applicants)
 * }
 *
 * Client usage:
 * GET /api/applicants?fields=id,name,status
 * Returns only: { id, name, status }
 * Saves 60-70% of payload!
 */
