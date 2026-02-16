import mongoose from 'mongoose'

/**
 * Competition Model
 */
export interface ICompetition {
  _id?: mongoose.Types.ObjectId
  title: string
  description: string
  startDate: Date
  endDate: Date
  maxParticipants: number
  enrolledCount: number
  category: string
  rules: string
  prizePool: number
  prizes: Array<{ rank: string; amount: number }>
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'JUDGING' | 'COMPLETED'
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Competition Registration Model
 */
export interface ICompetitionRegistration {
  _id?: mongoose.Types.ObjectId
  competitionId: mongoose.Types.ObjectId
  applicantId: number
  participantName: string
  email: string
  phone: string
  submissionTitle: string
  submissionDescription: string
  submissionFiles: Array<{
    fileName: string
    fileUrl: string
    fileType: string
    uploadedAt: Date
  }>
  score?: number
  rank?: number
  scoredBy?: string
  scoredAt?: Date
  status: 'REGISTERED' | 'SUBMITTED' | 'JUDGING' | 'WINNER' | 'DISQUALIFIED'
  disqualificationReason?: string
  registeredAt: Date
  submittedAt?: Date
  updatedAt?: Date
}

/**
 * Courier Label Model
 */
export interface ICourierLabel {
  _id?: mongoose.Types.ObjectId
  registrationId: mongoose.Types.ObjectId
  competitionId: mongoose.Types.ObjectId
  applicantId: number
  trackingNumber: string
  courierCompany: string
  shippingAddress: {
    recipientName: string
    street: string
    city: string
    province: string
    postalCode: string
    phone: string
  }
  labelUrl: string
  status: 'GENERATED' | 'PRINTED' | 'PICKED_UP' | 'DELIVERED'
  generatedAt: Date
  updatedAt?: Date
}

const competitionSchema = new mongoose.Schema<ICompetition>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    maxParticipants: { type: Number, required: true, default: 100 },
    enrolledCount: { type: Number, default: 0 },
    category: { type: String, required: true },
    rules: { type: String },
    prizePool: { type: Number, default: 0 },
    prizes: [
      {
        rank: String,
        amount: Number,
      },
    ],
    status: {
      type: String,
      enum: ['DRAFT', 'OPEN', 'CLOSED', 'JUDGING', 'COMPLETED'],
      default: 'DRAFT',
    },
    createdBy: String,
  },
  { timestamps: true }
)

const registrationSchema = new mongoose.Schema<ICompetitionRegistration>(
  {
    competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', required: true },
    applicantId: { type: Number, required: true },
    participantName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    submissionTitle: { type: String, required: true },
    submissionDescription: String,
    submissionFiles: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    score: Number,
    rank: Number,
    scoredBy: String,
    scoredAt: Date,
    status: {
      type: String,
      enum: ['REGISTERED', 'SUBMITTED', 'JUDGING', 'WINNER', 'DISQUALIFIED'],
      default: 'REGISTERED',
    },
    disqualificationReason: String,
    registeredAt: { type: Date, default: Date.now },
    submittedAt: Date,
  },
  { timestamps: true }
)

const courierLabelSchema = new mongoose.Schema<ICourierLabel>(
  {
    registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompetitionRegistration', required: true },
    competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', required: true },
    applicantId: { type: Number, required: true },
    trackingNumber: { type: String, unique: true, required: true },
    courierCompany: { type: String, required: true },
    shippingAddress: {
      recipientName: String,
      street: String,
      city: String,
      province: String,
      postalCode: String,
      phone: String,
    },
    labelUrl: String,
    status: {
      type: String,
      enum: ['GENERATED', 'PRINTED', 'PICKED_UP', 'DELIVERED'],
      default: 'GENERATED',
    },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

// Indexes
competitionSchema.index({ status: 1, endDate: 1 })
registrationSchema.index({ competitionId: 1, applicantId: 1 })
registrationSchema.index({ applicantId: 1 })
courierLabelSchema.index({ trackingNumber: 1 })

export const Competition = mongoose.model<ICompetition>('Competition', competitionSchema)
export const CompetitionRegistration = mongoose.model<ICompetitionRegistration>(
  'CompetitionRegistration',
  registrationSchema
)
export const CourierLabel = mongoose.model<ICourierLabel>('CourierLabel', courierLabelSchema)
