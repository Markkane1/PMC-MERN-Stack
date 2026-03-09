import { describe, expect, it, vi } from 'vitest'
import {
  MemoryProfiler,
  PerformanceProfiler,
  RequestDurationTracker,
  Timer,
} from '../../server/src/infrastructure/utils/performance'

function createMemoryUsage(heapUsed: number): NodeJS.MemoryUsage {
  return {
    rss: heapUsed + 1_000_000,
    heapTotal: heapUsed + 500_000,
    heapUsed,
    external: 10_000,
    arrayBuffers: 5_000,
  }
}

describe('Timer', () => {
  it('should measure a non-negative duration between start and stop', async () => {
    const timer = new Timer().start()
    await new Promise((resolve) => setTimeout(resolve, 5))
    timer.stop()
    expect(timer.duration()).toBeGreaterThanOrEqual(0)
  })

  it('should reset timer values', () => {
    const timer = new Timer().start().stop()
    timer.reset()
    expect(timer.duration()).toBe(0)
  })
})

describe('PerformanceProfiler', () => {
  it('should measure operation and generate stats/report', async () => {
    const profiler = new PerformanceProfiler()

    await profiler.measure('sum-op', async () => 1 + 1)
    await profiler.measure('sum-op', () => 2 + 2)

    const stats = profiler.getStats('sum-op')
    expect(stats).not.toBeNull()
    expect(stats?.count).toBe(2)
    expect(stats?.avgDuration).toBeGreaterThanOrEqual(0)
    expect(stats?.p95).toBeGreaterThanOrEqual(0)

    const report = profiler.generateReport()
    expect(report).toContain('PERFORMANCE REPORT')
    expect(report).toContain('sum-op')

    const exported = profiler.export()
    expect(exported['sum-op'][0].count).toBe(2)
  })

  it('should return null stats for unknown operation and empty report when no metrics', () => {
    const profiler = new PerformanceProfiler()
    expect(profiler.getStats('missing')).toBeNull()
    expect(profiler.generateReport()).toBe('No performance data collected')
  })

  it('should clear all collected metrics', async () => {
    const profiler = new PerformanceProfiler()
    await profiler.measure('op', () => 123)
    expect(profiler.getAllStats().length).toBe(1)
    profiler.clear()
    expect(profiler.getAllStats()).toEqual([])
  })
})

describe('MemoryProfiler', () => {
  it('should compute memory trend and leak detection when growth exceeds 50 percent', () => {
    const profiler = new MemoryProfiler()
    const memorySpy = vi.spyOn(process, 'memoryUsage')
    memorySpy
      .mockReturnValueOnce(createMemoryUsage(100))
      .mockReturnValueOnce(createMemoryUsage(200))

    profiler.snapshot('start')
    profiler.snapshot('end')

    const trend = profiler.getTrend()
    expect(trend).not.toBeNull()
    expect(trend?.growthPercentage).toBeGreaterThan(50)
    expect(profiler.detectMemoryLeak()).toBe(true)
    expect(profiler.generateReport()).toContain('MEMORY PROFILE')

    memorySpy.mockRestore()
  })

  it('should handle no snapshots and clear snapshots', () => {
    const profiler = new MemoryProfiler()
    expect(profiler.getTrend()).toBeNull()
    expect(profiler.detectMemoryLeak()).toBe(false)
    expect(profiler.generateReport()).toBe('No memory snapshots taken')
    profiler.clear()
    expect(profiler.generateReport()).toBe('No memory snapshots taken')
  })
})

describe('RequestDurationTracker', () => {
  it('should record endpoint durations and compute stats', () => {
    const tracker = new RequestDurationTracker()
    tracker.record('/api/users', 100)
    tracker.record('/api/users', 200)
    tracker.record('/api/users', 300)

    const stats = tracker.getEndpointStats('/api/users')
    expect(stats).toEqual({
      count: 3,
      avg: 200,
      min: 100,
      max: 300,
      p95: 300,
    })
  })

  it('should return slow endpoints above a threshold and report output', () => {
    const tracker = new RequestDurationTracker()
    tracker.record('/api/slow', 1500)
    tracker.record('/api/slow', 1200)
    tracker.record('/api/fast', 100)

    const slow = tracker.getSlowEndpoints(1000)
    expect(slow).toEqual([{ endpoint: '/api/slow', avgDuration: 1350 }])

    const report = tracker.generateReport()
    expect(report).toContain('REQUEST DURATION REPORT')
    expect(report).toContain('/api/slow')
  })

  it('should return empty values when no data is present', () => {
    const tracker = new RequestDurationTracker()
    expect(tracker.getEndpointStats('/missing')).toBeNull()
    expect(tracker.getAllStats()).toEqual({})
    expect(tracker.generateReport()).toBe('No request duration data collected')
    tracker.clear()
    expect(tracker.getAllStats()).toEqual({})
  })
})
