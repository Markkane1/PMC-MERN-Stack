import { Request, Response, NextFunction } from 'express'

/**
 * Middleware to set appropriate Cache-Control headers
 * based on endpoint type
 */
export const cacheHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Reference data - cache 1 hour publicly
  if (req.path.includes('/districts') || req.path.includes('/tehsils')) {
    res.set('Cache-Control', 'public, max-age=3600')
    res.set('Vary', 'Accept-Encoding')
  }
  // User data - cache 5 min privately
  else if (req.path.includes('/applicant') || req.path.includes('/profile') || req.path.includes('/business-profile')) {
    res.set('Cache-Control', 'private, max-age=300')
  }
  // Real-time data - no caching
  else if (req.path.includes('/statistics') || req.path.includes('/dashboard')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
  }
  // Inspection reports - cache 30 minutes
  else if (req.path.includes('/inspection')) {
    res.set('Cache-Control', 'public, max-age=1800')
  }
  // Default - no caching
  else {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  }

  next()
}

export default cacheHeadersMiddleware
