import mongoose from 'mongoose'

/**
 * Alert Priority Enum
 */
export enum AlertPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Alert Type Enum
 */
export enum AlertType {
  PAYMENT_DUE = 'PAYMENT_DUE',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  APPLICATION_APPROVED = 'APPLICATION_APPROVED',
  APPLICATION_REJECTED = 'APPLICATION_REJECTED',
  APPLICATION_SUBMITTED = 'APPLICATION_SUBMITTED',
  COMPETITION_REGISTRATION_OPEN = 'COMPETITION_REGISTRATION_OPEN',
  COMPETITION_DEADLINE = 'COMPETITION_DEADLINE',
  COMPETITION_RESULTS_PUBLISHED = 'COMPETITION_RESULTS_PUBLISHED',
  PSID_EXPIRING = 'PSID_EXPIRING',
  PSID_EXPIRED = 'PSID_EXPIRED',
  DOCUMENT_UPLOAD_REQUIRED = 'DOCUMENT_UPLOAD_REQUIRED',
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION',
}

/**
 * Channel Enum
 */
export enum AlertChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
  WHATSAPP = 'WHATSAPP',
}

/**
 * Alert Status Enum
 */
export enum AlertStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Alert Interface
 */
export interface IAlert {
  _id?: mongoose.Types.ObjectId
  applicantId: number
  title: string
  message: string
  description?: string
  type: AlertType
  priority: AlertPriority
  channels: AlertChannel[]
  status: AlertStatus
  isRead: boolean
  readAt?: Date
  metadata?: {
    relatedApplicantFeeId?: mongoose.Types.ObjectId
    relatedCompetitionId?: mongoose.Types.ObjectId
    relatedRegistrationId?: mongoose.Types.ObjectId
    relatedPSIDTrackingId?: mongoose.Types.ObjectId
    actionUrl?: string
    actionLabel?: string
    [key: string]: any
  }
  sentAt?: Date
  deliveredAt?: Date
  failureReason?: string
  retryCount?: number
  maxRetries?: number
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Alert Mongoose Schema Interface
 */
export type Alert = IAlert & Document

/**
 * Alert Recipient Interface
 */
export interface IAlertRecipient {
  _id?: mongoose.Types.ObjectId
  applicantId: number
  email: string
  phone: string
  preferences: {
    emailNotifications: boolean
    smsNotifications: boolean
    inAppNotifications: boolean
    whatsappNotifications: boolean
    alertTypes: AlertType[]
    doNotDisturbHours?: {
      startHour: number
      endHour: number
    }
  }
  isActive: boolean
  verifiedEmail?: boolean
  verifiedPhone?: boolean
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Alert Template Interface
 */
export interface IAlertTemplate {
  _id?: mongoose.Types.ObjectId
  name: string
  type: AlertType
  subject: string
  emailTemplate: string
  smsTemplate: string
  inAppTemplate: string
  whatsappTemplate: string
  variableNames: string[]
  isActive: boolean
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Create Alert DTO
 */
export interface CreateAlertDTO {
  applicantId: number
  title: string
  message: string
  description?: string
  type: AlertType
  priority?: AlertPriority
  channels: AlertChannel[]
  metadata?: IAlert['metadata']
}

/**
 * Send Alert DTO
 */
export interface SendAlertDTO {
  alertId: string
  channels: AlertChannel[]
  recipientEmail?: string
  recipientPhone?: string
}

/**
 * Alert Query Filter Interface
 */
export interface AlertQueryFilter {
  applicantId?: number
  type?: AlertType
  status?: AlertStatus
  priority?: AlertPriority
  isRead?: boolean
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}
