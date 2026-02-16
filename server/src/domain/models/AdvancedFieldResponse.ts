import mongoose from 'mongoose'

/**
 * Field Type Enum
 */
export enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  TEXTAREA = 'TEXTAREA',
  RICHTEXT = 'RICHTEXT',
  FILE = 'FILE',
  MULTIFILE = 'MULTIFILE',
  NESTED = 'NESTED',
  CONDITIONAL = 'CONDITIONAL',
}

/**
 * Field Status Enum
 */
export enum FieldStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Validation Rule Type
 */
export interface IValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom' | 'email' | 'phone' | 'fileSize'
  value?: any
  message: string
}

/**
 * Field Option Interface
 */
export interface IFieldOption {
  id: string
  label: string
  value: any
  description?: string
  isDefault?: boolean
}

/**
 * Conditional Rule Interface
 */
export interface IConditionalRule {
  fieldId: string
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'in'
  value: any
  showField?: boolean
  makeRequired?: boolean
}

/**
 * Advanced Field Definition Interface
 */
export interface IAdvancedFieldDefinition {
  _id?: mongoose.Types.ObjectId
  fieldId: string
  name: string
  displayName: string
  description?: string
  type: FieldType
  section?: string
  order: number
  isRequired: boolean
  isReadOnly?: boolean
  placeholder?: string
  helpText?: string
  defaultValue?: any
  validations: IValidationRule[]
  options?: IFieldOption[] // For SELECT, MULTISELECT, RADIO
  conditionalRules?: IConditionalRule[]
  dependencies?: string[] // Other field IDs this field depends on
  metadata?: {
    minLength?: number
    maxLength?: number
    pattern?: string
    decimalPlaces?: number
    fileTypes?: string[]
    maxFileSize?: number // in MB
    multipleAllowed?: boolean
    allowedRoles?: string[]
    [key: string]: any
  }
  status: FieldStatus
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Field Response Value Interface
 */
export interface IFieldResponseValue {
  fieldId: string
  fieldName: string
  value: any
  type: FieldType
  validation: {
    isValid: boolean
    errors: string[]
  }
  displayValue?: string // Formatted value for display
}

/**
 * Advanced Field Response Interface
 */
export interface IAdvancedFieldResponse {
  _id?: mongoose.Types.ObjectId
  applicantId: number
  sectionId?: string
  sectionName?: string
  responses: IFieldResponseValue[]
  completionPercentage: number
  isComplete: boolean
  lastModifiedBy?: string
  submittedAt?: Date
  metadata?: {
    ipAddress?: string
    userAgent?: string
    completionTime?: number // in seconds
    [key: string]: any
  }
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Field Response Audit Log Interface
 */
export interface IFieldResponseAuditLog {
  _id?: mongoose.Types.ObjectId
  applicantId: number
  fieldId: string
  fieldName: string
  oldValue: any
  newValue: any
  changeReason?: string
  changedBy: string
  timestamp?: Date
}

/**
 * Field Section Interface
 */
export interface IFieldSection {
  _id?: mongoose.Types.ObjectId
  sectionId: string
  name: string
  displayName: string
  description?: string
  order: number
  fields: IAdvancedFieldDefinition[]
  status: FieldStatus
  isConditional?: boolean
  conditionalRules?: IConditionalRule[]
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Advanced Field Response Query Filter Interface
 */
export interface AdvancedFieldResponseFilter {
  applicantId?: number
  sectionId?: string
  isComplete?: boolean
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

/**
 * Field Validation Result Interface
 */
export interface IFieldValidationResult {
  isValid: boolean
  field: {
    fieldId: string
    fieldName: string
  }
  errors: string[]
  warnings?: string[]
}

/**
 * Bulk Field Update Interface
 */
export interface IBulkFieldUpdate {
  applicantId: number
  fieldId: string
  value: any
  reason?: string
}
