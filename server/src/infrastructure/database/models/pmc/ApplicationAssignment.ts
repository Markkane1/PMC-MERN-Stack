import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

export interface ApplicationAssignmentDocument extends Document {
  numericId: number
  applicantId: number
  assignedGroup?: string
  remarks?: string
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}

const ApplicationAssignmentSchema = new Schema<ApplicationAssignmentDocument>(
  {
    numericId: { type: Number, unique: true, index: true },
    applicantId: { type: Number, required: true, index: true },
    assignedGroup: { type: String },
    remarks: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

ApplicationAssignmentSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('ApplicationAssignment')
  }
  return next()
})

export const ApplicationAssignmentModel = mongoose.model<ApplicationAssignmentDocument>('ApplicationAssignment', ApplicationAssignmentSchema, 'applicationassignments')
