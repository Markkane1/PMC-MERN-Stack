export function pointInPolygon(point: [number, number], polygon: number[][]) {
  const [x, y] = point
  let inside = false
  const points = polygon.filter((coords): coords is [number, number] =>
    Array.isArray(coords) &&
    coords.length >= 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number',
  )

  if (points.length < 3) {
    return false
  }

  let previousPoint = points.at(-1) as [number, number]
  for (const currentPoint of points) {
    const [xi, yi] = currentPoint
    const [xj, yj] = previousPoint

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi
    if (intersect) inside = !inside
    previousPoint = currentPoint
  }
  return inside
}

export function pointInMultiPolygon(point: [number, number], multi: number[][][][]) {
  for (const polygon of multi) {
    const [outerRing] = polygon
    if (outerRing && pointInPolygon(point, outerRing)) {
      return true
    }
  }
  return false
}
