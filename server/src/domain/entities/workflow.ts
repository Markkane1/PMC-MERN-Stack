/**
 * Workflow Domain Entities
 * Manages application processing workflow including assignments, inspections, and alerts
 */

// ============ ENUMS ============

export enum AssignmentStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum AssignmentPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum InspectionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  POSTPONED = 'POSTPONED',
  CANCELLED = 'CANCELLED'
}

export enum InspectionType {
  INITIAL = 'INITIAL',
  FOLLOW_UP = 'FOLLOW_UP',
  FINAL = 'FINAL',
  SPOT_CHECK = 'SPOT_CHECK',
  COMPLIANCE = 'COMPLIANCE'
}

export enum FindingStatus {
  COMPLIANT = 'COMPLIANT',
  MINOR_ISSUE = 'MINOR_ISSUE',
  MAJOR_ISSUE = 'MAJOR_ISSUE',
  CRITICAL_ISSUE = 'CRITICAL_ISSUE'
}

export enum AlertType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum AlertCategory {
  DOCUMENT_EXPIRY = 'DOCUMENT_EXPIRY',
  COMPLIANCE_ISSUE = 'COMPLIANCE_ISSUE',
  INSPECTION_REQUIRED = 'INSPECTION_REQUIRED',
  PAYMENT_DUE = 'PAYMENT_DUE',
  SUBMISSION_DEADLINE = 'SUBMISSION_DEADLINE',
  LICENSE_RENEWAL = 'LICENSE_RENEWAL',
  QUALITY_ALERT = 'QUALITY_ALERT',
  SAFETY_CONCERN = 'SAFETY_CONCERN'
}

export enum AlertStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

// ============ APPLICATION ASSIGNMENT ============

/**
 * Represents workflow assignment of applications to inspectors/processors
 */
export interface ApplicationAssignment {
  numericId?: number
  applicantId: number | string
  businessId: number | string
  assignedToUserId: number | string
  assignedToName?: string
  assignedToEmail?: string
  assignmentType: 'INSPECTION' | 'VERIFICATION' | 'APPROVAL' | 'PROCESSING'
  status: AssignmentStatus
  priority: AssignmentPriority
  dueDate: Date
  assignmentDate: Date
  completionDate?: Date
  notes?: string
  instructions?: string
  attachments?: string[] // File paths
  previousAssignee?: {
    userId: number | string
    name: string
    completionDate: Date
    reason: string
  }
  escalationLevel: number // 0 = initial, 1+ = escalations
  escalatedOn?: Date
  escalationReason?: string
  performanceMetrics?: {
    averageCompletionTime: number // in hours
    completionRate: number // percentage
    qualityScore: number // 0-100
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: number | string
  updatedBy: number | string
}

// ============ INSPECTION REPORT ============

/**
 * Documents inspection findings and recommendations
 */
export interface InspectionFinding {
  findingId?: string
  category: string
  description: string
  status: FindingStatus
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  evidence?: {
    imageUrls?: string[]
    videoUrl?: string
    documentUrls?: string[]
    observations?: string
  }
  recommendation?: string
  deadline?: Date
  completionStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  completionNotes?: string
}

export interface InspectionReport {
  numericId?: number
  inspectorId: number | string
  inspectorName?: string
  applicantId: number | string
  businessId: number | string
  assignmentId?: string
  inspectionType: InspectionType
  status: InspectionStatus
  scheduledDate?: Date
  actualDate: Date
  duration?: number // in minutes
  location?: {
    name?: string
    address?: string
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  findings: InspectionFinding[]
  overallCompliance: number // 0-100 percentage
  overallRecommendation: 'APPROVE' | 'CONDITIONAL_APPROVAL' | 'REJECT' | 'FURTHER_INSPECTION'
  violationsFound: boolean
  criticalIssues: number
  majorIssues: number
  minorIssues: number
  photosAttached: number
  reportsAttached: string[] // File paths
  observations?: string
  nextSteps?: string
  followUpRequired: boolean
  followUpDate?: Date
  followUpType?: InspectionType
  inspectorSignature?: string
  supervisorReview?: {
    reviewedBy: number | string
    reviewDate: Date
    comments?: string
    approved: boolean
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: number | string
  updatedBy: number | string
}

// ============ APPLICANT ALERT ============

/**
 * Tracks alerts and notifications for applicants
 */
export interface AlertRecipient {
  userId: number | string
  name?: string
  email?: string
  notificationMethod?: 'EMAIL' | 'SMS' | 'IN_SYSTEM'
  acknowledged?: boolean
  acknowledgedAt?: Date
}

export interface ApplicantAlert {
  numericId?: number
  applicantId: number | string
  businessId?: number | string
  alertType: AlertType
  category: AlertCategory
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: AlertStatus
  source?: {
    type: 'SYSTEM' | 'MANUAL' | 'SCHEDULED'
    triggeredBy?: number | string
    automationRule?: string
  }
  relatedEntity?: {
    entityType: 'DOCUMENT' | 'BUSINESS_PROFILE' | 'INSPECTION' | 'ASSIGNMENT' | 'APPLICATION'
    entityId: string
    entityName?: string
  }
  recipients: AlertRecipient[]
  dueDate?: Date
  resolvedDate?: Date
  resolutionNotes?: string
  resolutionReason?: string
  repeating?: {
    enabled: boolean
    frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    endDate?: Date
    nextOccurrence?: Date
  }
  internalNotes?: string
  attachments?: string[] // File paths
  tags?: string[]
  escalatedTo?: {
    userId: number | string
    name?: string
    escalatedAt: Date
    escalationReason: string
  }
  isActive: boolean
  isArchived?: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: number | string
  updatedBy: number | string
}

// ============ WORKFLOW STATISTICS & FILTERS ============

/**
 * Filter options for workflow queries
 */
export interface WorkflowFilterOptions {
  applicantId?: number | string
  businessId?: number | string
  userId?: number | string
  status?: string
  category?: string
  alertType?: string
  startDate?: Date
  endDate?: Date
  priority?: string
  isActive?: boolean
  searchText?: string
  limit?: number
  offset?: number
  sort?: 'createdAt' | 'dueDate' | 'priority' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Query result for workflow operations
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
 * Workflow statistics
 */
export interface WorkflowStatistics {
  totalAssignments?: number
  pendingAssignments?: number
  overDueAssignments?: number
  averageCompletionTime?: number
  totalInspections?: number
  completedInspections?: number
  totalAlerts?: number
  openAlerts?: number
  criticalAlerts?: number
  resolvedAlerts?: number
  byStatus?: Record<string, number>
  byPriority?: Record<string, number>
  byType?: Record<string, number>
  performanceMetrics?: {
    assignmentCompletionRate: number
    inspectionQualityScore: number
    alertResolutionRate: number
    averageResponseTime: number
  }
}

/**
 * Dashboard metrics for workflow monitoring
 */
export interface WorkflowDashboard {
  dateRange: {
    startDate: Date
    endDate: Date
  }
  assignments: {
    total: number
    completed: number
    pending: number
    overdue: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
  }
  inspections: {
    total: number
    completed: number
    scheduled: number
    complianceRate: number
    byType: Record<string, number>
    byInspector: Record<string, number>
  }
  alerts: {
    total: number
    open: number
    resolved: number
    critical: number
    byCategory: Record<string, number>
    byStatus: Record<string, number>
  }
  teamPerformance?: {
    userId: number | string
    userName?: string
    assignmentCount: number
    completionRate: number
    averageTime: number
    qualityScore: number
  }[]
}
