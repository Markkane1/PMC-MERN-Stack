import mongoose, { Schema, type Document } from 'mongoose'

export interface ApiLogDocument extends Document {
  legacyId?: number
  serviceName: string
  endpoint: string
  requestData?: Record<string, unknown>
  responseData?: Record<string, unknown>
  statusCode?: number
  createdAt: Date
  updatedAt: Date
}

const ApiLogSchema = new Schema<ApiLogDocument>(
  {
    legacyId: { type: Number, index: true },
    serviceName: { type: String, required: true },
    endpoint: { type: String, required: true },
    requestData: { type: Schema.Types.Mixed },
    responseData: { type: Schema.Types.Mixed },
    statusCode: { type: Number },
  },
  { timestamps: true }
)

ApiLogSchema.index({ createdAt: -1 })
ApiLogSchema.index({ endpoint: 1, createdAt: -1 })
ApiLogSchema.index({ serviceName: 1, createdAt: -1 })
ApiLogSchema.index({ statusCode: 1, createdAt: -1 })

export const ApiLogModel = mongoose.model<ApiLogDocument>('ApiLog', ApiLogSchema, 'ApiLog')
