import mongoose, { Schema, type Document } from 'mongoose'
import { getNextSequence } from './Counter'

/**
 * Plastic item categories
 */
export enum PlasticCategory {
  SINGLE_USE = 'SINGLE_USE',
  MULTI_USE = 'MULTI_USE',
  MICROPLASTIC = 'MICROPLASTIC',
  POLYMER = 'POLYMER',
  COMPOSITE = 'COMPOSITE',
  WASTE = 'WASTE'
}

/**
 * Hazard levels
 */
export enum HazardLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Measurement units
 */
export enum MeasurementUnit {
  KG = 'KG',
  TON = 'TON',
  LITER = 'LITER',
  PIECE = 'PIECE',
  BAG = 'BAG',
  ROLL = 'ROLL'
}

export interface PlasticItemDocument extends Document {
  numericId: number
  code: string
  itemName?: string // Legacy field
  name: string
  category: PlasticCategory | string
  description?: string
  hsnCode?: string
  unit: MeasurementUnit | string
  density?: number
  recyclingRate?: number
  hazardousLevel: HazardLevel | string
  specifications?: Record<string, any>
  notes?: string
  tags?: string[]
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
}

const PlasticItemSchema = new Schema<PlasticItemDocument>(
  {
    numericId: {
      type: Number,
      unique: true,
      index: true,
      sparse: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    itemName: String, // Legacy
    name: {
      type: String,
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: Object.values(PlasticCategory),
      required: true,
      index: true
    },
    description: String,
    hsnCode: {
      type: String,
      index: true,
      sparse: true
    },
    unit: {
      type: String,
      enum: Object.values(MeasurementUnit),
      required: true
    },
    density: {
      type: Number,
      min: 0
    },
    recyclingRate: {
      type: Number,
      min: 0,
      max: 100
    },
    hazardousLevel: {
      type: String,
      enum: Object.values(HazardLevel),
      default: HazardLevel.LOW,
      index: true
    },
    specifications: {
      type: Schema.Types.Mixed,
      default: {}
    },
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
  { timestamps: true, collection: 'plasticitems' }
)

// Indexes
PlasticItemSchema.index({ code: 1, category: 1 })
PlasticItemSchema.index({ category: 1, isActive: 1 })
PlasticItemSchema.index({ hazardousLevel: 1, isActive: 1 })
PlasticItemSchema.index({ name: 'text', hsnCode: 'text' })

// Pre-save middleware
PlasticItemSchema.pre('save', async function preSave(next) {
  if (!this.numericId) {
    this.numericId = await getNextSequence('PlasticItem')
  }
  return next()
})

export const PlasticItemModel = mongoose.model<PlasticItemDocument>(
  'PlasticItem',
  PlasticItemSchema,
  'plasticitems'
)
