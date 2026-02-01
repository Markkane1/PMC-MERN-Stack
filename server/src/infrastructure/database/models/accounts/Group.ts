import mongoose, { Schema, type Document } from 'mongoose'

export interface GroupDocument extends Document {
  djangoId?: number
  name: string
  permissions: string[]
  createdAt: Date
  updatedAt: Date
}

const GroupSchema = new Schema<GroupDocument>(
  {
    djangoId: { type: Number, index: true },
    name: { type: String, required: true, unique: true, index: true },
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
)

export const GroupModel = mongoose.model<GroupDocument>('Group', GroupSchema, 'groups')
