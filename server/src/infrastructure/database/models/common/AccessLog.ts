import mongoose, { Schema, type Document } from 'mongoose'

export interface AccessLogDocument extends Document {
  legacyId?: number
  userId?: mongoose.Types.ObjectId
  username?: string
  modelName?: string
  objectId?: string
  method?: string
  ipAddress?: string
  endpoint?: string
  timestamp?: Date
  createdAt: Date
  updatedAt: Date
}

const AccessLogSchema = new Schema<AccessLogDocument>(
  {
    legacyId: { type: Number, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    modelName: { type: String },
    objectId: { type: String },
    method: { type: String },
    ipAddress: { type: String },
    endpoint: { type: String },
    timestamp: { type: Date },
  },
  { timestamps: true }
)

export const AccessLogModel = mongoose.model<AccessLogDocument>('AccessLog', AccessLogSchema, 'AccessLog')
