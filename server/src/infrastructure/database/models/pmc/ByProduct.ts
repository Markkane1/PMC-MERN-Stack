import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'
import { HazardLevel } from './PlasticItem'

export interface ByProductDocument extends Document {
  numericId: number
  businessId: number | string
  businessIdString?: string
  code?: string
  name: string
  productName?: string // Legacy
  description?: string
  category?: string
  quantity?: number
  unit?: string
  disposalMethod?: string
  disposalCost?: number
  environmentalImpact?: string
  harmfulSubstances?: string[]
  hazardLevel?: HazardLevel | string
  recommendations?: string
  notes?: string
  tags?: string[]
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}

const ByProductSchema = new Schema<ByProductDocument>(
  {
    numericId: {
      type: Number,
      unique: true,
      index: true,
      sparse: true
    },
    businessId: {
      type: Schema.Types.Mixed,
      required: true,
      index: true
    },
    businessIdString: {
      type: String,
      index: true,
      sparse: true
    },
    code: {
      type: String,
      index: true,
      sparse: true
    },
    name: {
      type: String,
      required: true,
      index: true
    },
    productName: String, // Legacy
    description: String,
    category: String,
    quantity: {
      type: Number,
      min: 0
    },
    unit: String,
    disposalMethod: {
      type: String,
      enum: ['LANDFILL', 'INCINERATION', 'RECYCLING', 'COMPOSTING', 'TREATMENT', 'OTHER'],
      sparse: true
    },
    disposalCost: {
      type: Number,
      min: 0
    },
    environmentalImpact: String,
    harmfulSubstances: [String],
    hazardLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
      index: true
    },
    recommendations: String,
    notes: String,
    tags: [String],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true
    }
  },
  { timestamps: true, collection: 'ByProduct' }
)

// Indexes
ByProductSchema.index({ businessId: 1, category: 1 })
ByProductSchema.index({ businessId: 1, isActive: 1 })
ByProductSchema.index({ hazardLevel: 1, disposalMethod: 1 })
ByProductSchema.index({ name: 'text', category: 'text' })

// Pre-save middleware
ByProductSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('ByProduct')
  }
  return next()
})

export const ByProductModel = mongoose.model<ByProductDocument>(
  'ByProduct',
  ByProductSchema,
  'ByProduct'
)
