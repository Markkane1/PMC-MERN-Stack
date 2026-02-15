import { cacheManager } from './cacheManager'

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
