/**
 * Week 7: Load Balancing Strategies
 * Multiple load balancing algorithms for distributing requests
 */

export interface LoadBalancerNode {
  id: string
  host: string
  port: number
  weight?: number
  healthy?: boolean
  connections?: number
}

export interface LoadBalancerStats {
  nodeId: string
  requestCount: number
  errorCount: number
  totalResponseTime: number
  lastSelected: number
  avgResponseTime: number
}

/**
 * Round-robin load balancer
 * Distributes requests evenly across all nodes
 */
export class RoundRobinBalancer {
  private nodes: LoadBalancerNode[] = []
  private currentIndex: number = 0
  private stats: Map<string, LoadBalancerStats> = new Map()

  addNode(node: LoadBalancerNode): void {
    node.healthy = node.healthy ?? true
    this.nodes.push(node)
    this.stats.set(node.id, {
      nodeId: node.id,
      requestCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      lastSelected: 0,
      avgResponseTime: 0,
    })
  }

  removeNode(nodeId: string): void {
    this.nodes = this.nodes.filter((n) => n.id !== nodeId)
    this.stats.delete(nodeId)
  }

  getNextNode(): LoadBalancerNode | null {
    const healthyNodes = this.nodes.filter((n) => n.healthy)
    if (healthyNodes.length === 0) return null

    const node = healthyNodes[this.currentIndex % healthyNodes.length]
    this.currentIndex++
    this.recordSelection(node)
    return node
  }

  private recordSelection(node: LoadBalancerNode): void {
    const stats = this.stats.get(node.id)
    if (stats) {
      stats.lastSelected = Date.now()
    }
  }

  getStats(): Record<string, LoadBalancerStats> {
    const result: Record<string, LoadBalancerStats> = {}
    for (const [id, stat] of this.stats) {
      result[id] = {
        ...stat,
        avgResponseTime: stat.requestCount > 0 ? stat.totalResponseTime / stat.requestCount : 0,
      }
    }
    return result
  }

  recordResponse(nodeId: string, responseTime: number, isError: boolean): void {
    const stats = this.stats.get(nodeId)
    if (stats) {
      stats.requestCount++
      stats.totalResponseTime += responseTime
      if (isError) stats.errorCount++
    }
  }

  getNodes(): LoadBalancerNode[] {
    return [...this.nodes]
  }
}

/**
 * Least-connections load balancer
 * Routes to node with fewest active connections
 */
export class LeastConnectionsBalancer {
  private nodes: LoadBalancerNode[] = []
  private stats: Map<string, LoadBalancerStats> = new Map()

  addNode(node: LoadBalancerNode): void {
    node.healthy = node.healthy ?? true
    node.connections = 0
    this.nodes.push(node)
    this.stats.set(node.id, {
      nodeId: node.id,
      requestCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      lastSelected: 0,
      avgResponseTime: 0,
    })
  }

  removeNode(nodeId: string): void {
    this.nodes = this.nodes.filter((n) => n.id !== nodeId)
    this.stats.delete(nodeId)
  }

  getNextNode(): LoadBalancerNode | null {
    const healthyNodes = this.nodes.filter((n) => n.healthy)
    if (healthyNodes.length === 0) return null

    // Find node with least active connections
    const node = healthyNodes.reduce((prev, current) => {
      const prevConns = prev.connections || 0
      const currentConns = current.connections || 0
      return currentConns < prevConns ? current : prev
    })

    if (node.connections === undefined) {
      node.connections = 0
    }
    node.connections++

    this.recordSelection(node)
    return node
  }

  private recordSelection(node: LoadBalancerNode): void {
    const stats = this.stats.get(node.id)
    if (stats) {
      stats.lastSelected = Date.now()
    }
  }

  releaseConnection(nodeId: string): void {
    const node = this.nodes.find((n) => n.id === nodeId)
    if (node && node.connections !== undefined && node.connections > 0) {
      node.connections--
    }
  }

  recordResponse(nodeId: string, responseTime: number, isError: boolean): void {
    const stats = this.stats.get(nodeId)
    if (stats) {
      stats.requestCount++
      stats.totalResponseTime += responseTime
      if (isError) stats.errorCount++
    }
  }

  getStats(): Record<string, LoadBalancerStats> {
    const result: Record<string, LoadBalancerStats> = {}
    for (const [id, stat] of this.stats) {
      result[id] = {
        ...stat,
        avgResponseTime: stat.requestCount > 0 ? stat.totalResponseTime / stat.requestCount : 0,
      }
    }
    return result
  }

  getNodes(): LoadBalancerNode[] {
    return [...this.nodes]
  }
}

