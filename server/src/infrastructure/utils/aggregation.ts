/**
 * Stage 2.2: Aggregation Pipeline Builder
 * 
 * Helper functions to build MongoDB aggregation pipelines.
 * Significantly faster than loading all data and filtering in Node.js.
 * 
 * Benefits:
 * - Complex filters handled by database
 * - Calculations on database (sum, avg, count, group)
 * - Join operations (lookup)
 * - Data transformation and projection
 * - 10-100x faster than client-side operations
 */

/**
 * Build a match stage for filtering
 */
export function matchStage(filter: Record<string, unknown>) {
  return { $match: filter }
}

/**
 * Build a sort stage
 */
export function sortStage(sort: Record<string, 1 | -1>) {
  return { $sort: sort }
}

/**
 * Build a skip stage for pagination
 */
export function skipStage(skip: number) {
  return { $skip: skip }
}

/**
 * Build a limit stage for pagination
 */
export function limitStage(limit: number) {
  return { $limit: limit }
}

/**
 * Build a project stage to select/transform fields
 */
export function projectStage(fields: Record<string, 0 | 1 | any>) {
  return { $project: fields }
}

/**
 * Build a group stage for aggregation
 */
export function groupStage(groupId: any, accumulators: Record<string, any>) {
  return {
    $group: {
      _id: groupId,
      ...accumulators,
    },
  }
}

/**
 * Build a facet stage for multi-dimensional aggregation
 */
export function facetStage(facets: Record<string, any[]>) {
  return { $facet: facets }
}

/**
 * Build a lookup stage for joins
 */
export function lookupStage(
  from: string,
  localField: string,
  foreignField: string,
  as: string
) {
  return {
    $lookup: {
      from,
      localField,
      foreignField,
      as,
    },
  }
}

/**
 * Build an unwind stage to decompose array fields
 */
export function unwindStage(path: string) {
  return { $unwind: path }
}

/**
 * Build a count stage to get total documents
 */
export function countStage(as: string = 'total') {
  return { $count: as }
}

/**
 * Common aggregation patterns
 */

/**
 * Count documents by status/category
 * 
 * Usage:
 *   const result = await ApplicantModel.aggregate(
 *     countByStatus('applicationStatus')
 *   )
 *   // Returns: [{ _id: 'approved', count: 150 }, { _id: 'pending', count: 45 }]
 */
