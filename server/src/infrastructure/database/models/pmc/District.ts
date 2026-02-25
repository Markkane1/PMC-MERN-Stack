import mongoose, { Schema, type Document } from 'mongoose'

export interface DistrictDocument extends Document {
  districtId: number
  divisionId: number
  districtName: string
  districtCode: string
  shortName?: string
  pitbDistrictId?: number
  geom?: Record<string, unknown>
}

const DistrictSchema = new Schema<DistrictDocument>(
  {
    districtId: { type: Number, required: true, unique: true, index: true },
    divisionId: { type: Number, required: true },
    districtName: { type: String, required: true },
    districtCode: { type: String, required: true },
    shortName: { type: String },
    pitbDistrictId: { type: Number },
    geom: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

export const DistrictModel = mongoose.model<DistrictDocument>('District', DistrictSchema, 'District')
