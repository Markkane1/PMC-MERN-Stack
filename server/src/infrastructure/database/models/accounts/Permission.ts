import mongoose, { Schema, type Document } from 'mongoose'

export interface PermissionDocument extends Document {
  sourceId?: number
  name: string
  codename: string
  appLabel?: string
  modelName?: string
  contentTypeId?: number
  permissionKey: string
  createdAt: Date
  updatedAt: Date
}

const PermissionSchema = new Schema<PermissionDocument>(
  {
    sourceId: { type: Number, index: true },
    name: { type: String, required: true },
    codename: { type: String, required: true },
    appLabel: { type: String },
    modelName: { type: String },
    contentTypeId: { type: Number },
    permissionKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
)

export const PermissionModel = mongoose.model<PermissionDocument>('Permission', PermissionSchema, 'Permission')
