/**
 * Stage 2.1: Pagination Utility Service
 * 
 * Enables efficient pagination for large datasets.
 * Prevents loading entire collections into memory.
 * 
 * Usage:
 *   const { page, pageSize, skip, limit } = parsePaginationParams(req.query)
 *   
 *   const [data, total] = await Promise.all([
 *     ApplicantModel.find(filter)
 *       .skip(skip)
 *       .limit(limit)
 *       .lean(),
 *     ApplicantModel.countDocuments(filter)
 *   ])
 *   
 *   res.json(paginateResponse(data, { page, pageSize, total }))
 */

export interface PaginationParams {
  page: number
  limit: number
  pageSize: number
  skip: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

/**
 * Parse pagination parameters from query string
 * @param query Query object from Express
 * @returns Parsed pagination params
 */
export function parsePaginationParams(query: any): PaginationParams {
  let page = Number(query.page) || 1
  let limit = Number(query.limit) || Number(query.pageSize) || Number(query.page_size) || 20

  // Validate bounds
  if (page < 1) page = 1
  if (limit < 1) limit = 1
  if (limit > 100) limit = 100

  const skip = (page - 1) * limit
  const pageSize = limit

  return { page, limit, pageSize, skip }
}

/**
 * Build paginated response
 * @param data Array of documents
 * @param params Pagination parameters
 * @returns Paginated response object
 */
export function paginateResponse<T>(
  data: T[],
  params: {
    page: number
    pageSize?: number
    limit?: number
    total: number
  }
): PaginatedResponse<T> {
  const { page, total } = params
  const limit = params.limit ?? params.pageSize ?? 20
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  }
}

export function paginateArray<T>(
  items: T[],
  params: PaginationParams
): PaginatedResponse<T> {
  const data = items.slice(params.skip, params.skip + params.limit)
  return paginateResponse(data, {
    page: params.page,
    limit: params.limit,
    total: items.length,
  })
}

/**
 * Calculate skip and limit for MongoDB
 * @param page Page number (1-based)
 * @param pageSize Items per page
 * @returns { skip, limit }
 */
export function calculateSkipLimit(
  page: number,
  pageSize: number
): { skip: number; limit: number } {
  const skip = (page - 1) * pageSize
  return { skip, limit: pageSize }
}