export function countByField(field: string) {
  return [
    {
      $group: {
        _id: `$${field}`,
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]
}

/**
 * Group and count with additional fields
 * 
 * Usage:
 *   const result = await ApplicantModel.aggregate(
 *     groupCountByFields(['applicationStatus', 'districtId'])
 *   )
 */
export function groupCountByFields(fields: string[]) {
  const groupId: Record<string, any> = {}
  fields.forEach((field) => {
    groupId[field] = `$${field}`
  })

  return [
    {
      $group: {
        _id: groupId,
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]
}

/**
 * Sum aggregation pattern
 * 
 * Usage:
 *   const result = await FeeModel.aggregate(
 *     sumByField('districtId', 'feeAmount')
 *   )
 *   // Returns: [{ _id: districtId, totalFees: sum }]
 */
export function sumByField(groupField: string, sumField: string) {
  return [
    {
      $group: {
        _id: `$${groupField}`,
        total: { $sum: `$${sumField}` },
      },
    },
    { $sort: { total: -1 } },
  ]
}

/**
 * Average aggregation pattern
 * 
 * Usage:
 *   const result = await Model.aggregate(
 *     averageByField('category', 'value')
 *   )
 */
export function averageByField(groupField: string, avgField: string) {
  return [
    {
      $group: {
        _id: `$${groupField}`,
        average: { $avg: `$${avgField}` },
        count: { $sum: 1 },
      },
    },
    { $sort: { average: -1 } },
  ]
}

/**
 * Min/Max pattern
 * 
 * Usage:
 *   const result = await Model.aggregate(
 *     minMaxByField('status', 'createdAt')
 *   )
 */
export function minMaxByField(groupField: string, sortField: string) {
  return [
    {
      $group: {
        _id: `$${groupField}`,
        minValue: { $min: `$${sortField}` },
        maxValue: { $max: `$${sortField}` },
      },
    },
  ]
}

/**
 * Statistical summary
 * 
 * Usage:
 *   const result = await Model.aggregate(
 *     statisticsByField('district', 'applicantCount')
 *   )
 *   // Returns: { min, max, avg, sum, stdDev, count }
 */
export function statisticsByField(groupField: string, field: string) {
  return [
    {
      $group: {
        _id: `$${groupField}`,
        count: { $sum: 1 },
        total: { $sum: `$${field}` },
        average: { $avg: `$${field}` },
        min: { $min: `$${field}` },
        max: { $max: `$${field}` },
        stdDev: { $stdDevPop: `$${field}` },
      },
    },
    { $sort: { count: -1 } },
  ]
}

/**
 * Most recent documents per group
 * 
 * Usage:
 *   const result = await ApplicantModel.aggregate(
 *     latestByField('districtId', 'createdAt', 5)
 *   )
 *   // Returns: latest 5 applicants per district
 */
export function latestByField(
  groupField: string,
  dateField: string,
  limit: number = 10
) {
  return [
    { $sort: { [dateField]: -1 } },
    {
      $group: {
        _id: `$${groupField}`,
        items: {
          $push: {
            _id: '$_id',
            createdAt: `$${dateField}`,
          },
        },
      },
    },
    {
      $project: {
        items: { $slice: ['$items', limit] },
      },
    },
  ]
}

/**
 * Bucket aggregation (categorize numeric values)
 * 
 * Usage:
 *   const result = await ApplicationModel.aggregate(
 *     bucketByField('processingTime', [0, 7, 14, 21, 30])
 *   )
 *   // Returns: documents grouped by time buckets
 */
export function bucketByField(field: string, boundaries: number[]) {
  return [
    {
      $bucket: {
        groupBy: `$${field}`,
        boundaries,
        default: 'Other',
        output: {
          count: { $sum: 1 },
          items: { $push: '$_id' },
        },
      },
    },
  ]
}

/**
 * Text search with aggregation
 * 
 * Usage:
 *   const result = await Model.aggregate(
 *     textSearchAggregation('searchQuery')
 *   )
 */
export function textSearchAggregation(searchText: string) {
  return [
    {
      $match: {
        $text: { $search: searchText },
      },
    },
    {
      $addFields: {
        score: { $meta: 'textScore' },
      },
    },
    { $sort: { score: -1 } },
    { $limit: 20 },
  ]
}

/**
 * Conditional aggregation (case/when)
 * 
 * Usage:
 *   const result = await Model.aggregate(
 *     conditionalCount('status', [
 *       { case: 'approved', increment: 'approvedCount' },
 *       { case: 'rejected', increment: 'rejectedCount' }
 *     ])
 *   )
 */
export function conditionalCount(
  field: string,
  conditions: Array<{ case: string; increment: string }>
) {
  const accumulators: Record<string, any> = {}

  conditions.forEach(({ case: caseValue, increment }) => {
    accumulators[increment] = {
      $sum: {
        $cond: [{ $eq: [`$${field}`, caseValue] }, 1, 0],
      },
    }
  })

  return [
    {
      $group: {
        _id: null,
        ...accumulators,
      },
    },
  ]
}

/**
 * Pagination with aggregation
 * 
 * Usage:
 *   const skip = (page - 1) * pageSize
 *   const result = await Model.aggregate(
 *     paginateAggregation(filter, sort, skip, limit)
 *   )
 */
export function paginateAggregation(
  filter: Record<string, unknown>,
  sort: Record<string, 1 | -1>,
  skip: number,
  limit: number
) {
  return [
    { $match: filter },
    { $sort: sort },
    { $skip: skip },
    { $limit: limit },
  ]
}
