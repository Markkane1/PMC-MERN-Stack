import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

export interface InspectionReportDocument extends Document {
  numericId: number
  businessName: string
  businessType: string
  licenseNumber?: string
  violationFound?: any
  violationType?: any
  actionTaken?: any
  plasticBagsConfiscation?: number
  confiscationOtherPlastics?: any
  totalConfiscation?: number
  otherSingleUseItems?: any
  latitude?: number
  longitude?: number
  inspectionDate?: Date
  fineAmount?: number
  fineRecoveryStatus?: string
  fineRecoveryDate?: Date
  recoveryAmount?: number
  deSealedDate?: Date
  fineRecoveryBreakup?: any
  affidavitPath?: string
  districtId?: number
  createdBy?: mongoose.Types.ObjectId
  confiscationReceiptPath?: string
  paymentChallanPath?: string
  receiptBookNumber?: string
  receiptNumber?: string
}

const InspectionReportSchema = new Schema<InspectionReportDocument>(
  {
    numericId: { type: Number, unique: true, index: true },
    businessName: { type: String, required: true },
    businessType: { type: String, required: true },
    licenseNumber: { type: String },
    violationFound: { type: Schema.Types.Mixed },
    violationType: { type: Schema.Types.Mixed },
    actionTaken: { type: Schema.Types.Mixed },
    plasticBagsConfiscation: { type: Number },
    confiscationOtherPlastics: { type: Schema.Types.Mixed },
    totalConfiscation: { type: Number },
    otherSingleUseItems: { type: Schema.Types.Mixed },
    latitude: { type: Number },
    longitude: { type: Number },
    inspectionDate: { type: Date },
    fineAmount: { type: Number },
    fineRecoveryStatus: { type: String },
    fineRecoveryDate: { type: Date },
    recoveryAmount: { type: Number },
    deSealedDate: { type: Date },
    fineRecoveryBreakup: { type: Schema.Types.Mixed },
    affidavitPath: { type: String },
    districtId: { type: Number },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    confiscationReceiptPath: { type: String },
    paymentChallanPath: { type: String },
    receiptBookNumber: { type: String },
    receiptNumber: { type: String },
  },
  { timestamps: true }
)

InspectionReportSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('InspectionReport')
  }
  return next()
})

export const InspectionReportModel = mongoose.model<InspectionReportDocument>('InspectionReport', InspectionReportSchema, 'inspectionreports')
