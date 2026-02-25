import mongoose, { Schema, type Document } from 'mongoose'

export interface UserAuditLogDocument extends Document {
  sourceId?: number
  userId?: number
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  isActive?: boolean
  isStaff?: boolean
  isSuperuser?: boolean
  dateJoined?: Date
  lastLogin?: Date
  changeReason?: string
  historyDate?: Date
  historyType?: string
  raw?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const UserAuditLogSchema = new Schema<UserAuditLogDocument>(
  {
    sourceId: { type: Number, index: true },
    userId: { type: Number, index: true },
    username: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    isActive: { type: Boolean },
    isStaff: { type: Boolean },
    isSuperuser: { type: Boolean },
    dateJoined: { type: Date },
    lastLogin: { type: Date },
    changeReason: { type: String },
    historyDate: { type: Date },
    historyType: { type: String },
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

export const UserAuditLogModel = mongoose.model<UserAuditLogDocument>(
  'UserAuditLog',
  UserAuditLogSchema,
  'UserAuditLog'
)
