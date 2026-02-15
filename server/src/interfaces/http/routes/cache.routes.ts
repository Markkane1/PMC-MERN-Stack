import { Router, Request, Response } from 'express'
import { cacheManager } from '../../../infrastructure/cache/cacheManager'
import { getRedisClient } from '../../../infrastructure/cache/redisClient'

const cacheRouter = Router()

/**
 * Health check for Redis connection
 */
cacheRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await cacheManager.isHealthy()
    if (isHealthy) {
      const stats = await cacheManager.getStats()
      return res.json({
        status: 'healthy',
        connected: true,
        stats,
      })
    }
    return res.status(503).json({ status: 'unhealthy', connected: false })
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * Get cache statistics
 */
cacheRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await cacheManager.getStats()
    return res.json(stats)
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get stats',
    })
  }
})

/**
 * Clear all cache (admin only in production)
 */
cacheRouter.post('/clear', async (req: Request, res: Response) => {
  try {
    await cacheManager.clear()
    return res.json({ message: 'Cache cleared successfully' })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to clear cache',
    })
  }
})

export default cacheRouter
