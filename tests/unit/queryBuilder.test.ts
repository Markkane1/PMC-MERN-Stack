import { describe, expect, it } from 'vitest'
import {
  CommonFilters,
  CommonSorts,
  QueryBuilder,
} from '../../server/src/infrastructure/utils/queryBuilder'

describe('QueryBuilder', () => {
  it('should build chained equality and range filter conditions', () => {
    const query = new QueryBuilder()
      .equals('status', 'approved')
      .gte('count', 10)
      .lte('count', 20)
      .build()

    expect(query).toEqual({
      status: 'approved',
      count: { $gte: 10, $lte: 20 },
    })
  })

  it('should build in, not in, exists, and not conditions', () => {
    const query = new QueryBuilder()
      .in('districtId', [1, 2])
      .notIn('role', ['admin'])
      .exists('email')
      .not('isActive', false)
      .build()

    expect(query).toEqual({
      districtId: { $in: [1, 2] },
      role: { $nin: ['admin'] },
      email: { $exists: true },
      isActive: { $ne: false },
    })
  })

  it('should build date range and regex filters', () => {
    const start = new Date('2026-01-01T00:00:00.000Z')
    const end = new Date('2026-01-31T23:59:59.999Z')
    const query = new QueryBuilder().dateRange('createdAt', start, end).regex('name', 'john').build()

    expect(query.createdAt).toEqual({ $gte: start, $lte: end })
    expect(query.name).toEqual({ $regex: 'john', $options: 'i' })
  })

  it('should build logical operators OR and AND', () => {
    const query = new QueryBuilder()
      .or({ status: 'pending' }, { status: 'approved' })
      .and({ isActive: true }, { districtId: 1 })
      .build()

    expect(query.$or).toEqual([{ status: 'pending' }, { status: 'approved' }])
    expect(query.$and).toEqual([{ isActive: true }, { districtId: 1 }])
  })

  it('should build array operators', () => {
    const query = new QueryBuilder().arrayContains('tags', 'urgent').arraySize('tags', 2).build()
    expect(query).toEqual({
      tags: { $size: 2 },
    })
  })

  it('should reset built filters when reset is called', () => {
    const builder = new QueryBuilder().equals('status', 'approved')
    expect(builder.build()).toEqual({ status: 'approved' })
    builder.reset()
    expect(builder.build()).toEqual({})
  })
})

describe('CommonFilters', () => {
  it('should return approved and pending filters', () => {
    expect(CommonFilters.approved()).toEqual({ applicationStatus: 'approved' })
    expect(CommonFilters.pending()).toEqual({ applicationStatus: 'pending' })
  })

  it('should return filter by district and tracking', () => {
    expect(CommonFilters.byDistrict(24)).toEqual({ districtId: 24 })
    expect(CommonFilters.byTracking('TRK-100')).toEqual({ trackingNumber: 'TRK-100' })
  })

  it('should build recent and byName filters', () => {
    const recent = CommonFilters.recent(30)
    const byName = CommonFilters.byName('ali')

    expect(recent.createdAt).toBeDefined()
    expect((recent.createdAt as { $gte: Date; $lte: Date }).$gte).toBeInstanceOf(Date)
    expect((recent.createdAt as { $gte: Date; $lte: Date }).$lte).toBeInstanceOf(Date)
    expect(byName.firstName).toEqual({ $regex: 'ali', $options: 'i' })
  })

  it('should combine multiple filters using $and', () => {
    const filterA = { status: 'approved' }
    const filterB = { districtId: 1 }
    expect(CommonFilters.combine(filterA, filterB)).toEqual({ $and: [filterA, filterB] })
  })
})

describe('CommonSorts', () => {
  it('should expose stable sort definitions', () => {
    expect(CommonSorts.newest).toEqual({ createdAt: -1 })
    expect(CommonSorts.oldest).toEqual({ createdAt: 1 })
    expect(CommonSorts.statusThenDate).toEqual({ applicationStatus: 1, createdAt: -1 })
    expect(CommonSorts.districtThenStatus).toEqual({ districtId: 1, applicationStatus: 1 })
  })
})
