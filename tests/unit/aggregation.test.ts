import { describe, expect, it } from 'vitest'
import {
  averageByField,
  bucketByField,
  conditionalCount,
  countByField,
  countStage,
  facetStage,
  groupCountByFields,
  groupStage,
  latestByField,
  limitStage,
  lookupStage,
  matchStage,
  minMaxByField,
  paginateAggregation,
  projectStage,
  skipStage,
  sortStage,
  statisticsByField,
  sumByField,
  textSearchAggregation,
  unwindStage,
} from '../../server/src/infrastructure/utils/aggregation'

describe('aggregation stage builders', () => {
  it('should build simple stage objects', () => {
    expect(matchStage({ status: 'approved' })).toEqual({ $match: { status: 'approved' } })
    expect(sortStage({ createdAt: -1 })).toEqual({ $sort: { createdAt: -1 } })
    expect(skipStage(20)).toEqual({ $skip: 20 })
    expect(limitStage(10)).toEqual({ $limit: 10 })
    expect(projectStage({ name: 1, email: 0 })).toEqual({ $project: { name: 1, email: 0 } })
    expect(groupStage('$districtId', { total: { $sum: 1 } })).toEqual({
      $group: { _id: '$districtId', total: { $sum: 1 } },
    })
    expect(facetStage({ first: [{ $limit: 1 }] })).toEqual({ $facet: { first: [{ $limit: 1 }] } })
    expect(lookupStage('users', 'userId', '_id', 'user')).toEqual({
      $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' },
    })
    expect(unwindStage('$items')).toEqual({ $unwind: '$items' })
    expect(countStage()).toEqual({ $count: 'total' })
    expect(countStage('records')).toEqual({ $count: 'records' })
  })
})

describe('aggregation patterns', () => {
  it('should build countByField pipeline', () => {
    expect(countByField('applicationStatus')).toEqual([
      { $group: { _id: '$applicationStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
  })

  it('should build groupCountByFields pipeline', () => {
    expect(groupCountByFields(['applicationStatus', 'districtId'])).toEqual([
      { $group: { _id: { applicationStatus: '$applicationStatus', districtId: '$districtId' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
  })

  it('should build sum and average pipelines', () => {
    expect(sumByField('districtId', 'feeAmount')).toEqual([
      { $group: { _id: '$districtId', total: { $sum: '$feeAmount' } } },
      { $sort: { total: -1 } },
    ])

    expect(averageByField('category', 'value')).toEqual([
      { $group: { _id: '$category', average: { $avg: '$value' }, count: { $sum: 1 } } },
      { $sort: { average: -1 } },
    ])
  })

  it('should build min/max and statistics pipelines', () => {
    expect(minMaxByField('status', 'createdAt')).toEqual([
      { $group: { _id: '$status', minValue: { $min: '$createdAt' }, maxValue: { $max: '$createdAt' } } },
    ])

    expect(statisticsByField('districtId', 'count')).toEqual([
      {
        $group: {
          _id: '$districtId',
          count: { $sum: 1 },
          total: { $sum: '$count' },
          average: { $avg: '$count' },
          min: { $min: '$count' },
          max: { $max: '$count' },
          stdDev: { $stdDevPop: '$count' },
        },
      },
      { $sort: { count: -1 } },
    ])
  })

  it('should build latestByField with default and custom limits', () => {
    const custom = latestByField('districtId', 'createdAt', 5)
    const defaultLimit = latestByField('districtId', 'createdAt')

    expect(custom[2]).toEqual({ $project: { items: { $slice: ['$items', 5] } } })
    expect(defaultLimit[2]).toEqual({ $project: { items: { $slice: ['$items', 10] } } })
  })

  it('should build bucket and text search pipelines', () => {
    expect(bucketByField('processingTime', [0, 7, 14])).toEqual([
      {
        $bucket: {
          groupBy: '$processingTime',
          boundaries: [0, 7, 14],
          default: 'Other',
          output: { count: { $sum: 1 }, items: { $push: '$_id' } },
        },
      },
    ])

    expect(textSearchAggregation('plastic')).toEqual([
      { $match: { $text: { $search: 'plastic' } } },
      { $addFields: { score: { $meta: 'textScore' } } },
      { $sort: { score: -1 } },
      { $limit: 20 },
    ])
  })

  it('should build conditional count pipeline', () => {
    const pipeline = conditionalCount('status', [
      { case: 'approved', increment: 'approvedCount' },
      { case: 'rejected', increment: 'rejectedCount' },
    ])

    expect(pipeline).toEqual([
      {
        $group: {
          _id: null,
          approvedCount: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        },
      },
    ])
  })

  it('should build paginate aggregation pipeline', () => {
    expect(paginateAggregation({ isActive: true }, { createdAt: -1 }, 20, 10)).toEqual([
      { $match: { isActive: true } },
      { $sort: { createdAt: -1 } },
      { $skip: 20 },
      { $limit: 10 },
    ])
  })
})
