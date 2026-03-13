/**
 * Stage 2.2: Query Builder Utilities
 *
 * Helper functions to build complex MongoDB queries safely.
 * Ensures queries are properly structured and optimized.
 */

type FilterValue = Record<string, unknown> | unknown
type FilterEntry = readonly [string, FilterValue]

const DEFAULT_REGEX_OPTIONS = 'i'
const ALLOWED_REGEX_OPTIONS = new Set(['i', 'm', 's', 'u', 'x'])

const escapeRegexLiteral = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const sanitizeRegexOptions = (options: string): string => {
    const uniqueOptions = Array.from(new Set(options.split('')))
    return uniqueOptions
        .filter((option) => ALLOWED_REGEX_OPTIONS.has(option))
        .join('')
}

/**
 * Build a MongoDB filter query with type safety.
 */
export class QueryBuilder {
    private entries = new Map<string, FilterValue>()

    private setField(field: string, value: FilterValue): this {
        this.entries.set(field, value)
        return this
    }

    private mergeFieldOperator(
        field: string,
        operator: '$gt' | '$gte' | '$lt' | '$lte',
        value: number | Date,
    ): this {
        const existingValue = this.entries.get(field)
        const mergedValue =
            existingValue &&
            typeof existingValue === 'object' &&
            !Array.isArray(existingValue)
                ? { ...(existingValue as Record<string, unknown>) }
                : {}

        switch (operator) {
            case '$gt':
                mergedValue.$gt = value
                break
            case '$gte':
                mergedValue.$gte = value
                break
            case '$lt':
                mergedValue.$lt = value
                break
            case '$lte':
                mergedValue.$lte = value
                break
        }
        this.entries.set(field, mergedValue)
        return this
    }

    /**
     * Add an exact match condition.
     */
    equals(field: string, value: unknown): this {
        return this.setField(field, value)
    }

    /**
     * Add an IN query ($in).
     */
    in(field: string, values: unknown[]): this {
        return this.setField(field, { $in: values })
    }

    /**
     * Add a NOT IN query ($nin).
     */
    notIn(field: string, values: unknown[]): this {
        return this.setField(field, { $nin: values })
    }

    /**
     * Add a greater than condition ($gt).
     */
    gt(field: string, value: number | Date): this {
        return this.mergeFieldOperator(field, '$gt', value)
    }

    /**
     * Add a greater than or equal condition ($gte).
     */
    gte(field: string, value: number | Date): this {
        return this.mergeFieldOperator(field, '$gte', value)
    }

    /**
     * Add a less than condition ($lt).
     */
    lt(field: string, value: number | Date): this {
        return this.mergeFieldOperator(field, '$lt', value)
    }

    /**
     * Add a less than or equal condition ($lte).
     */
    lte(field: string, value: number | Date): this {
        return this.mergeFieldOperator(field, '$lte', value)
    }

    /**
     * Add a date range query (between startDate and endDate).
     */
    dateRange(field: string, startDate: Date, endDate: Date): this {
        return this.setField(field, {
            $gte: startDate,
            $lte: endDate,
        })
    }

    /**
     * Add a regex/text match condition.
     */
    regex(field: string, pattern: string, options = DEFAULT_REGEX_OPTIONS): this {
        const safePattern = escapeRegexLiteral(pattern)
        const safeOptions =
            sanitizeRegexOptions(options) || DEFAULT_REGEX_OPTIONS

        return this.setField(field, {
            $regex: safePattern,
            $options: safeOptions,
        })
    }

    /**
     * Add an OR condition.
     */
    or(...conditions: Record<string, unknown>[]): this {
        return this.setField('$or', conditions)
    }

    /**
     * Add an AND condition.
     */
    and(...conditions: Record<string, unknown>[]): this {
        return this.setField('$and', conditions)
    }

    /**
     * Add a NOT condition.
     */
    not(field: string, value: unknown): this {
        return this.setField(field, { $ne: value })
    }

    /**
     * Add an EXISTS condition.
     */
    exists(field: string, shouldExist = true): this {
        return this.setField(field, { $exists: shouldExist })
    }

    /**
     * Add an array contains condition.
     */
    arrayContains(field: string, value: unknown): this {
        return this.setField(field, { $in: [value] })
    }

    /**
     * Add an array of size condition.
     */
    arraySize(field: string, size: number): this {
        return this.setField(field, { $size: size })
    }

    /**
     * Get the built filter object.
     */
    build(): Record<string, unknown> {
        return Object.fromEntries(
            Array.from(this.entries.entries()) as FilterEntry[],
        )
    }

    /**
     * Reset the query builder.
     */
    reset(): this {
        this.entries.clear()
        return this
    }
}

/**
 * Pre-built common filters for reuse.
 */
export const CommonFilters = {
    approved: () =>
        new QueryBuilder().equals('applicationStatus', 'approved').build(),

    pending: () =>
        new QueryBuilder().equals('applicationStatus', 'pending').build(),

    byDistrict: (districtId: number) =>
        new QueryBuilder().equals('districtId', districtId).build(),

    recent: (days = 7) => {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        return new QueryBuilder()
            .dateRange('createdAt', startDate, new Date())
            .build()
    },

    byName: (name: string) => new QueryBuilder().regex('firstName', name).build(),

    byTracking: (trackingNumber: string) =>
        new QueryBuilder().equals('trackingNumber', trackingNumber).build(),

    combine: (...filters: Record<string, unknown>[]) => ({
        $and: filters,
    }),
}

/**
 * Sort definitions for consistency.
 */
export const CommonSorts = {
    newest: { createdAt: -1 as const },
    oldest: { createdAt: 1 as const },
    statusThenDate: {
        applicationStatus: 1,
        createdAt: -1,
    } as const,
    districtThenStatus: {
        districtId: 1,
        applicationStatus: 1,
    } as const,
}