/**
 * Weighted load balancer
 * Distributes requests based on node weights
 */
export class WeightedBalancer {
  private nodes: LoadBalancerNode[] = []
  private totalWeight: number = 0
  private stats: Map<string, LoadBalancerStats> = new Map()
  private currentIndex: number = 0
  private currentWeight: number = 0
  private maxWeight: number = 0

  addNode(node: LoadBalancerNode): void {
    node.healthy = node.healthy ?? true
    node.weight = node.weight ?? 1
    this.nodes.push(node)
    this.totalWeight += node.weight
    this.maxWeight = Math.max(this.maxWeight, node.weight)
    this.stats.set(node.id, {
      nodeId: node.id,
      requestCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      lastSelected: 0,
      avgResponseTime: 0,
    })
  }

  removeNode(nodeId: string): void {
    const node = this.nodes.find((n) => n.id === nodeId)
    if (node) {
      this.totalWeight -= node.weight || 1
    }
    this.nodes = this.nodes.filter((n) => n.id !== nodeId)
    this.stats.delete(nodeId)
  }

  getNextNode(): LoadBalancerNode | null {
    const healthyNodes = this.nodes.filter((n) => n.healthy)
    if (healthyNodes.length === 0) return null

    // Smooth weighted algorithm
    for (const node of healthyNodes) {
      node.weight = node.weight || 1
      this.currentWeight += node.weight
    }

    const node = healthyNodes.reduce((prev, current) => {
      if ((current.weight || 1) > (prev.weight || 1)) {
        return current
      }
      return prev
    })

    this.currentWeight -= node.weight || 1
    this.recordSelection(node)
    return node
  }

  private recordSelection(node: LoadBalancerNode): void {
    const stats = this.stats.get(node.id)
    if (stats) {
      stats.lastSelected = Date.now()
    }
  }

  recordResponse(nodeId: string, responseTime: number, isError: boolean): void {
    const stats = this.stats.get(nodeId)
    if (stats) {
      stats.requestCount++
      stats.totalResponseTime += responseTime
      if (isError) stats.errorCount++
    }
  }

  getStats(): Record<string, LoadBalancerStats> {
    const result: Record<string, LoadBalancerStats> = {}
    for (const [id, stat] of this.stats) {
      result[id] = {
        ...stat,
        avgResponseTime: stat.requestCount > 0 ? stat.totalResponseTime / stat.requestCount : 0,
      }
    }
    return result
  }

  getNodes(): LoadBalancerNode[] {
    return [...this.nodes]
  }
}

/**
 * IP Hash load balancer
 * Routes based on client IP hash (sticky sessions)
 */
export class IpHashBalancer {
  private nodes: LoadBalancerNode[] = []
  private stats: Map<string, LoadBalancerStats> = new Map()

  addNode(node: LoadBalancerNode): void {
    node.healthy = node.healthy ?? true
    this.nodes.push(node)
    this.stats.set(node.id, {
      nodeId: node.id,
      requestCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      lastSelected: 0,
      avgResponseTime: 0,
    })
  }

  removeNode(nodeId: string): void {
    this.nodes = this.nodes.filter((n) => n.id !== nodeId)
    this.stats.delete(nodeId)
  }

  getNextNode(clientIp: string): LoadBalancerNode | null {
    const healthyNodes = this.nodes.filter((n) => n.healthy)
    if (healthyNodes.length === 0) return null

    // Hash IP to select same node for same client
    const hash = this.hashIp(clientIp)
    const index = hash % healthyNodes.length
    const node = healthyNodes[index]

    this.recordSelection(node)
    return node
  }

  private hashIp(ip: string): number {
    let hash = 0
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  private recordSelection(node: LoadBalancerNode): void {
    const stats = this.stats.get(node.id)
    if (stats) {
      stats.lastSelected = Date.now()
    }
  }

  recordResponse(nodeId: string, responseTime: number, isError: boolean): void {
    const stats = this.stats.get(nodeId)
    if (stats) {
      stats.requestCount++
      stats.totalResponseTime += responseTime
      if (isError) stats.errorCount++
    }
  }

  getStats(): Record<string, LoadBalancerStats> {
    const result: Record<string, LoadBalancerStats> = {}
    for (const [id, stat] of this.stats) {
      result[id] = {
        ...stat,
        avgResponseTime: stat.requestCount > 0 ? stat.totalResponseTime / stat.requestCount : 0,
      }
    }
    return result
  }

  getNodes(): LoadBalancerNode[] {
    return [...this.nodes]
  }
}

// Default load balancer instance
export const roundRobinBalancer = new RoundRobinBalancer()
