/**
 * Stage 2.3: Repository Parallel Query Methods
 * 
 * Methods that execute multiple repository queries in parallel.
 * These can be added to existing repositories.
 * 
 * Example patterns for ApplicantRepository, DistrictRepository, etc.
 */

import { parallelQueriesWithMetadata, timedParallelQueries } from '../../../infrastructure/utils/parallelQueries'

/**
 * Example 1: Get full applicant profile in parallel
 * 
 * Instead of: Load applicant → Load documents → Load fees (3 sequential queries)
 * Do: Load all in parallel (1 concurrent request)
 */
export async function getFullApplicantProfile(
  applicantId: number,
  applicantRepository: any,
  documentRepository: any,
  feeRepository: any
) {
  const profile = await parallelQueriesWithMetadata({
    applicant: applicantRepository.findByNumericId(applicantId),
    documents: documentRepository.findByApplicantId(applicantId),
    fees: feeRepository.findByApplicantId(applicantId),
    businessProfile: applicantRepository.findByNumericId(applicantId), // Add real query
  })

  return {
    applicant: profile.applicant,
    documents: profile.documents,
    fees: profile.fees,
    businessProfile: profile.businessProfile,
  }
}

/**
 * Example 2: Get dashboard with parallel aggregations
 * 
 * Get multiple statistics in one parallel request
 */
export async function getDashboardWithParallel(
  applicantRepository: any,
  districtRepository: any
) {
  return parallelQueriesWithMetadata({
    applicantsByStatus: applicantRepository.getStatsByStatus(),
    applicantsByDistrict: applicantRepository.getStatsByDistrict(),
    dashboardMetrics: applicantRepository.getDashboardMetrics(),
    districtList: districtRepository.list(),
  })
}

/**
 * Example 3: Get applicants with related data
 * 
 * Useful for list views that need: applicant + assigned user + latest document
 */
export async function getApplicantListWithRelated(
  filter: Record<string, any>,
  applicantRepository: any,
  documentRepository: any,
  userRepository: any
) {
  // First get applicants
  const applicants = await applicantRepository.list(filter)

  // Then load related data in parallel
  const applicantIds = applicants.map((a: any) => a.numericId)

  const related = await parallelQueriesWithMetadata({
    documents: documentRepository.findByApplicantIds(applicantIds),
    users: userRepository.findByIds(applicants.map((a: any) => a.createdBy)),
  })

  // Combine data
  return applicants.map((applicant: any) => ({
    ...applicant,
    documents: related.documents.filter((d: any) => d.applicantId === applicant.numericId),
    createdByUser: related.users.find((u: any) => u.id === applicant.createdBy),
  }))
}

/**
 * Example 4: Get district with all related data
 * 
 * District + tehsils + applicants + statistics
 */
export async function getDistrictComplete(
  districtId: number,
  districtRepository: any,
  tehsilRepository: any,
  applicantRepository: any
) {
  return parallelQueriesWithMetadata({
    district: districtRepository.findByDistrictId(districtId),
    tehsils: tehsilRepository.listByDistrictId(districtId),
    applicantCount: applicantRepository.count({ districtId }),
    applicantStats: applicantRepository.getStatsByDistrict(),
  })
}

/**
 * Example 5: Search with multiple data sources
 * 
 * Search applicants, documents, and users simultaneously
 */
export async function globalSearch(
  searchQuery: string,
  applicantRepository: any,
  documentRepository: any,
  userRepository: any
) {
  return parallelQueriesWithMetadata({
    applicants: applicantRepository.list({
      firstName: new RegExp(searchQuery, 'i'),
    }),
    documents: documentRepository.list({
      documentDescription: new RegExp(searchQuery, 'i'),
    }),
    users: userRepository.listByNameQuery(searchQuery),
  })
}

/**
 * Example 6: Get with timing information (for monitoring)
 * 
 * Returns data + how long each query took
 */
export async function getDashboardWithTiming(applicantRepository: any) {
  return timedParallelQueries({
    statsByStatus: applicantRepository.getStatsByStatus(),
    statsByDistrict: applicantRepository.getStatsByDistrict(),
    dashboardMetrics: applicantRepository.getDashboardMetrics(),
  })
}

/**
 * Example 7: Batch operations in parallel
 * 
 * Create multiple records simultaneously
 */
export async function createApplicantWithRelated(
  applicantData: any,
  businessProfileData: any,
  applicantRepository: any,
  businessRepository: any
) {
  const [applicant, businessProfile] = await Promise.all([
    applicantRepository.create(applicantData),
    businessRepository.create(businessProfileData),
  ])

  return { applicant, businessProfile }
}

/**
 * Example 8: Update multiple records in parallel
 * 
 * Update applicant + update related records simultaneously
 */
export async function updateApplicantWithRelated(
  applicantId: number,
  applicantUpdates: any,
  businessUpdates: any,
  applicantRepository: any,
  businessRepository: any
) {
  return Promise.all([
    applicantRepository.updateByNumericId(applicantId, applicantUpdates),
    businessRepository.updateByApplicantId(applicantId, businessUpdates),
  ])
}

/**
 * PERFORMANCE COMPARISON:
 * 
 * Sequential approach (Old):
 *   const applicant = await applicantRepo.findByNumericId(123)  // 100ms
 *   const docs = await docRepo.findByApplicantId(123)          // 150ms
 *   const fees = await feeRepo.findByApplicantId(123)          // 80ms
 *   Total: 330ms
 * 
 * Parallel approach (New):
 *   const data = await Promise.all([
 *     applicantRepo.findByNumericId(123),  // 100ms
 *     docRepo.findByApplicantId(123),      // 150ms (concurrent)
 *     feeRepo.findByApplicantId(123)       // 80ms (concurrent)
 *   ])
 *   Total: 150ms (longest query only!)
 *   Improvement: 2.2x faster!
 * 
 * With 5 queries that average 100ms each:
 *   Sequential: 500ms
 *   Parallel: 100ms
 *   Improvement: 5x faster!
 */
