import { cacheManager } from '../../../infrastructure/cache/cacheManager'
import { clearCachePattern } from '../../../infrastructure/cache/memory'

type DashboardInvalidationOptions = {
  applicantId?: number | string | null
  includeFees?: boolean
  includeSubmitted?: boolean
}

function normalizeApplicantId(value: number | string | null | undefined): number | null {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function invalidatePmcDashboardCaches(
  options: DashboardInvalidationOptions = {}
): Promise<void> {
  const applicantId = normalizeApplicantId(options.applicantId)
  const includeFees = options.includeFees !== false
  const includeSubmitted = options.includeSubmitted !== false

  const tasks: Array<Promise<unknown>> = [
    cacheManager.delPattern('applicants:list*'),
    cacheManager.delPattern('stats:*'),
    cacheManager.delPattern('statistics:*'),
  ]

  if (includeSubmitted) {
    tasks.push(cacheManager.del('stats:submitted-breakdown:v1'))
    tasks.push(cacheManager.del('applicants:submitted-ids'))
  }

  if (includeFees) {
    tasks.push(cacheManager.del('reports:fee-timeline:v2'))
  }

  if (applicantId !== null) {
    tasks.push(cacheManager.del(`applicant:${applicantId}:detail`))
  }

  await Promise.allSettled(tasks)

  // Also clear in-process route-response cache keys used by cacheMiddleware.
  clearCachePattern('GET:/api/pmc/fetch-statistics-view-groups/*')
  clearCachePattern('GET:/api/pmc/fetch-statistics-do-view-groups/*')
  clearCachePattern('GET:/api/pmc/report-fee/*')
  clearCachePattern('GET:/api/pmc/applicant-statistics/*')
}
