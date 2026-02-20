import mongoose, { Schema, type Document } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

export interface CompetitionRegistrationDocument extends Document {
  fullName: string
  institute: string
  grade: string
  category: string
  competitionType: string
  mobile: string
  studentCardFrontPath?: string
  studentCardBackPath?: string
  photoObjectPath?: string
  registrationId: string
}

const CompetitionRegistrationSchema = new Schema<CompetitionRegistrationDocument>(
  {
    fullName: { type: String, required: true },
    institute: { type: String, required: true },
    grade: { type: String, required: true },
    category: { type: String, required: true },
    competitionType: { type: String, required: true },
    mobile: { type: String, required: true },
    studentCardFrontPath: { type: String },
    studentCardBackPath: { type: String },
    photoObjectPath: { type: String },
    registrationId: { type: String, unique: true },
  },
  { timestamps: true }
)

CompetitionRegistrationSchema.pre('save', function preSave(next) {
  if (!this.registrationId) {
    this.registrationId = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase()
  }
  next()
})

export const CompetitionRegistrationModel =
  (mongoose.models.CompetitionRegistration as mongoose.Model<CompetitionRegistrationDocument>) ||
  mongoose.model<CompetitionRegistrationDocument>(
    'CompetitionRegistration',
    CompetitionRegistrationSchema,
    'competitionregistrations'
  )
