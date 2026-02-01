import mongoose, { Schema, type Document } from 'mongoose'

export interface UserProfileDocument extends Document {
  userId: mongoose.Types.ObjectId
  districtId?: number
  districtName?: string
  districtShortName?: string
}

const UserProfileSchema = new Schema<UserProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    districtId: { type: Number },
    districtName: { type: String },
    districtShortName: { type: String },
  },
  { timestamps: true }
)

export const UserProfileModel = mongoose.model<UserProfileDocument>('UserProfile', UserProfileSchema, 'userprofiles')
