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

export const UserModel = mongoose.model<UserDocument>('User', UserSchema, 'User')

// SocialAccount Schema for OAuth provider tracking
export interface SocialAccountDocument extends Document {
  userId: mongoose.Types.ObjectId
  provider: 'google' | 'github'
  providerId: string
  email?: string
  name?: string
  avatar?: string
  raw?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const SocialAccountSchema = new Schema<SocialAccountDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, required: true, enum: ['google', 'github'] },
    providerId: { type: String, required: true },
    email: { type: String },
    name: { type: String },
    avatar: { type: String },
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

// Create compound index to prevent duplicate OAuth accounts
SocialAccountSchema.index({ provider: 1, providerId: 1 }, { unique: true })

export const SocialAccountModel = mongoose.model<SocialAccountDocument>(
  'SocialAccount',
  SocialAccountSchema,
  'SocialAccount'
)
