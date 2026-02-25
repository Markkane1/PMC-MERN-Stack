import mongoose, { Schema, type Document } from 'mongoose'

export interface EecClubDocument extends Document {
  emisCode?: number
  schoolName?: string
  address?: string
  headName?: string
  headMobile?: string
  gender?: string
  educationLevel?: string
  latitude?: number
  longitude?: number
  addedBy?: string
  districtId?: mongoose.Types.ObjectId
  districtName?: string
  createdBy?: mongoose.Types.ObjectId
  notificationPath?: string
  geom?: Record<string, unknown>
}

const EecClubSchema = new Schema<EecClubDocument>(
  {
    emisCode: { type: Number },
    schoolName: { type: String },
    address: { type: String },
    headName: { type: String },
    headMobile: { type: String },
    gender: { type: String },
    educationLevel: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    addedBy: { type: String },
    districtId: { type: Schema.Types.ObjectId, ref: 'DistrictNew' },
    districtName: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notificationPath: { type: String },
    geom: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

export const EecClubModel = mongoose.model<EecClubDocument>('EecClub', EecClubSchema, 'EecClub')
