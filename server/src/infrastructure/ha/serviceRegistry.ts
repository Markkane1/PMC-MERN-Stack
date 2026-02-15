/**
 * Week 7: Service Registry & Discovery
 * Manages service registration, deregistration, and discovery
 */

export interface ServiceInstance {
  id: string
  serviceName: string
  host: string
  port: number
  metadata?: Record<string, any>
  healthy?: boolean
  registeredAt?: number
  lastHeartbeat?: number
  tags?: string[]
}

export interface ServiceRegistryConfig {
  heartbeatIntervalMs?: number
  heartbeatTimeoutMs?: number
  deregistrationDelayMs?: number
}

/**
 * Service Registry & Discovery
 * In-memory registry for service instances
 */
export class ServiceRegistry {
  private services: Map<string, Map<string, ServiceInstance>> = new Map()
  private config: ServiceRegistryConfig
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: ServiceRegistryConfig = {}) {
    this.config = {
      heartbeatIntervalMs: 30000, // 30 seconds
      heartbeatTimeoutMs: 90000, // 90 seconds
      deregistrationDelayMs: 5000, // 5 seconds
      ...config,
    }
  }

  /**
   * Register a service instance
   */
  register(instance: ServiceInstance): void {
    const serviceName = instance.serviceName
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, new Map())
    }

    instance.registeredAt = Date.now()
    instance.lastHeartbeat = Date.now()
    instance.healthy = instance.healthy ?? true

    const serviceInstances = this.services.get(serviceName)!
    serviceInstances.set(instance.id, instance)
  }

  /**
   * Deregister a service instance
   */
  deregister(serviceName: string, instanceId: string): void {
    const serviceInstances = this.services.get(serviceName)
    if (serviceInstances) {
      serviceInstances.delete(instanceId)

      // Clean up service if no instances left
      if (serviceInstances.size === 0) {
        this.services.delete(serviceName)
      }
    }
  }

  /**
   * Record heartbeat for instance
   */
  heartbeat(serviceName: string, instanceId: string): boolean {
    const instance = this.getInstance(serviceName, instanceId)
    if (instance) {
      instance.lastHeartbeat = Date.now()
      instance.healthy = true
      return true
    }
    return false
  }

  /**
   * Get all instances of a service
   */
  getInstances(serviceName: string): ServiceInstance[] {
    const serviceInstances = this.services.get(serviceName)
    if (!serviceInstances) return []
    return Array.from(serviceInstances.values())
  }

  /**
   * Get healthy instances
   */
  getHealthyInstances(serviceName: string): ServiceInstance[] {
    return this.getInstances(serviceName).filter((i) => i.healthy)
  }

  /**
   * Get single instance
   */
  getInstance(serviceName: string, instanceId: string): ServiceInstance | null {
    const serviceInstances = this.services.get(serviceName)
    if (!serviceInstances) return null
    return serviceInstances.get(instanceId) || null
  }

  /**
   * Mark instance as unhealthy
   */
  markUnhealthy(serviceName: string, instanceId: string): void {
    const instance = this.getInstance(serviceName, instanceId)
    if (instance) {
      instance.healthy = false
    }
  }

  /**
   * Mark instance as healthy
   */
  markHealthy(serviceName: string, instanceId: string): void {
    const instance = this.getInstance(serviceName, instanceId)
    if (instance) {
      instance.healthy = true
    }
  }

  /**
   * Get all services
   */
  getAllServices(): string[] {
    return Array.from(this.services.keys())
  }

  /**
   * Get registry stats
   */
  getStats() {
    const stats: Record<string, any> = {}

    for (const [serviceName, instances] of this.services) {
      const instanceList = Array.from(instances.values())
      stats[serviceName] = {
        totalInstances: instanceList.length,
        healthyInstances: instanceList.filter((i) => i.healthy).length,
        unhealthyInstances: instanceList.filter((i) => !i.healthy).length,
        instances: instanceList.map((i) => ({
          id: i.id,
          host: i.host,
          port: i.port,
          healthy: i.healthy,
          lastHeartbeat: i.lastHeartbeat,
        })),
      }
    }

    return stats
  }

  /**
   * Clean up stale instances
   * Marks instances as unhealthy if heartbeat expired
   */
  checkHeartbeats(): number {
    let staledCount = 0
    const now = Date.now()
    const timeout = this.config.heartbeatTimeoutMs || 90000

    for (const instances of this.services.values()) {
      for (const instance of instances.values()) {
        if (instance.lastHeartbeat && now - instance.lastHeartbeat > timeout) {
          if (instance.healthy) {
            instance.healthy = false
            staledCount++
          }
        }
      }
    }

    return staledCount
  }

  /**
   * Clear registry
   */
  clear(): void {
    this.services.clear()
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval)
    }
    this.heartbeatIntervals.clear()
  }
}

// Default registry instance
export const serviceRegistry = new ServiceRegistry()
