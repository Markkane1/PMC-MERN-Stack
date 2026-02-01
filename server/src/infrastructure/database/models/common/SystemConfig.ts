import mongoose, { Schema, type Document } from 'mongoose'

export interface SystemConfigDocument extends Document {
  key: string
  value: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const SystemConfigSchema = new Schema<SystemConfigDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export const SystemConfigModel = mongoose.model<SystemConfigDocument>(
  'SystemConfig',
  SystemConfigSchema,
  'system_configs'
)
