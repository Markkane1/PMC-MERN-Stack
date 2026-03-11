import { describe, expect, it } from 'vitest'
import {
  calculateSkipLimit,
  paginateArray,
  paginateResponse,
  parsePaginationParams,
} from '../../server/src/infrastructure/utils/pagination'

describe('parsePaginationParams', () => {
  it('should parse valid page and pageSize values', () => {
    const parsed = parsePaginationParams({ page: '2', pageSize: '25' })
    expect(parsed).toEqual({ page: 2, pageSize: 25, skip: 25, limit: 25 })
  })

  it('should use defaults when values are missing or invalid', () => {
    const parsed = parsePaginationParams({})
    expect(parsed).toEqual({ page: 1, pageSize: 20, skip: 0, limit: 20 })
  })

  it('should enforce minimum bounds for negative page and pageSize', () => {
    const parsed = parsePaginationParams({ page: '-5', pageSize: '-10' })
    expect(parsed.page).toBe(1)
    expect(parsed.pageSize).toBe(1)
  })

  it('should enforce maximum limit bound of 100', () => {
    const parsed = parsePaginationParams({ page: '1', pageSize: '10000' })
    expect(parsed.pageSize).toBe(100)
    expect(parsed.limit).toBe(100)
  })

  it('should fallback to limit query param when pageSize is not provided', () => {
    const parsed = parsePaginationParams({ page: '3', limit: '10' })
    expect(parsed).toEqual({ page: 3, pageSize: 10, skip: 20, limit: 10 })
  })
})

describe('paginateResponse', () => {
  it('should build paginated response metadata correctly', () => {
    const response = paginateResponse([1, 2, 3], { page: 2, pageSize: 3, total: 10 })
    expect(response.data).toEqual([1, 2, 3])
    expect(response.pagination).toEqual({
      page: 2,
      limit: 3,
      total: 10,
      totalPages: 4,
    })
  })

  it('should handle empty datasets and zero totals', () => {
    const response = paginateResponse([], { page: 1, pageSize: 20, total: 0 })
    expect(response.pagination.totalPages).toBe(0)
  })
})

describe('paginateArray', () => {
  it('should slice an array using shared pagination params', () => {
    const response = paginateArray([1, 2, 3, 4, 5], parsePaginationParams({ page: '2', limit: '2' }))
    expect(response.data).toEqual([3, 4])
    expect(response.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
    })
  })
})

describe('calculateSkipLimit', () => {
  it('should calculate skip and limit for normal values', () => {
    expect(calculateSkipLimit(4, 25)).toEqual({ skip: 75, limit: 25 })
  })

  it('should calculate skip and limit for boundary values', () => {
    expect(calculateSkipLimit(1, 1)).toEqual({ skip: 0, limit: 1 })
    expect(calculateSkipLimit(2, 0)).toEqual({ skip: 0, limit: 0 })
  })
})
