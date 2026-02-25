import mongoose, { Schema, type Document } from 'mongoose'

export interface PSIDTrackingDocument extends Document {
  applicantId?: number
  deptTransactionId: string
  dueDate?: Date
  expiryDate?: Date
  amountWithinDueDate?: number
  amountAfterDueDate?: number
  consumerName?: string
  mobileNo?: string
  cnic?: string
  email?: string
  districtId?: number
  amountBifurcation?: any
  consumerNumber?: string
  status?: string
  message?: string
  paymentStatus?: string
  amountPaid?: number
  paidDate?: Date
  paidTime?: string
  bankCode?: string
  createdBy?: mongoose.Types.ObjectId
}

const PSIDTrackingSchema = new Schema<PSIDTrackingDocument>(
  {
    applicantId: { type: Number },
    deptTransactionId: { type: String, required: true },
    dueDate: { type: Date },
    expiryDate: { type: Date },
    amountWithinDueDate: { type: Number },
    amountAfterDueDate: { type: Number },
    consumerName: { type: String },
    mobileNo: { type: String },
    cnic: { type: String },
    email: { type: String },
    districtId: { type: Number },
    amountBifurcation: { type: Schema.Types.Mixed },
    consumerNumber: { type: String },
    status: { type: String, default: 'Pending' },
    message: { type: String },
    paymentStatus: { type: String, default: 'UNPAID' },
    amountPaid: { type: Number },
    paidDate: { type: Date },
    paidTime: { type: String },
    bankCode: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export const PSIDTrackingModel = mongoose.model<PSIDTrackingDocument>('PSIDTracking', PSIDTrackingSchema, 'PSIDTracking')
