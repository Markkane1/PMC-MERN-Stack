/**
 * Stage 2.2: Query Builder Utilities
 * 
 * Helper functions to build complex MongoDB queries safely.
 * Ensures queries are properly structured and optimized.
 */

/**
 * Build a MongoDB filter query with type safety
 */
export class QueryBuilder {
  private filter: Record<string, unknown> = {}

  /**
   * Add an exact match condition
   */
  equals(field: string, value: unknown): this {
    this.filter[field] = value
    return this
  }

  /**
   * Add an IN query ($in)
   */
  in(field: string, values: any[]): this {
    this.filter[field] = { $in: values }
    return this
  }

  /**
   * Add a NOT IN query ($nin)
   */
  notIn(field: string, values: any[]): this {
    this.filter[field] = { $nin: values }
    return this
  }

  /**
   * Add a greater than condition ($gt)
   */
  gt(field: string, value: number | Date): this {
    if (!this.filter[field]) this.filter[field] = {}
    const filterObj = this.filter[field] as Record<string, unknown>
    filterObj.$gt = value
    return this
  }

  /**
   * Add a greater than or equal condition ($gte)
   */
  gte(field: string, value: number | Date): this {
    if (!this.filter[field]) this.filter[field] = {}
    const filterObj = this.filter[field] as Record<string, unknown>
    filterObj.$gte = value
    return this
  }

  /**
   * Add a less than condition ($lt)
   */
  lt(field: string, value: number | Date): this {
    if (!this.filter[field]) this.filter[field] = {}
    const filterObj = this.filter[field] as Record<string, unknown>
    filterObj.$lt = value
    return this
  }

  /**
   * Add a less than or equal condition ($lte)
   */
  lte(field: string, value: number | Date): this {
    if (!this.filter[field]) this.filter[field] = {}
    const filterObj = this.filter[field] as Record<string, unknown>
    filterObj.$lte = value
    return this
  }

  /**
   * Add a date range query (between startDate and endDate)
   */
  dateRange(field: string, startDate: Date, endDate: Date): this {
    this.filter[field] = {
      $gte: startDate,
      $lte: endDate,
    }
    return this
  }

  /**
   * Add a regex/text match condition
   */
  regex(field: string, pattern: string, options: string = 'i'): this {
    this.filter[field] = new RegExp(pattern, options)
    return this
  }

  /**
   * Add an OR condition
   */
  or(...conditions: Record<string, unknown>[]): this {
    this.filter.$or = conditions
    return this
  }

  /**
   * Add an AND condition
   */
  and(...conditions: Record<string, unknown>[]): this {
    this.filter.$and = conditions
    return this
  }

  /**
   * Add a NOT condition
   */
  not(field: string, value: unknown): this {
    this.filter[field] = { $ne: value }
    return this
  }

  /**
   * Add an EXISTS condition
   */
  exists(field: string, shouldExist: boolean = true): this {
    this.filter[field] = { $exists: shouldExist }
    return this
  }

  /**
   * Add an array contains condition
   */
  arrayContains(field: string, value: unknown): this {
    this.filter[field] = { $in: [value] }
    return this
  }

  /**
   * Add an array of size condition
   */
  arraySize(field: string, size: number): this {
    this.filter[field] = { $size: size }
    return this
  }

  /**
   * Get the built filter object
   */
  build(): Record<string, unknown> {
    return { ...this.filter }
  }

  /**
   * Reset the query builder
   */
  reset(): this {
    this.filter = {}
    return this
  }
}

/**
 * Example usage:
 * 
 *   const query = new QueryBuilder()
 *     .equals('status', 'approved')
 *     .gte('createdAt', new Date('2024-01-01'))
 *     .in('districtId', [24, 25, 26])
 *     .build()
 *   
 *   const results = await ApplicantModel.find(query)
 */

/**
 * Pre-built common filters for reuse
 */
export const CommonFilters = {
  /**
   * Get approved applicants
   */
  approved: () => new QueryBuilder().equals('applicationStatus', 'approved').build(),

  /**
   * Get pending applicants
   */
  pending: () => new QueryBuilder().equals('applicationStatus', 'pending').build(),

  /**
   * Get applicants from a specific district
   */
  byDistrict: (districtId: number) =>
    new QueryBuilder().equals('districtId', districtId).build(),

  /**
   * Get recent applicants (last N days)
   */
  recent: (days: number = 7) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    return new QueryBuilder()
      .dateRange('createdAt', startDate, new Date())
      .build()
  },

  /**
   * Get applicants by name (partial match)
   */
  byName: (name: string) =>
    new QueryBuilder().regex('firstName', name).build(),

  /**
   * Get applicants by tracking number
   */
  byTracking: (trackingNumber: string) =>
    new QueryBuilder().equals('trackingNumber', trackingNumber).build(),

  /**
   * Combine multiple filters with AND
   */
  combine: (...filters: Record<string, unknown>[]) => ({
    $and: filters,
  }),
}

/**
 * Sort definitions for consistency
 */
export const CommonSorts = {
  /**
   * Sort by newest first
   */
  newest: { createdAt: -1 as const },

  /**
   * Sort by oldest first
   */
  oldest: { createdAt: 1 as const },

  /**
   * Sort by status then date
   */
  statusThenDate: {
    applicationStatus: 1,
    createdAt: -1,
  } as const,

  /**
   * Sort by district then status
   */
  districtThenStatus: {
    districtId: 1,
    applicationStatus: 1,
  } as const,
}
