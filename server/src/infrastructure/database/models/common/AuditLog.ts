import mongoose, { Schema, type Document } from 'mongoose'

export interface AuditLogDocument extends Document {
  legacyId?: number
  userId?: mongoose.Types.ObjectId
  username?: string
  action: string
  modelName?: string
  objectId?: string
  description?: string
  ipAddress?: string
  timestamp?: Date
  createdAt: Date
  updatedAt: Date
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    legacyId: { type: Number, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    action: { type: String, required: true },
    modelName: { type: String },
    objectId: { type: String },
    description: { type: String },
    ipAddress: { type: String },
    timestamp: { type: Date },
  },
  { timestamps: true }
)

export const AuditLogModel = mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema, 'audit_logs')
