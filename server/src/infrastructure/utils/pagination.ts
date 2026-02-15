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
  pageSize: number
  skip: number
  limit: number
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  pages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
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
  let pageSize = Number(query.pageSize) || Number(query.limit) || 20

  // Validate bounds
  if (page < 1) page = 1
  if (pageSize < 1) pageSize = 1
  if (pageSize > 1000) pageSize = 1000 // Cap at 1000 to prevent DoS

  const skip = (page - 1) * pageSize
  const limit = pageSize

  return { page, pageSize, skip, limit }
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
    pageSize: number
    total: number
  }
): PaginatedResponse<T> {
  const { page, pageSize, total } = params
  const pages = Math.ceil(total / pageSize)

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      pages,
      hasNextPage: page < pages,
      hasPreviousPage: page > 1,
    },
  }
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
