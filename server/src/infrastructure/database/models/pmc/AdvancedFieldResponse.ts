import mongoose from 'mongoose'
import { FieldType, FieldStatus } from '../../../../domain/models/AdvancedFieldResponse'

/**
 * Validation Rule Schema
 */
const validationRuleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['required', 'min', 'max', 'pattern', 'custom', 'email', 'phone', 'fileSize'],
    required: true,
  },
  value: mongoose.Schema.Types.Mixed,
  message: String,
})

/**
 * Field Option Schema
 */
const fieldOptionSchema = new mongoose.Schema({
  id: String,
  label: String,
  value: mongoose.Schema.Types.Mixed,
  description: String,
  isDefault: Boolean,
})

/**
 * Conditional Rule Schema
 */
const conditionalRuleSchema = new mongoose.Schema({
  fieldId: String,
  operator: {
    type: String,
    enum: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'contains', 'in'],
  },
  value: mongoose.Schema.Types.Mixed,
  showField: Boolean,
  makeRequired: Boolean,
})

/**
 * Advanced Field Definition Schema
 */
const advancedFieldDefinitionSchema = new mongoose.Schema(
  {
    fieldId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: Object.values(FieldType),
      required: true,
    },
    section: {
      type: String,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    isReadOnly: {
      type: Boolean,
      default: false,
    },
    placeholder: String,
    helpText: String,
    defaultValue: mongoose.Schema.Types.Mixed,
    validations: [validationRuleSchema],
    options: [fieldOptionSchema],
    conditionalRules: [conditionalRuleSchema],
    dependencies: [String],
    metadata: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: Object.values(FieldStatus),
      default: FieldStatus.ACTIVE,
      index: true,
    },
    createdBy: String,
  },
  {
    timestamps: true,
    indexes: [{ fieldId: 1, status: 1 }, { section: 1, order: 1 }],
  }
)

/**
 * Field Response Value Schema
 */
const fieldResponseValueSchema = new mongoose.Schema({
  fieldId: String,
  fieldName: String,
  value: mongoose.Schema.Types.Mixed,
  type: String,
  validation: {
    isValid: Boolean,
    errors: [String],
  },
  displayValue: String,
})

/**
 * Advanced Field Response Schema
 */
const advancedFieldResponseSchema = new mongoose.Schema(
  {
    applicantId: {
      type: Number,
      required: true,
      index: true,
    },
    sectionId: {
      type: String,
      index: true,
    },
    sectionName: String,
    responses: [fieldResponseValueSchema],
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isComplete: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastModifiedBy: String,
    submittedAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    indexes: [
      { applicantId: 1, sectionId: 1 },
      { applicantId: 1, isComplete: 1 },
      { applicantId: 1, createdAt: -1 },
    ],
  }
)

/**
 * Field Response Audit Log Schema
 */
const fieldResponseAuditLogSchema = new mongoose.Schema(
  {
    applicantId: {
      type: Number,
      required: true,
      index: true,
    },
    fieldId: {
      type: String,
      required: true,
      index: true,
    },
    fieldName: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changeReason: String,
    changedBy: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
)

fieldResponseAuditLogSchema.index({ applicantId: 1, fieldId: 1, timestamp: -1 })

/**
 * Field Section Schema
 */
const fieldSectionSchema = new mongoose.Schema(
  {
    sectionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    description: String,
    order: {
      type: Number,
      default: 0,
    },
    fields: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AdvancedFieldDefinition' }],
    status: {
      type: String,
      enum: Object.values(FieldStatus),
      default: FieldStatus.ACTIVE,
      index: true,
    },
    isConditional: Boolean,
    conditionalRules: [conditionalRuleSchema],
  },
  {
    timestamps: true,
    indexes: [{ sectionId: 1, status: 1 }, { order: 1 }],
  }
)

export const AdvancedFieldDefinitionModel = mongoose.model('AdvancedFieldDefinition', advancedFieldDefinitionSchema)
export const AdvancedFieldResponseModel = mongoose.model('AdvancedFieldResponse', advancedFieldResponseSchema)
export const FieldResponseAuditLogModel = mongoose.model('FieldResponseAuditLog', fieldResponseAuditLogSchema)
export const FieldSectionModel = mongoose.model('FieldSection', fieldSectionSchema)
