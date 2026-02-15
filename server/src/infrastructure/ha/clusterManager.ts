/**
 * Week 7: Cluster Manager
 * Manages cluster members, failover, and replication
 */

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  DEGRADED = 'DEGRADED',
  INACTIVE = 'INACTIVE',
}

export interface ClusterMember {
  id: string
  nodeId: string
  host: string
  port: number
  status: MemberStatus
  role: 'primary' | 'secondary' | 'arbiter'
  joinedAt: number
  lastHeartbeat: number
  metrics?: {
    uptime: number
    requestCount: number
    errorCount: number
  }
}

export interface ClusterConfig {
  nodeId: string
  clusterPort?: number
  heartbeatIntervalMs?: number
  electionTimeoutMs?: number
}

/**
 * Cluster Manager
 * Manages cluster membership and failover
 */
export class ClusterManager {
  private config: ClusterConfig
  private members: Map<string, ClusterMember> = new Map()
  private primaryMemberId: string | null = null
  private secondaryMembers: Set<string> = new Set()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private electionTimeout: NodeJS.Timeout | null = null

  constructor(config: ClusterConfig) {
    this.config = {
      heartbeatIntervalMs: 3000, // 3 seconds
      electionTimeoutMs: 15000, // 15 seconds
      ...config,
    }

    // Register self as primary initially
    this.addMember({
      id: this.generateMemberId(),
      nodeId: config.nodeId,
      host: 'localhost',
      port: config.clusterPort || 3000,
      status: MemberStatus.ACTIVE,
      role: 'primary',
      joinedAt: Date.now(),
      lastHeartbeat: Date.now(),
    })
  }

  /**
   * Add member to cluster
   */
  addMember(member: ClusterMember): void {
    this.members.set(member.id, member)

    if (member.role === 'primary') {
      this.primaryMemberId = member.id
    } else if (member.role === 'secondary') {
      this.secondaryMembers.add(member.id)
    }
  }

  /**
   * Remove member from cluster
   */
  removeMember(memberId: string): void {
    const member = this.members.get(memberId)
    if (member) {
      if (member.role === 'primary' && this.primaryMemberId === memberId) {
        this.primaryMemberId = null
        this.electNewPrimary()
      } else if (member.role === 'secondary') {
        this.secondaryMembers.delete(memberId)
      }
      this.members.delete(memberId)
    }
  }

  /**
   * Record heartbeat from member
   */
  recordHeartbeat(memberId: string): void {
    const member = this.members.get(memberId)
    if (member) {
      member.lastHeartbeat = Date.now()
      if (member.status === MemberStatus.INACTIVE) {
        member.status = MemberStatus.ACTIVE
      }
    }
  }

  /**
   * Check for failed members
   */
  checkMemberHealth(): MemberStatus[] {
    const now = Date.now()
    const timeout = this.config.heartbeatIntervalMs! * 3 // Allow 3 missed heartbeats

    const statusChanges: MemberStatus[] = []

    for (const member of this.members.values()) {
      if (member.id === this.primaryMemberId) continue // Don't mark self

      const lastHeartbeatAge = now - member.lastHeartbeat

      if (lastHeartbeatAge > timeout) {
        if (member.status !== MemberStatus.INACTIVE) {
          member.status = MemberStatus.INACTIVE
          statusChanges.push(MemberStatus.INACTIVE)

          // If primary failed, trigger election
          if (member.role === 'primary') {
            this.electNewPrimary()
          }
        }
      } else if (lastHeartbeatAge > timeout / 2) {
        if (member.status !== MemberStatus.DEGRADED) {
          member.status = MemberStatus.DEGRADED
          statusChanges.push(MemberStatus.DEGRADED)
        }
      }
    }

    return statusChanges
  }

  /**
   * Elect new primary from secondary members
   */
  private electNewPrimary(): void {
    if (this.secondaryMembers.size === 0) return

    // Select secondary with most recent heartbeat
    let newPrimaryId: string | null = null
    let mostRecentHeartbeat = 0

    for (const memberId of this.secondaryMembers) {
      const member = this.members.get(memberId)
      if (member && member.lastHeartbeat > mostRecentHeartbeat) {
        newPrimaryId = memberId
        mostRecentHeartbeat = member.lastHeartbeat
      }
    }

    if (newPrimaryId) {
      const newPrimary = this.members.get(newPrimaryId)
      if (newPrimary) {
        if (this.primaryMemberId) {
          const oldPrimary = this.members.get(this.primaryMemberId)
          if (oldPrimary) {
            oldPrimary.role = 'secondary'
            this.secondaryMembers.add(this.primaryMemberId)
          }
        }

        newPrimary.role = 'primary'
        this.secondaryMembers.delete(newPrimaryId)
        this.primaryMemberId = newPrimaryId
      }
    }
  }

  /**
   * Get cluster state
   */
  getClusterState() {
    return {
      nodeId: this.config.nodeId,
      members: Array.from(this.members.values()),
      primaryMemberId: this.primaryMemberId,
      secondaryMembers: Array.from(this.secondaryMembers),
      totalMembers: this.members.size,
      activeMembers: Array.from(this.members.values()).filter((m) => m.status === MemberStatus.ACTIVE)
        .length,
    }
  }

  /**
   * Get member info
   */
  getMember(memberId: string): ClusterMember | null {
    return this.members.get(memberId) || null
  }

  /**
   * Get primary member
   */
  getPrimaryMember(): ClusterMember | null {
    return this.primaryMemberId ? this.members.get(this.primaryMemberId) || null : null
  }

  /**
   * Get all secondary members
   */
  getSecondaryMembers(): ClusterMember[] {
    return Array.from(this.secondaryMembers)
      .map((id) => this.members.get(id))
      .filter((m) => m !== undefined) as ClusterMember[]
  }

  /**
   * Get all active members
   */
  getActiveMembers(): ClusterMember[] {
    return Array.from(this.members.values()).filter((m) => m.status === MemberStatus.ACTIVE)
  }

  /**
   * Update member metrics
   */
  updateMemberMetrics(memberId: string, metrics: ClusterMember['metrics']): void {
    const member = this.members.get(memberId)
    if (member) {
      member.metrics = metrics
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (this.heartbeatInterval) return

    this.heartbeatInterval = setInterval(() => {
      this.checkMemberHealth()
    }, this.config.heartbeatIntervalMs || 3000)

    this.heartbeatInterval.unref()
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Generate unique member ID
   */
  private generateMemberId(): string {
    return `${this.config.nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Clear cluster
   */
  clear(): void {
    this.stopHealthChecks()
    this.members.clear()
    this.secondaryMembers.clear()
    this.primaryMemberId = null
  }
}

// Default cluster manager instance (requires nodeId)
export const createClusterManager = (config: ClusterConfig): ClusterManager => {
  return new ClusterManager(config)
}
