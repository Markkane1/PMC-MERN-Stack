/**
 * Stage 2.3: Real-World Controller Examples
 * 
 * Shows how to implement parallel queries in actual API endpoints.
 * Copy these patterns to your existing controllers.
 */

import { Request, Response } from 'express'
import { parallelQueriesWithMetadata, timedParallelQueries } from '../../../infrastructure/utils/parallelQueries'

/**
 * Example 1: Dashboard endpoint using parallel queries
 * 
 * Before (Sequential):
 *   GET /api/pmc/dashboard
 *   - Get applicant stats: 200ms
 *   - Get district stats: 150ms
 *   - Get recent applications: 100ms
 *   - Get system metrics: 80ms
 *   - Total: 530ms
 * 
 * After (Parallel):
 *   - All queries run simultaneously
 *   - Total: 200ms (longest query only)
 *   - 2.65x faster!
 */
export async function getDashboardParallel(
  req: Request,
  res: Response,
  applicantRepository: any,
  districtRepository: any
) {
  try {
    const dashboard = await parallelQueriesWithMetadata({
      applicantsByStatus: applicantRepository.getStatsByStatus(),
      applicantsByDistrict: applicantRepository.getStatsByDistrict(),
      dashboardMetrics: applicantRepository.getDashboardMetrics(),
      districtCount: districtRepository.list().then((d: any[]) => d.length),
      recentApplications: applicantRepository.list({ limit: 10 }),
    })

    res.json({
      status: 'success',
      data: dashboard,
    })
  } catch (error) {
    res.status(500).json({ error: (error as any).message })
  }
}

/**
 * Example 2: Get applicant with all related data
 * 
 * GET /api/pmc/applicant/:id/complete
 * 
 * Returns: applicant + documents + fees + business profile + assignment
 * All loaded in parallel!
 */
export async function getApplicantComplete(
  req: Request,
  res: Response,
  applicantRepository: any,
  documentRepository: any,
  feeRepository: any,
  businessRepository: any,
  assignmentRepository: any
) {
  try {
    const applicantId = Number(req.params.id)

    const data = await parallelQueriesWithMetadata({
      applicant: applicantRepository.findByNumericId(applicantId),
      documents: documentRepository.findByApplicantId(applicantId),
      fees: feeRepository.findByApplicantId(applicantId),
      businessProfile: businessRepository.findByApplicantId(applicantId),
      assignment: assignmentRepository.findByApplicantId(applicantId),
    })

    if (!data.applicant) {
      return res.status(404).json({ error: 'Applicant not found' })
    }

    res.json(data)
  } catch (error) {
    res.status(500).json({ error: (error as any).message })
  }
}

/**
 * Example 3: Get district with all related information
 * 
 * GET /api/pmc/districts/:id/complete
 * 
 * Returns: district + tehsils + applicant stats + recent applications
 */
export async function getDistrictComplete(
  req: Request,
  res: Response,
  districtRepository: any,
  tehsilRepository: any,
  applicantRepository: any
) {
  try {
    const districtId = Number(req.params.id)

    const data = await parallelQueriesWithMetadata({
      district: districtRepository.findByDistrictId(districtId),
      tehsils: tehsilRepository.listByDistrictId(districtId),
      applicantCount: applicantRepository.count({ districtId }),
      approvedCount: applicantRepository.count({
        districtId,
        applicationStatus: 'approved',
      }),
      pendingCount: applicantRepository.count({
        districtId,
        applicationStatus: 'pending',
      }),
      recentApplications: applicantRepository.list(
        { districtId },
        1,
        5 // page, pageSize
      ),
    })

    if (!data.district) {
      return res.status(404).json({ error: 'District not found' })
    }

    res.json(data)
  } catch (error) {
    res.status(500).json({ error: (error as any).message })
  }
}

/**
 * Example 4: Search across multiple data sources
 * 
 * GET /api/pmc/search?q=searchTerm
 * 
 * Searches applicants, documents, and users simultaneously
 */
export async function globalSearch(
  req: Request,
  res: Response,
  applicantRepository: any,
  documentRepository: any,
  userRepository: any
) {
  try {
    const query = req.query.q as string

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query too short' })
    }

    const regex = new RegExp(query, 'i')

    const results = await parallelQueriesWithMetadata({
      applicants: applicantRepository.list({ firstName: regex }).then((a: any[]) => a.slice(0, 5)),
      documents: documentRepository.list({
        documentDescription: regex,
      }).then((d: any[]) => d.slice(0, 5)),
      users: userRepository.list({ firstName: regex }).then((u: any[]) => u.slice(0, 5)),
    })

    res.json({
      query,
      results: {
        applicants: results.applicants || [],
        documents: results.documents || [],
        users: results.users || [],
      },
      summary: {
        applicantCount: results.applicants?.length || 0,
        documentCount: results.documents?.length || 0,
        userCount: results.users?.length || 0,
      },
    })
  } catch (error) {
    res.status(500).json({ error: (error as any).message })
  }
}

