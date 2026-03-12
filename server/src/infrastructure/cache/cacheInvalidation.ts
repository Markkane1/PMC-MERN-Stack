import { cacheManager } from './cacheManager'
import {
  ACCOUNT_PERMISSION_LIST_CACHE_KEY,
  ACCOUNT_ROLE_DASHBOARD_CACHE_KEY,
  ACCOUNT_SERVICE_CONFIGURATION_LIST_CACHE_KEY,
  accountServiceConfigurationCacheKey,
  accountUserProfileCacheKey,
} from './cacheKeys'

/**
 * Cache invalidation helper functions
 */
export const cacheInvalidation = {
  /**
   * Invalidate all district-related caches
   */
  async invalidateDistricts(): Promise<void> {
    console.log('🔄 Invalidating district caches...')
    await Promise.all([
      cacheManager.del('districts:list:with-stats'),
      cacheManager.delPattern('districts:*'),
      cacheManager.delPattern('statistics:*'),
    ])
    console.log('✅ District caches invalidated')
  },

  /**
   * Invalidate statistics caches
   */
  async invalidateStatistics(): Promise<void> {
    console.log('🔄 Invalidating statistics caches...')
    await cacheManager.delPattern('statistics:*')
    console.log('✅ Statistics caches invalidated')
  },

  /**
   * Invalidate applicant-specific cache
   */
  async invalidateApplicant(applicantId: number): Promise<void> {
    console.log(`🔄 Invalidating applicant ${applicantId} cache...`)
    await Promise.all([
      cacheManager.del(`applicant:${applicantId}:detail`),
      cacheManager.delPattern(`applicant:${applicantId}:*`),
      cacheManager.delPattern('statistics:*'),
    ])
    console.log(`✅ Applicant ${applicantId} cache invalidated`)
  },

  /**
   * Invalidate business profile cache
   */
  async invalidateBusinessProfile(profileId?: number): Promise<void> {
    console.log('🔄 Invalidating business profile caches...')
    if (profileId) {
      await cacheManager.del(`profile:${profileId}`)
    }
    await cacheManager.delPattern('profile:*')
    await cacheManager.delPattern('statistics:*')
    console.log('✅ Business profile caches invalidated')
  },

  /**
   * Invalidate inspection report cache
   */
  async invalidateInspectionReports(): Promise<void> {
    console.log('🔄 Invalidating inspection report caches...')
    await cacheManager.delPattern('inspection:*')
    await cacheManager.delPattern('statistics:*')
    console.log('✅ Inspection report caches invalidated')
  },

  async invalidateUserProfiles(userIds: string[] = []): Promise<void> {
    await Promise.all(userIds.map((userId) => cacheManager.del(accountUserProfileCacheKey(userId))))
  },

  async invalidatePermissionLists(): Promise<void> {
    await cacheManager.del(ACCOUNT_PERMISSION_LIST_CACHE_KEY)
  },

  async invalidateRoleDashboardConfig(): Promise<void> {
    await cacheManager.del(ACCOUNT_ROLE_DASHBOARD_CACHE_KEY)
  },

  async invalidateServiceConfigurations(serviceNames: string[] = []): Promise<void> {
    await cacheManager.del(ACCOUNT_SERVICE_CONFIGURATION_LIST_CACHE_KEY)
    if (serviceNames.length) {
      await Promise.all(
        Array.from(new Set(serviceNames.filter(Boolean))).map((serviceName) =>
          cacheManager.del(accountServiceConfigurationCacheKey(serviceName))
        )
      )
    }
  },

  /**
   * Clear all caches (use cautiously)
   */
  async clearAll(): Promise<void> {
    console.log('🔄 Clearing ALL caches...')
    await cacheManager.clear()
    console.log('✅ All caches cleared')
  },

  /**
   * Get cache statistics
   */
  async getStats(): Promise<void> {
    const stats = await cacheManager.getStats()
    if (stats) {
      console.log(`📊 Cache Stats:`)
      console.log(`   Keys: ${stats.keys}`)
      console.log(`   Memory: ${stats.memory}`)
    }
  },
}

export default cacheInvalidation
