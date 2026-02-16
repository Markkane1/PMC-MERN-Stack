import {
  AdvancedFieldDefinitionRepository,
  AdvancedFieldResponseRepository,
  FieldResponseAuditLogRepository,
  FieldSectionRepository,
} from '../../../domain/repositories/pmc'
import {
  IAdvancedFieldDefinition,
  IAdvancedFieldResponse,
  IFieldResponseValue,
  IValidationRule,
  IConditionalRule,
  FieldType,
  IFieldValidationResult,
  IBulkFieldUpdate,
} from '../../../domain/models/AdvancedFieldResponse'

/**
 * Advanced Field Response Service
 * Handles field validation, conditional logic, and response processing
 */
export class AdvancedFieldResponseService {
  constructor(
    private fieldDefinitionRepo: AdvancedFieldDefinitionRepository,
    private fieldResponseRepo: AdvancedFieldResponseRepository,
    private auditLogRepo: FieldResponseAuditLogRepository,
    private fieldSectionRepo: FieldSectionRepository
  ) {}

  /**
   * Get field definitions for a section
   */
  async getFieldsBySection(sectionId: string) {
    return this.fieldDefinitionRepo.findBySection(sectionId)
  }

  /**
   * Get all active field definitions
   */
  async getAllActiveFields() {
    return this.fieldDefinitionRepo.findActive()
  }

  /**
   * Get field definition by field ID
   */
  async getFieldDefinition(fieldId: string) {
    return this.fieldDefinitionRepo.findByFieldId(fieldId)
  }

  /**
   * Validate a field value against its definition
   */
  async validateFieldValue(fieldId: string, value: any): Promise<IFieldValidationResult> {
    const fieldDef = await this.fieldDefinitionRepo.findByFieldId(fieldId)

    if (!fieldDef) {
      return {
        isValid: false,
        field: { fieldId, fieldName: 'Unknown' },
        errors: ['Field definition not found'],
      }
    }

    const errors: string[] = []
    const warnings: string[] = []

    // Check required
    if (fieldDef.isRequired && (value === null || value === undefined || value === '')) {
      errors.push(`${fieldDef.displayName} is required`)
    }

    // If value is empty and not required, validation passes
    if (!fieldDef.isRequired && (value === null || value === undefined || value === '')) {
      return {
        isValid: true,
        field: { fieldId, fieldName: fieldDef.name },
        errors: [],
        warnings,
      }
    }

    // Apply validation rules
    if (fieldDef.validations && fieldDef.validations.length > 0) {
      for (const rule of fieldDef.validations) {
        const ruleErrors = this.validateRule(value, rule, fieldDef)
        errors.push(...ruleErrors)
      }
    }

    // Type-specific validation
    const typeErrors = this.validateFieldType(value, fieldDef)
    errors.push(...typeErrors)

    return {
      isValid: errors.length === 0,
      field: { fieldId, fieldName: fieldDef.name },
      errors,
      warnings,
    }
  }

  /**
   * Validate a single rule
   */
  private validateRule(value: any, rule: IValidationRule, fieldDef: IAdvancedFieldDefinition): string[] {
    const errors: string[] = []

    switch (rule.type) {
      case 'required':
        if (!value) errors.push(rule.message)
        break

      case 'min':
        if (typeof value === 'number' && value < rule.value) {
          errors.push(rule.message || `Minimum value is ${rule.value}`)
        }
        if (typeof value === 'string' && value.length < rule.value) {
          errors.push(rule.message || `Minimum length is ${rule.value}`)
        }
        break

      case 'max':
        if (typeof value === 'number' && value > rule.value) {
          errors.push(rule.message || `Maximum value is ${rule.value}`)
        }
        if (typeof value === 'string' && value.length > rule.value) {
          errors.push(rule.message || `Maximum length is ${rule.value}`)
        }
        break

      case 'pattern':
        const regex = new RegExp(rule.value)
        if (!regex.test(String(value))) {
          errors.push(rule.message)
        }
        break

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(String(value))) {
          errors.push(rule.message || 'Invalid email format')
        }
        break

      case 'phone':
        const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/
        if (!phoneRegex.test(String(value).replace(/\s/g, ''))) {
          errors.push(rule.message || 'Invalid phone number format')
        }
        break

      case 'fileSize':
        // Value would be file size in bytes, rule.value in MB
        if (value && value > rule.value * 1024 * 1024) {
          errors.push(rule.message || `File size must not exceed ${rule.value}MB`)
        }
        break

      case 'custom':
        // Custom validation would be handled separately
        break
    }

