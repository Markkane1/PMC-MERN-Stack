/**
 * Week 4: HTTP Compression Optimization
 * Gzip compression for response bodies
 */

import { Request, Response, NextFunction } from 'express'
import { createGzip } from 'zlib'

/**
 * Gzip compression middleware for HTTP responses
 * Compresses responses >1KB for supported clients
 */
export function compressionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check if client supports gzip
  const acceptEncoding = req.headers['accept-encoding'] || ''
  if (!acceptEncoding.includes('gzip')) {
    return next()
  }

  // Store original send method
  const originalSend = res.send

  // Override send method to compress
  res.send = ((data: any) => {
    // Only compress if content-type is compressible
    const contentType = res.getHeader('content-type') as string || ''
    const isCompressible = /json|javascript|text|xml|css/.test(contentType)

    const responseSize = typeof data === 'string' ? data.length : JSON.stringify(data).length

    // Only compress if >1KB
    if (!isCompressible || responseSize < 1024) {
      return originalSend.call(res, data)
    }

    // Set gzip headers
    res.setHeader('Content-Encoding', 'gzip')
    res.setHeader('Vary', 'Accept-Encoding')

    // Create gzip stream and pipe response
    const gzip = createGzip({ level: 6 })
    const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(JSON.stringify(data))

    gzip.on('data', (chunk) => {
      res.write(chunk)
    })

    gzip.on('end', () => {
      res.end()
    })

    gzip.write(buffer)
    gzip.end()

    return res
  }) as any

  next()
}

/**
 * Compress array of data for transmission
 * Useful for streaming large result sets
 */
export function compressData(data: any[], chunkSize: number = 100): any[][] {
  const chunks = []
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize))
  }
  return chunks
}
