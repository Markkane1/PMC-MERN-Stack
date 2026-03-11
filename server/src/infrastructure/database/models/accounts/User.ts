import mongoose, { Schema, type Document } from 'mongoose'

export interface UserDocument extends Document {
  username: string
  email?: string
  passwordHash: string
  firstName?: string
  lastName?: string
  avatar?: string
  sourceId?: number
  groups: string[]
  directPermissions?: string[]
  permissions?: string[]
  isActive: boolean
  isSuperadmin?: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<UserDocument>(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, index: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    avatar: { type: String },
    sourceId: { type: Number, index: true },
    groups: { type: [String], default: [] },
    directPermissions: { type: [String], default: [] },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isSuperadmin: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Auth and admin flows primarily look up users by username/email and filter active users by group.
UserSchema.index({ username: 1, isActive: 1 })
UserSchema.index({ email: 1, isActive: 1 }, { sparse: true })
UserSchema.index({ groups: 1, isActive: 1 })

export const UserModel = mongoose.model<UserDocument>('User', UserSchema, 'User')