/**
 * Example 5: Get report with multiple data aggregations
 * 
 * GET /api/pmc/reports/summary
 * 
 * Returns comprehensive report with all data loaded in parallel
 */
export async function getReportSummary(
  req: Request,
  res: Response,
  applicantRepository: any,
  districtRepository: any,
  feeRepository: any
) {
  try {
    const { data, timing } = await timedParallelQueries({
      applicantStats: applicantRepository.getStatsByStatus(),
      districtStats: applicantRepository.getStatsByDistrict(),
      dashboardMetrics: applicantRepository.getDashboardMetrics(),
      totalDistricts: districtRepository.list().then((d: any[]) => d.length),
    })

    res.json({
      status: 'success',
      data,
      _metadata: {
        timing,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    res.status(500).json({ error: (error as any).message })
  }
}

/**
 * Example 6: Bulk create with related records
 * 
 * POST /api/pmc/applicants/bulk-create
 * 
 * Creates applicants and their business profiles simultaneously
 */
export async function bulkCreateApplicants(
  req: Request,
  res: Response,
  applicantRepository: any,
  businessRepository: any
) {
  try {
    const { applicants, businessProfiles } = req.body

    // Create all applicants first
    const createdApplicants = await Promise.all(
      applicants.map((a: any) => applicantRepository.create(a))
    )

    // Then create business profiles in parallel
    const createdBusinesses = await Promise.all(
      businessProfiles.map((b: any) => businessRepository.create(b))
    )

    res.json({
      status: 'success',
      created: {
        applicants: createdApplicants.length,
        businesses: createdBusinesses.length,
      },
    })
  } catch (error) {
    res.status(500).json({ error: (error as any).message })
  }
}

/**
 * Example 7: Applicant list view with full details
 * 
 * GET /api/pmc/applicants?page=1&pageSize=20
 * 
 * Returns applicants with documents and creator info loaded in parallel
 */
export async function getApplicantListWithDetails(
  req: Request,
  res: Response,
  applicantRepository: any,
  documentRepository: any,
  userRepository: any
) {
  try {
    const page = Number(req.query.page) || 1
    const pageSize = Number(req.query.pageSize) || 20

    // Get paginated applicants
    const paginatedResult = await applicantRepository.listPaginated({}, page, pageSize)

    // Get related data in parallel
    const applicantIds = paginatedResult.data.map((a: any) => a.numericId)
    const createdByIds = paginatedResult.data.map((a: any) => a.createdBy)

    const relatedData = await parallelQueriesWithMetadata({
      documents: documentRepository.findByApplicantIds(applicantIds),
      users: userRepository.findByIds(createdByIds),
    })

    // Combine results
    const enrichedApplicants = paginatedResult.data.map((applicant: any) => ({
      ...applicant,
      documentCount: (relatedData.documents || []).filter(
        (d: any) => d.applicantId === applicant.numericId
      ).length,
      createdByUser: (relatedData.users || []).find((u: any) => u.id === applicant.createdBy),
    }))

    res.json({
      data: enrichedApplicants,
      pagination: paginatedResult.pagination,
    })
  } catch (error) {
    res.status(500).json({ error: (error as any).message })
  }
}

/**
 * PERFORMANCE IMPACT SUMMARY:
 * 
 * Scenario: Dashboard with 4 queries (200ms, 150ms, 100ms, 80ms each)
 * 
 * Sequential Approach:
 *   Query 1: 0-200ms
 *   Query 2: 200-350ms
 *   Query 3: 350-450ms
 *   Query 4: 450-530ms
 *   Total: 530ms
 *   
 * Parallel Approach:
 *   Query 1: 0-200ms  \
 *   Query 2: 0-150ms  |  All concurrent
 *   Query 3: 0-100ms  |
 *   Query 4: 0-80ms   /
 *   Total: 200ms (longest query only)
 *   
 * Improvement: 2.65x faster!
 * 
 * For 10 queries:
 *   Sequential: 1500ms
 *   Parallel: 200ms
 *   Improvement: 7.5x faster!
 */
