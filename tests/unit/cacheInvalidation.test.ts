import { beforeEach, describe, expect, it, vi } from 'vitest'

const cacheManagerMock = vi.hoisted(() => ({
  del: vi.fn().mockResolvedValue(undefined),
  delPattern: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  getStats: vi.fn().mockResolvedValue({ keys: 10, memory: '2MB' }),
}))

vi.mock('../../server/src/infrastructure/cache/cacheManager', () => ({
  cacheManager: cacheManagerMock,
}))

import { cacheInvalidation } from '../../server/src/infrastructure/cache/cacheInvalidation'

describe('cacheInvalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  it('should invalidate district related cache keys and patterns', async () => {
    await cacheInvalidation.invalidateDistricts()

    expect(cacheManagerMock.del).toHaveBeenCalledWith('districts:list:with-stats')
    expect(cacheManagerMock.delPattern).toHaveBeenCalledWith('districts:*')
    expect(cacheManagerMock.delPattern).toHaveBeenCalledWith('statistics:*')
  })

  it('should invalidate statistics cache pattern', async () => {
    await cacheInvalidation.invalidateStatistics()
    expect(cacheManagerMock.delPattern).toHaveBeenCalledWith('statistics:*')
  })

  it('should invalidate applicant specific cache keys and patterns', async () => {
    await cacheInvalidation.invalidateApplicant(42)
    expect(cacheManagerMock.del).toHaveBeenCalledWith('applicant:42:detail')
    expect(cacheManagerMock.delPattern).toHaveBeenCalledWith('applicant:42:*')
    expect(cacheManagerMock.delPattern).toHaveBeenCalledWith('statistics:*')
  })

  it('should invalidate business profile caches with and without profile id', async () => {
    await cacheInvalidation.invalidateBusinessProfile(7)
    expect(cacheManagerMock.del).toHaveBeenCalledWith('profile:7')
    expect(cacheManagerMock.delPattern).toHaveBeenCalledWith('profile:*')
    expect(cacheManagerMock.delPattern).toHaveBeenCalledWith('statistics:*')

    vi.clearAllMocks()
    await cacheInvalidation.invalidateBusinessProfile()
    expect(cacheManagerMock.del).not.toHaveBeenCalled()
    expect(cacheManagerMock.delPattern).toHaveBeenCalledWith('profile:*')
    expect(cacheManagerMock.delPattern).toHaveBeenCalledWith('statistics:*')
  })

  it('should invalidate inspection report cache pattern', async () => {
    await cacheInvalidation.invalidateInspectionReports()
    expect(cacheManagerMock.delPattern).toHaveBeenCalledWith('inspection:*')
    expect(cacheManagerMock.delPattern).toHaveBeenCalledWith('statistics:*')
  })

  it('should clear all cache entries', async () => {
    await cacheInvalidation.clearAll()
    expect(cacheManagerMock.clear).toHaveBeenCalledTimes(1)
  })

  it('should fetch and log cache stats when stats are available', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await cacheInvalidation.getStats()
    expect(cacheManagerMock.getStats).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalled()
  })
})
