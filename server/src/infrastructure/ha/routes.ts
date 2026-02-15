/**
 * Week 7: High Availability Management Routes
 * API endpoints for managing cluster, load balancing, and health checks
 */

import { Router, Request, Response } from 'express'
import { roundRobinBalancer } from './loadBalancer'
import { serviceRegistry } from './serviceRegistry'
import { healthCheckAggregator, HealthStatus } from './healthCheck'

export const haRouter = Router()

/**
 * GET /load-balancer/nodes
 * Get all load balancer nodes and their stats
 */
haRouter.get('/load-balancer/nodes', (req: Request, res: Response) => {
  const nodes = roundRobinBalancer.getNodes()
  const stats = roundRobinBalancer.getStats()

  res.json({
    success: true,
    data: {
      nodes: nodes.map((n) => ({
        id: n.id,
        host: n.host,
        port: n.port,
        healthy: n.healthy,
        weight: n.weight,
        stats: stats[n.id],
      })),
      totalNodes: nodes.length,
      healthyNodes: nodes.filter((n) => n.healthy).length,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * POST /load-balancer/nodes
 * Add a new node
 */
haRouter.post('/load-balancer/nodes', (req: Request, res: Response) => {
  const { id, host, port, weight } = req.body

  if (!id || !host || !port) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: id, host, port',
      timestamp: new Date().toISOString(),
    })
  }

  roundRobinBalancer.addNode({ id, host, port, weight })

  res.json({
    success: true,
    data: { message: `Node ${id} added` },
    timestamp: new Date().toISOString(),
  })
})

/**
 * DELETE /load-balancer/nodes/:nodeId
 * Remove a node
 */
haRouter.delete('/load-balancer/nodes/:nodeId', (req: Request, res: Response) => {
  const { nodeId } = req.params
  roundRobinBalancer.removeNode(nodeId)

  res.json({
    success: true,
    data: { message: `Node ${nodeId} removed` },
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /service-registry/services
 * List all registered services
 */
haRouter.get('/service-registry/services', (req: Request, res: Response) => {
  const services = serviceRegistry.getAllServices()
  const stats = serviceRegistry.getStats()

  res.json({
    success: true,
    data: {
      services,
      stats,
      totalServices: services.length,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /service-registry/services/:serviceName
 * List all instances of a service
 */
haRouter.get('/service-registry/services/:serviceName', (req: Request, res: Response) => {
  const { serviceName } = req.params
  const instances = serviceRegistry.getInstances(serviceName)
  const healthyInstances = serviceRegistry.getHealthyInstances(serviceName)

  res.json({
    success: true,
    data: {
      serviceName,
      totalInstances: instances.length,
      healthyInstances: healthyInstances.length,
      instances: instances.map((i) => ({
        id: i.id,
        host: i.host,
        port: i.port,
        healthy: i.healthy,
        registeredAt: i.registeredAt,
        lastHeartbeat: i.lastHeartbeat,
        tags: i.tags,
      })),
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * POST /service-registry/register
 * Register a service instance
 */
haRouter.post('/service-registry/register', (req: Request, res: Response) => {
  const { id, serviceName, host, port, tags, metadata } = req.body

  if (!id || !serviceName || !host || !port) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: id, serviceName, host, port',
      timestamp: new Date().toISOString(),
    })
  }

  serviceRegistry.register({
    id,
    serviceName,
    host,
    port,
    tags,
    metadata,
  })

  res.json({
    success: true,
    data: { message: `Service ${serviceName}/${id} registered` },
    timestamp: new Date().toISOString(),
  })
})

/**
 * DELETE /service-registry/deregister/:serviceName/:instanceId
 * Deregister a service instance
 */
haRouter.delete('/service-registry/deregister/:serviceName/:instanceId', (req: Request, res: Response) => {
  const { serviceName, instanceId } = req.params
  serviceRegistry.deregister(serviceName, instanceId)

  res.json({
    success: true,
    data: { message: `Service ${serviceName}/${instanceId} deregistered` },
    timestamp: new Date().toISOString(),
  })
})

/**
 * POST /service-registry/heartbeat/:serviceName/:instanceId
 * Record heartbeat for service instance
 */
haRouter.post(
  '/service-registry/heartbeat/:serviceName/:instanceId',
  (req: Request, res: Response) => {
    const { serviceName, instanceId } = req.params
    const success = serviceRegistry.heartbeat(serviceName, instanceId)

    if (!success) {
      return res.status(404).json({
        success: false,
        error: `Service ${serviceName}/${instanceId} not found`,
        timestamp: new Date().toISOString(),
      })
    }

    res.json({
      success: true,
      data: { message: 'Heartbeat recorded' },
      timestamp: new Date().toISOString(),
    })
  }
)

/**
 * GET /health-checks
 * Get all health check results
 */
haRouter.get('/health-checks', async (req: Request, res: Response) => {
  const { status, results } = await healthCheckAggregator.getOverallStatus()

  res.json({
    success: true,
    data: {
      overallStatus: status,
      healthy: status === HealthStatus.HEALTHY,
      results,
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * POST /health-checks/run
 * Run all health checks immediately
 */
haRouter.post('/health-checks/run', async (req: Request, res: Response) => {
  const results = await healthCheckAggregator.runAllChecks()

  res.json({
    success: true,
    data: { results },
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /ha/status
 * Get comprehensive HA status
 */
haRouter.get('/ha/status', async (req: Request, res: Response) => {
  const { status: healthStatus, results } = await healthCheckAggregator.getOverallStatus()
  const nodes = roundRobinBalancer.getNodes()
  const services = serviceRegistry.getAllServices()
  const stats = serviceRegistry.getStats()

  res.json({
    success: true,
    data: {
      overallHealth: healthStatus,
      loadBalancer: {
        totalNodes: nodes.length,
        healthyNodes: nodes.filter((n) => n.healthy).length,
        nodes: nodes.map((n) => ({
          id: n.id,
          healthy: n.healthy,
          host: n.host,
          port: n.port,
        })),
      },
      serviceRegistry: {
        totalServices: services.length,
        services: stats,
      },
      healthChecks: {
        status: healthStatus,
        results,
      },
    },
    timestamp: new Date().toISOString(),
  })
})

/**
 * GET /ha/readiness
 * Check if service is ready to accept traffic
 */
haRouter.get('/ha/readiness', async (req: Request, res: Response) => {
  const { status } = await healthCheckAggregator.getOverallStatus()
  const isReady = status === HealthStatus.HEALTHY || status === HealthStatus.DEGRADED

  const statusCode = isReady ? 200 : 503

  res.status(statusCode).json({
    success: isReady,
    data: {
      ready: isReady,
      status,
      timestamp: new Date().toISOString(),
    },
  })
})

/**
 * GET /ha/liveness
 * Check if service is alive
 */
haRouter.get('/ha/liveness', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      alive: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  })
})
