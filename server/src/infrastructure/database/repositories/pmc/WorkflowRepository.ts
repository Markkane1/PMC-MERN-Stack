import type { FilterQuery, Model } from 'mongoose'
import { ApplicationAssignmentModel, type ApplicationAssignmentDocument } from '../../models/pmc/ApplicationAssignment'
import { InspectionReportModel, type InspectionReportDocument } from '../../models/pmc/InspectionReport'
import { ApplicantAlertModel, type ApplicantAlertDocument } from '../../models/pmc/ApplicantAlert'

/**
 * Filter options for workflow queries
 */
export interface WorkflowFilterOptions {
  applicantId?: number | string
  businessId?: number | string
  userId?: number | string
  status?: string
  priority?: string
  startDate?: Date
  endDate?: Date
  isActive?: boolean
  limit?: number
  offset?: number
  sort?: 'createdAt' | 'dueDate' | 'priority' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Query result for workflow queries
 */
export interface WorkflowQueryResult {
  items: any[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

/**
 * Specialized repository for managing workflow (Assignments, Inspections, Alerts)
 */
export class WorkflowRepository {
  private assignmentModel: Model<ApplicationAssignmentDocument> = ApplicationAssignmentModel
  private inspectionModel: Model<InspectionReportDocument> = InspectionReportModel
  private alertModel: Model<ApplicantAlertDocument> = ApplicantAlertModel

  // ============ APPLICATION ASSIGNMENTS ============

  /**
   * Create a new assignment
   */
  async createAssignment(data: Partial<ApplicationAssignmentDocument>): Promise<any> {
    const assignment = new this.assignmentModel(data)
    return assignment.save()
  }

  /**
   * Find assignment by ID
   */
  async findAssignmentById(id: string): Promise<any> {
    return this.assignmentModel.findById(id).lean().exec()
  }

  /**
   * Find assignments for an applicant
   */
  async findAssignmentsByApplicant(applicantId: number | string): Promise<any[]> {
    return this.assignmentModel
      .find({ applicantId, isActive: true })
      .sort({ dueDate: 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Find assignments assigned to a user
   */
  async findAssignmentsByUser(userId: number | string, status?: string): Promise<any[]> {
    const query: FilterQuery<ApplicationAssignmentDocument> = { assignedToUserId: userId, isActive: true }
    if (status) query.status = status

    return this.assignmentModel
      .find(query)
      .sort({ priority: -1, dueDate: 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Get pending assignments (due soon)
   */
  async getPendingAssignments(days: number = 7): Promise<any[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    return this.assignmentModel
      .find({
        status: { $in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
        dueDate: { $lte: futureDate },
        isActive: true
      })
      .sort({ dueDate: 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Get overdue assignments
   */
  async getOverdueAssignments(): Promise<any[]> {
    return this.assignmentModel
      .find({
        status: { $in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
        dueDate: { $lt: new Date() },
        isActive: true
      })
      .sort({ dueDate: 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Get assignment statistics by user
   */
  async getUserAssignmentStats(userId: number | string): Promise<any> {
    const pipeline = [
      { $match: { assignedToUserId: userId, isActive: true } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
          overdue: [
            { $match: { dueDate: { $lt: new Date() }, status: { $in: ['PENDING', 'IN_PROGRESS'] } } },
            { $count: 'count' }
          ],
          averageTime: [
            { $match: { completionDate: { $exists: true } } },
            {
              $group: {
                _id: null,
                avgTime: {
                  $avg: { $subtract: ['$completionDate', '$assignmentDate'] }
                }
              }
            }
          ]
        }
      }
    ]

    const result = await this.assignmentModel.aggregate(pipeline).exec()
    return result[0]
  }

  // ============ INSPECTION REPORTS ============

  /**
   * Create a new inspection report
   */
  async createInspection(data: Partial<InspectionReportDocument>): Promise<any> {
    const inspection = new this.inspectionModel(data)
    return inspection.save()
  }

  /**
   * Find inspection by ID
   */
  async findInspectionById(id: string): Promise<any> {
    return this.inspectionModel.findById(id).lean().exec()
  }

  /**
   * Find inspections for an applicant
   */
  async findInspectionsByApplicant(applicantId: number | string): Promise<any[]> {
    return this.inspectionModel
      .find({ applicantId, isActive: true })
      .sort({ actualDate: -1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Find inspections by inspector
   */
  async findInspectionsByInspector(inspectorId: number | string, status?: string): Promise<any[]> {
    const query: FilterQuery<InspectionReportDocument> = { inspectorId, isActive: true }
    if (status) query.status = status

    return this.inspectionModel
      .find(query)
      .sort({ actualDate: -1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Get inspection compliance statistics
   */
  async getComplianceStatistics(businessId?: number | string): Promise<any> {
    const matchStage: any = { isActive: true }
    if (businessId) matchStage.businessId = businessId

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalInspections: { $sum: 1 },
          completedCount: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          averageCompliance: { $avg: '$overallCompliance' },
          criticalIssuesTotal: { $sum: '$criticalIssues' },
          majorIssuesTotal: { $sum: '$majorIssues' },
          minorIssuesTotal: { $sum: '$minorIssues' },
          violationsFound: { $sum: { $cond: ['$violationsFound', 1, 0] } }
        }
      }
    ]

    const result = await this.inspectionModel.aggregate(pipeline).exec()
    return result[0] || {}
  }

  /**
   * Get inspections requiring follow-up
   */
  async getFollowUpRequired(): Promise<any[]> {
    return this.inspectionModel
      .find({
        followUpRequired: true,
        isActive: true
      })
      .select({ numericId: 1, applicantId: 1, businessId: 1, followUpDate: 1, overallRecommendation: 1 })
      .sort({ followUpDate: 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  // ============ APPLICANT ALERTS ============

  /**
   * Create a new alert
   */
  async createAlert(data: Partial<ApplicantAlertDocument>): Promise<any> {
    const alert = new this.alertModel(data)
    return alert.save()
  }

  /**
   * Find alert by ID
   */
  async findAlertById(id: string): Promise<any> {
    return this.alertModel.findById(id).lean().exec()
  }

  /**
   * Find open alerts for an applicant
   */
  async findOpenAlerts(applicantId: number | string): Promise<any[]> {
    return this.alertModel
      .find({
        applicantId,
        status: { $in: ['OPEN', 'ACKNOWLEDGED', 'IN_REVIEW'] },
        isActive: true,
        isArchived: false
      })
      .sort({ priority: -1, createdAt: -1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Find critical alerts
   */
  async findCriticalAlerts(limit: number = 50): Promise<any[]> {
    return this.alertModel
      .find({
        alertType: 'CRITICAL',
        status: { $in: ['OPEN', 'ACKNOWLEDGED'] },
        isActive: true
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Find alerts by category
   */
  async findAlertsByCategory(category: string): Promise<any[]> {
    return this.alertModel
      .find({
        category,
        isActive: true,
        isArchived: false
      })
      .sort({ dueDate: 1 })
      .lean()
      .exec() as Promise<any[]>
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(businessId?: number | string): Promise<any> {
    const matchStage: any = { isActive: true, isArchived: false }
    if (businessId) matchStage.businessId = businessId

    const pipeline = [
      { $match: matchStage },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byType: [{ $group: { _id: '$alertType', count: { $sum: 1 } } }],
          byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
          criticalCount: [
            { $match: { alertType: 'CRITICAL' } },
            { $count: 'count' }
          ],
          unresolvedCount: [
            { $match: { status: { $in: ['OPEN', 'ACKNOWLEDGED'] } } },
            { $count: 'count' }
          ]
        }
      }
    ]

    const result = await this.alertModel.aggregate(pipeline).exec()
    return result[0]
  }

  /**
   * Mark alert as acknowledged
   */
  async acknowledgeAlert(alertId: string, userId: number | string): Promise<any> {
    return this.alertModel.findByIdAndUpdate(
      alertId,
      {
        status: 'ACKNOWLEDGED',
        'recipients.$[elem].acknowledged': true,
        'recipients.$[elem].acknowledgedAt': new Date(),
        updatedBy: userId,
        updatedAt: new Date()
      },
      {
        arrayFilters: [{ 'elem.userId': userId }],
        new: true
      }
    ).lean().exec()
  }

  // ============ UNIFIED WORKFLOW QUERIES ============

  /**
   * Get comprehensive workflow dashboard metrics
   */
  async getWorkflowDashboard(businessId?: number | string): Promise<any> {
    const [assignmentStats, complianceStats, alertStats] = await Promise.all([
      this.getAssignmentDashboardStats(businessId),
      this.getComplianceStatistics(businessId),
      this.getAlertStatistics(businessId)
    ])

    return {
      assignments: assignmentStats,
      inspections: complianceStats,
      alerts: alertStats,
      timestamp: new Date()
    }
  }

  /**
   * Get assignment dashboard statistics
   */
  private async getAssignmentDashboardStats(businessId?: number | string): Promise<any> {
    const matchStage: any = { isActive: true }
    if (businessId) matchStage.businessId = businessId

    const pipeline = [
      { $match: matchStage },
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
          pending: [
            { $match: { status: { $in: ['PENDING', 'ASSIGNED'] } } },
            { $count: 'count' }
          ],
          overdue: [
            { $match: { dueDate: { $lt: new Date() }, status: { $in: ['PENDING', 'IN_PROGRESS'] } } },
            { $count: 'count' }
          ]
        }
      }
    ]

    const result = await this.assignmentModel.aggregate(pipeline).exec()
    return result[0]
  }

  /**
   * Search workflow items across all types
   */
  async searchWorkflow(filter: WorkflowFilterOptions): Promise<WorkflowQueryResult> {
    const {
      applicantId,
      businessId,
      status,
      priority,
      startDate,
      endDate,
      isActive = true,
      limit = 20,
      offset = 0
    } = filter

    let results: any[] = []
    let total = 0

    // Search assignments
    const assignmentQuery: FilterQuery<ApplicationAssignmentDocument> = { isActive }
    if (applicantId) assignmentQuery.applicantId = applicantId
    if (businessId) assignmentQuery.businessId = businessId
    if (status) assignmentQuery.status = status
    if (priority) assignmentQuery.priority = priority

    const assignments = await this.assignmentModel
      .find(assignmentQuery)
      .select({ numericId: 1, applicantId: 1, status: 1, dueDate: 1, priority: 1, itemType: { $literal: 'ASSIGNMENT' } })
      .lean()
      .exec()

    results.push(...assignments)
    total += assignments.length

    // Search inspections
    const inspectionQuery: FilterQuery<InspectionReportDocument> = { isActive }
    if (applicantId) inspectionQuery.applicantId = applicantId
    if (businessId) inspectionQuery.businessId = businessId
    if (status) inspectionQuery.status = status

    const inspections = await this.inspectionModel
      .find(inspectionQuery)
      .select({ numericId: 1, applicantId: 1, status: 1, actualDate: 1, overallCompliance: 1, itemType: { $literal: 'INSPECTION' } })
      .lean()
      .exec()

    results.push(...inspections)
    total += inspections.length

    // Search alerts
    const alertQuery: FilterQuery<ApplicantAlertDocument> = { isActive }
    if (applicantId) alertQuery.applicantId = applicantId
    if (businessId) alertQuery.businessId = businessId
    if (status) alertQuery.status = status
    if (priority) alertQuery.priority = priority

    const alerts = await this.alertModel
      .find(alertQuery)
      .select({ numericId: 1, applicantId: 1, status: 1, dueDate: 1, priority: 1, itemType: { $literal: 'ALERT' } })
      .lean()
      .exec()

    results.push(...alerts)
    total += alerts.length

    // Filter by date range
    if (startDate || endDate) {
      results = results.filter((r: any) => {
        const date = r.actualDate || r.dueDate || r.createdAt
        if (startDate && new Date(date) < startDate) return false
        if (endDate && new Date(date) > endDate) return false
        return true
      })
      total = results.length
    }

    // Paginate
    results = results.slice(offset, offset + limit)

    const page = Math.floor(offset / limit) + 1
    const pageSize = limit
    const totalPages = Math.ceil(total / pageSize)
    const hasMore = offset + limit < total

    return {
      items: results,
      total,
      page,
      pageSize,
      totalPages,
      hasMore
    }
  }
}

// Export singleton instance
export const workflowRepository = new WorkflowRepository()