    return errors
  }

  /**
   * Validate field type
   */
  private validateFieldType(value: any, fieldDef: IAdvancedFieldDefinition): string[] {
    const errors: string[] = []

    switch (fieldDef.type) {
      case FieldType.NUMBER:
        if (value !== null && value !== undefined && isNaN(Number(value))) {
          errors.push(`${fieldDef.displayName} must be a number`)
        }
        break

      case FieldType.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (value && !emailRegex.test(String(value))) {
          errors.push(`${fieldDef.displayName} must be a valid email`)
        }
        break

      case FieldType.PHONE:
        const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/
        if (value && !phoneRegex.test(String(value).replace(/\s/g, ''))) {
          errors.push(`${fieldDef.displayName} must be a valid phone number`)
        }
        break

      case FieldType.DATE:
        const dateValue = new Date(value)
        if (isNaN(dateValue.getTime())) {
          errors.push(`${fieldDef.displayName} must be a valid date`)
        }
        break

      case FieldType.SELECT:
      case FieldType.RADIO:
        if (fieldDef.options) {
          const validValues = fieldDef.options.map((o) => o.value)
          if (!validValues.includes(value)) {
            errors.push(`${fieldDef.displayName} has an invalid selection`)
          }
        }
        break

      case FieldType.MULTISELECT:
        if (Array.isArray(value) && fieldDef.options) {
          const validValues = fieldDef.options.map((o) => o.value)
          const invalidValues = value.filter((v) => !validValues.includes(v))
          if (invalidValues.length > 0) {
            errors.push(`${fieldDef.displayName} contains invalid selections`)
          }
        }
        break
    }

    return errors
  }

  /**
   * Evaluate conditional rules
   */
  async evaluateConditions(applicantId: number, sectionId: string, responses: IFieldResponseValue[]) {
    const fields = await this.fieldDefinitionRepo.findBySection(sectionId)
    const responseMap = new Map(responses.map((r) => [r.fieldId, r.value]))

    const conditionalFields: Array<{ fieldId: string; showField: boolean; makeRequired: boolean }> = []

    for (const field of fields) {
      if (field.conditionalRules && field.conditionalRules.length > 0) {
        let show = true
        let makeRequired = false

        for (const rule of field.conditionalRules) {
          const dependentValue = responseMap.get(rule.fieldId)
          const conditionMet = this.evaluateCondition(dependentValue, rule)

          if (!conditionMet) {
            show = false
            break
          }

          if (rule.makeRequired) {
            makeRequired = true
          }
        }

        conditionalFields.push({
          fieldId: field.fieldId,
          showField: show,
          makeRequired,
        })
      }
    }

    return conditionalFields
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(value: any, rule: IConditionalRule): boolean {
    switch (rule.operator) {
      case 'equals':
        return value === rule.value
      case 'notEquals':
        return value !== rule.value
      case 'greaterThan':
        return Number(value) > Number(rule.value)
      case 'lessThan':
        return Number(value) < Number(rule.value)
      case 'contains':
        return String(value).includes(String(rule.value))
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value)
      default:
        return true
    }
  }

  /**
   * Save field responses
   */
  async saveFieldResponses(
    applicantId: number,
    sectionId: string,
    responses: Array<{ fieldId: string; value: any }>,
    changedBy: string
  ) {
    const fields = new Map<any, any>()
    for (const field of await this.fieldDefinitionRepo.findBySection(sectionId)) {
      fields.set(field.fieldId, field)
    }

    const validatedResponses: IFieldResponseValue[] = []
    const errors: Array<{ fieldId: string; errors: string[] }> = []

    for (const response of responses) {
      const field = fields.get(response.fieldId)
      if (!field) continue

      const validation = await this.validateFieldValue(response.fieldId, response.value)

      if (!validation.isValid) {
        errors.push({ fieldId: response.fieldId, errors: validation.errors })
      }

      validatedResponses.push({
        fieldId: response.fieldId,
        fieldName: field.name,
        value: response.value,
        type: field.type,
        validation: {
          isValid: validation.isValid,
          errors: validation.errors,
        },
        displayValue: this.formatDisplayValue(response.value, field),
      })

      // Log changes
      const existingResponse = await this.fieldResponseRepo.findByApplicantAndSection(applicantId, sectionId)
      if (existingResponse) {
        const oldValue = existingResponse.responses.find((r: any) => r.fieldId === response.fieldId)?.value
        if (oldValue !== response.value) {
          await this.auditLogRepo.create({
            applicantId,
            fieldId: response.fieldId,
            fieldName: field.name,
            oldValue,
            newValue: response.value,
            changedBy,
            timestamp: new Date(),
          })
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${JSON.stringify(errors)}`)
    }

    const completionPercentage = Math.round((validatedResponses.filter((r) => r.validation.isValid).length / validatedResponses.length) * 100)

    return this.fieldResponseRepo.updateResponse(applicantId, sectionId, validatedResponses)
  }

  /**
   * Format display value based on field type
   */
  private formatDisplayValue(value: any, field: IAdvancedFieldDefinition): string {
    if (value === null || value === undefined) return ''

    switch (field.type) {
      case FieldType.DATE:
        return new Date(value).toLocaleDateString()
      case FieldType.DATETIME:
        return new Date(value).toLocaleString()
      case FieldType.NUMBER:
        if (field.metadata?.decimalPlaces !== undefined) {
          return Number(value).toFixed(field.metadata.decimalPlaces)
        }
        return String(value)
      case FieldType.SELECT:
      case FieldType.RADIO:
        const option = field.options?.find((o) => o.value === value)
        return option?.label || String(value)
      case FieldType.MULTISELECT:
        if (Array.isArray(value)) {
          return value.map((v) => field.options?.find((o) => o.value === v)?.label || v).join(', ')
        }
        return String(value)
      default:
        return String(value)
    }
  }

  /**
   * Get applicant field responses
   */
  async getApplicantResponses(applicantId: number) {
    return this.fieldResponseRepo.findByApplicantId(applicantId)
  }

  /**
   * Get completion status
   */
  async getCompletionStatus(applicantId: number) {
    return this.fieldResponseRepo.getCompletionStatus(applicantId)
  }

  /**
   * Get audit log for field
   */
  async getFieldAuditLog(applicantId: number, fieldId: string) {
    return this.auditLogRepo.findByApplicantAndField(applicantId, fieldId)
  }

  /**
   * Bulk field update
   */
  async bulkUpdateFields(updates: IBulkFieldUpdate[], changedBy: string) {
    const results: Array<{ success: boolean; update: IBulkFieldUpdate; error?: string }> = []

    for (const update of updates) {
      try {
        const field = await this.fieldDefinitionRepo.findByFieldId(update.fieldId)
        if (!field) {
          results.push({
            success: false,
            update,
            error: 'Field not found',
          })
          continue
        }

        // Log the change
        await this.auditLogRepo.create({
          applicantId: update.applicantId,
          fieldId: update.fieldId,
          fieldName: field.name,
          oldValue: null,
          newValue: update.value,
          changeReason: update.reason,
          changedBy,
          timestamp: new Date(),
        })

        results.push({ success: true, update })
      } catch (error) {
        results.push({
          success: false,
          update,
          error: (error as Error).message,
        })
      }
    }

    return results
  }

  /**
   * Create or update field definition
   */
  async upsertFieldDefinition(fieldId: string, fieldData: Partial<IAdvancedFieldDefinition>, createdBy: string) {
    const existing = await this.fieldDefinitionRepo.findByFieldId(fieldId)

    if (existing) {
      return this.fieldDefinitionRepo.update(existing._id.toString(), {
        ...fieldData,
        updatedAt: new Date(),
      })
    }

    return this.fieldDefinitionRepo.create({
      fieldId,
      ...fieldData,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * Delete field definition
   */
  async deleteFieldDefinition(fieldId: string) {
    const field = await this.fieldDefinitionRepo.findByFieldId(fieldId)
    if (!field) {
      throw new Error('Field definition not found')
    }

    // Check if field has responses
    const responses = await this.fieldResponseRepo.findAll()
    const hasResponses = responses.some((r) => r.responses?.some((rv: any) => rv.fieldId === fieldId))

    if (hasResponses) {
      // Just mark as inactive instead of deleting
      return this.fieldDefinitionRepo.updateStatus(field._id.toString(), 'INACTIVE')
    }

    return this.fieldDefinitionRepo.delete(field._id.toString())
  }

  /**
   * Get all sections
   */
  async getAllSections() {
    return this.fieldSectionRepo.findActive()
  }

  /**
   * Get section details with fields
   */
  async getSectionWithFields(sectionId: string) {
    return this.fieldSectionRepo.findBySectionId(sectionId)
  }
}
