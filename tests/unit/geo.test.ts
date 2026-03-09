import { describe, expect, it } from 'vitest'
import { pointInMultiPolygon, pointInPolygon } from '../../server/src/shared/utils/geo'

describe('pointInPolygon', () => {
  const square = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ]

  it('should return true when point is inside polygon', () => {
    expect(pointInPolygon([5, 5], square)).toBe(true)
  })

  it('should return false when point is outside polygon', () => {
    expect(pointInPolygon([11, 11], square)).toBe(false)
  })

  it('should return false for an empty polygon', () => {
    expect(pointInPolygon([1, 1], [])).toBe(false)
  })
})

describe('pointInMultiPolygon', () => {
  const multiPolygon = [
    [
      [
        [0, 0],
        [5, 0],
        [5, 5],
        [0, 5],
      ],
    ],
    [
      [
        [10, 10],
        [20, 10],
        [20, 20],
        [10, 20],
      ],
    ],
  ]

  it('should return true when point is inside one polygon in multipolygon', () => {
    expect(pointInMultiPolygon([2, 2], multiPolygon)).toBe(true)
    expect(pointInMultiPolygon([12, 12], multiPolygon)).toBe(true)
  })

  it('should return false when point is outside all polygons in multipolygon', () => {
    expect(pointInMultiPolygon([7, 7], multiPolygon)).toBe(false)
  })

  it('should return false for empty multipolygon input', () => {
    expect(pointInMultiPolygon([1, 1], [])).toBe(false)
  })
})
