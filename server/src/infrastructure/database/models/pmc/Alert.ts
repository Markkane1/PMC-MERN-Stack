import mongoose from 'mongoose'
import { AlertPriority, AlertType, AlertChannel, AlertStatus } from '../../../../domain/models/Alert'

/**
 * Alert Schema
 */
const alertSchema = new mongoose.Schema(
  {
    applicantId: {
      type: Number,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(AlertType),
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(AlertPriority),
      default: AlertPriority.MEDIUM,
    },
    channels: [
      {
        type: String,
        enum: Object.values(AlertChannel),
      },
    ],
    status: {
      type: String,
      enum: Object.values(AlertStatus),
      default: AlertStatus.PENDING,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sentAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
    indexes: [
      { applicantId: 1, createdAt: -1 },
      { applicantId: 1, isRead: 1 },
      { type: 1, applicantId: 1 },
      { status: 1 },
    ],
  }
)

/**
 * Alert Recipient Schema
 */
const alertRecipientSchema = new mongoose.Schema(
  {
    applicantId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: true,
      },
      inAppNotifications: {
        type: Boolean,
        default: true,
      },
      whatsappNotifications: {
        type: Boolean,
        default: false,
      },
      alertTypes: [
        {
          type: String,
          enum: Object.values(AlertType),
        },
      ],
      doNotDisturbHours: {
        startHour: {
          type: Number,
          min: 0,
          max: 23,
          default: null,
        },
        endHour: {
          type: Number,
          min: 0,
          max: 23,
          default: null,
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    verifiedEmail: {
      type: Boolean,
      default: false,
    },
    verifiedPhone: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

/**
 * Alert Template Schema
 */
const alertTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(AlertType),
      required: true,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
    },
    emailTemplate: {
      type: String,
      required: true,
    },
    smsTemplate: {
      type: String,
      required: true,
    },
    inAppTemplate: {
      type: String,
      required: true,
    },
    whatsappTemplate: {
      type: String,
      default: '',
    },
    variableNames: [String],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: String,
      default: 'SYSTEM',
    },
  },
  {
    timestamps: true,
  }
)

export const AlertModel = mongoose.model('Alert', alertSchema)
export const AlertRecipientModel = mongoose.model('AlertRecipient', alertRecipientSchema)
export const AlertTemplateModel = mongoose.model('AlertTemplate', alertTemplateSchema)
