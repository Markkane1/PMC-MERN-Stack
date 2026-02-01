export function pointInPolygon(point: [number, number], polygon: number[][]) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]
    const yi = polygon[i][1]
    const xj = polygon[j][0]
    const yj = polygon[j][1]

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function pointInMultiPolygon(point: [number, number], multi: number[][][][]) {
  for (const polygon of multi) {
    // polygon[0] is outer ring
    if (polygon.length > 0 && pointInPolygon(point, polygon[0])) {
      return true
    }
  }
  return false
}
