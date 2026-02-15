/**
 * Stage 2.1: Pagination Example Implementations
 * 
 * Shows how to implement pagination in controllers using the utility.
 * Copy these patterns to your existing controllers.
 */

import { Request, Response } from 'express'
import { parsePaginationParams, paginateResponse } from '../../../infrastructure/utils/pagination'

/**
 * Example 1: List applicants with pagination
 * 
 * Usage:
 *   GET /api/pmc/applicant-detail/?page=1&pageSize=20
 *   GET /api/pmc/applicant-detail/?page=1&pageSize=20&status=approved
 */
export async function listApplicantsWithPagination(
  req: Request,
  res: Response,
  applicantRepository: any
) {
  try {
    const { page, pageSize, skip, limit } = parsePaginationParams(req.query)

    // Build filter from query params
    const filter: Record<string, any> = {}
    if (req.query.status) filter.applicationStatus = req.query.status
    if (req.query.districtId) filter.districtId = Number(req.query.districtId)
    if (req.query.createdBy) filter.createdBy = req.query.createdBy

    // Use new pagination method
    const result = await applicantRepository.listPaginated(filter, page, pageSize)

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as any).message })
  }
}

/**
 * Example 2: List districts with pagination
 * 
 * Usage:
 *   GET /api/pmc/districts/?page=1&pageSize=50
 */
export async function listDistrictsWithPagination(
  req: Request,
  res: Response,
  districtRepository: any
) {
  try {
    const { page, pageSize } = parsePaginationParams(req.query)
    const filter: Record<string, any> = {}

    if (req.query.divisionId) filter.divisionId = req.query.divisionId

    const result = await districtRepository.listPaginated(filter, page, pageSize, {
      districtId: 1,
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as any).message })
  }
}

/**
 * Example 3: List tehsils with pagination
 * 
 * Usage:
 *   GET /api/pmc/tehsils/?page=1&pageSize=50&districtId=24
 */
export async function listTehsilsWithPagination(
  req: Request,
  res: Response,
  tehsilRepository: any
) {
  try {
    const { page, pageSize } = parsePaginationParams(req.query)
    const filter: Record<string, any> = {}

    if (req.query.districtId) {
      filter.districtId = Number(req.query.districtId)
    }

    const result = await tehsilRepository.listPaginated(filter, page, pageSize, {
      tehsilId: 1,
    })

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as any).message })
  }
}

/**
 * Example 4: Advanced pagination with search
 * 
 * Combines pagination with text search
 * 
 * Usage:
 *   GET /api/pmc/business-profiles/?page=1&pageSize=20&search=acme
 */
export async function searchBusinessProfilesWithPagination(
  req: Request,
  res: Response,
  businessProfileRepository: any
) {
  try {
    const { page, pageSize, skip, limit } = parsePaginationParams(req.query)
    const searchQuery = req.query.search as string

    const filter: Record<string, any> = {}

    // Add text search if provided
    if (searchQuery) {
      // MongoDB text search (if text index exists)
      // filter.$text = { $search: searchQuery }

      // Or case-insensitive regex search
      filter.businessName = new RegExp(searchQuery, 'i')
    }

    if (req.query.districtId) {
      filter.districtId = Number(req.query.districtId)
    }

    // Manual pagination implementation without helper method:
    // const [data, total] = await Promise.all([
    //   businessProfileRepository.find(filter)
    //     .skip(skip)
    //     .limit(limit)
    //     .lean(),
    //   businessProfileRepository.countDocuments(filter)
    // ])

    res.json({
      message: 'Implement using listPaginated method or manual query pattern',
    })
  } catch (error) {
    res.status(500).json({ error: (error as any).message })
  }
}

/**
 * Example 5: Pagination response format
 * 
 * All paginated endpoints return this format:
 * 
 * {
 *   "data": [
 *     { id: 1, name: "Item 1" },
 *     { id: 2, name: "Item 2" },
 *     ...
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "pageSize": 20,
 *     "total": 150,
 *     "pages": 8,
 *     "hasNextPage": true,
 *     "hasPreviousPage": false
 *   }
 * }
 */
