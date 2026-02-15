/**
 * Week 7: High Availability Module Exports
 * Centralized exports for load balancing, service discovery, health checks, and clustering
 */

// Load Balancing
export {
  RoundRobinBalancer,
  LeastConnectionsBalancer,
  WeightedBalancer,
  IpHashBalancer,
  roundRobinBalancer,
  type LoadBalancerNode,
  type LoadBalancerStats,
} from './loadBalancer'

// Service Registry & Discovery
export {
  ServiceRegistry,
  serviceRegistry,
  type ServiceInstance,
  type ServiceRegistryConfig,
} from './serviceRegistry'

// Health Checks
export {
  HealthCheck,
  HttpHealthCheck,
  MemoryHealthCheck,
  DiskHealthCheck,
  DatabaseHealthCheck,
  HealthCheckAggregator,
  healthCheckAggregator,
  HealthStatus,
  type HealthCheckResult,
  type HealthCheckConfig,
} from './healthCheck'

// Cluster Management
export {
  ClusterManager,
  createClusterManager,
  MemberStatus,
  type ClusterMember,
  type ClusterConfig,
} from './clusterManager'

// Routes
export { haRouter } from './routes'
