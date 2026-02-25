import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import {
  advancedFieldDefinitionRepositoryMongo,
  advancedFieldResponseRepositoryMongo,
  fieldResponseAuditLogRepositoryMongo,
  fieldSectionRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'
import { AdvancedFieldResponseService } from '../../services/pmc/AdvancedFieldResponseService'

type AuthRequest = Request & { user?: any }

// Initialize service
const fieldResponseService = new AdvancedFieldResponseService(
  advancedFieldDefinitionRepositoryMongo,
  advancedFieldResponseRepositoryMongo,
  fieldResponseAuditLogRepositoryMongo,
  fieldSectionRepositoryMongo
)

/**
 * Get all field definitions
 * GET /api/pmc/fields/definitions
 */
export const getFieldDefinitions = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const sectionId = req.query.section as string
    let fields

    if (sectionId) {
      fields = await fieldResponseService.getFieldsBySection(sectionId)
    } else {
      fields = await fieldResponseService.getAllActiveFields()
    }

    res.json({
      success: true,
      data: fields,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Get field definition by ID
 * GET /api/pmc/fields/definitions/:fieldId
 */
export const getFieldDefinition = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { fieldId } = req.params
    const field = await fieldResponseService.getFieldDefinition(fieldId)

    if (!field) {
      return res.status(404).json({ success: false, message: 'Field definition not found' })
    }

    res.json({
      success: true,
      data: field,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Validate field value
 * POST /api/pmc/fields/validate
 */
export const validateFieldValue = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { fieldId, value } = req.body

    if (!fieldId) {
      return res.status(400).json({ success: false, message: 'Field ID is required' })
    }

    const validation = await fieldResponseService.validateFieldValue(fieldId, value)

    res.json({
      success: validation.isValid,
      data: validation,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Save field responses
 * POST /api/pmc/fields/responses
 */
export const saveFieldResponses = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = req.user?.applicantId
    if (!applicantId) {
      return res.status(400).json({ success: false, message: 'Applicant ID not found' })
    }

    const { sectionId, responses } = req.body

    if (!sectionId || !Array.isArray(responses)) {
      return res.status(400).json({ success: false, message: 'sectionId and responses array are required' })
    }

    const saved = await fieldResponseService.saveFieldResponses(
      applicantId,
      sectionId,
      responses,
      req.user?.username || 'unknown'
    )

    res.json({
      success: true,
      message: 'Field responses saved successfully',
      data: saved,
    })
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Get applicant field responses
 * GET /api/pmc/fields/responses
 */
export const getApplicantResponses = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = req.user?.applicantId
    if (!applicantId) {
      return res.status(400).json({ success: false, message: 'Applicant ID not found' })
    }

    const responses = await fieldResponseService.getApplicantResponses(applicantId)

    res.json({
      success: true,
      data: responses,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Get completion status
 * GET /api/pmc/fields/completion-status
 */
export const getCompletionStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = req.user?.applicantId
    if (!applicantId) {
      return res.status(400).json({ success: false, message: 'Applicant ID not found' })
    }

    const status = await fieldResponseService.getCompletionStatus(applicantId)

    res.json({
      success: true,
      data: status,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Evaluate conditional fields
 * POST /api/pmc/fields/evaluate-conditions
 */
export const evaluateConditions = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = req.user?.applicantId
    if (!applicantId) {
      return res.status(400).json({ success: false, message: 'Applicant ID not found' })
    }

    const { sectionId, responses } = req.body

    if (!sectionId || !Array.isArray(responses)) {
      return res.status(400).json({ success: false, message: 'sectionId and responses array are required' })
    }

    const conditions = await fieldResponseService.evaluateConditions(applicantId, sectionId, responses)

    res.json({
      success: true,
      data: conditions,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Get field audit log
 * GET /api/pmc/fields/audit-log/:fieldId
 */
export const getFieldAuditLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const applicantId = req.user?.applicantId
    if (!applicantId) {
      return res.status(400).json({ success: false, message: 'Applicant ID not found' })
    }

    const { fieldId } = req.params
    const auditLog = await fieldResponseService.getFieldAuditLog(applicantId, fieldId)

    res.json({
      success: true,
      data: auditLog,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Get all sections
 * GET /api/pmc/fields/sections
 */
export const getAllSections = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const sections = await fieldResponseService.getAllSections()

    res.json({
      success: true,
      data: sections,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Get section with fields
 * GET /api/pmc/fields/sections/:sectionId
 */
export const getSectionWithFields = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { sectionId } = req.params
    const section = await fieldResponseService.getSectionWithFields(sectionId)

    if (!section) {
      return res.status(404).json({ success: false, message: 'Section not found' })
    }

    res.json({
      success: true,
      data: section,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Admin: Create field definition
 * POST /api/pmc/admin/fields/definitions
 */
export const adminCreateFieldDefinition = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const hasPermission = req.user?.permissions?.includes('pmc.manage_fields')
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' })
    }

    const { fieldId, name, displayName, type, section, order, isRequired, validations, options, conditionalRules, metadata } = req.body

    if (!fieldId || !name || !displayName || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    const field = await fieldResponseService.upsertFieldDefinition(
      fieldId,
      {
        name,
        displayName,
        type,
        section,
        order: order || 0,
        isRequired: isRequired || false,
        validations: validations || [],
        options: options || [],
        conditionalRules: conditionalRules || [],
        metadata: metadata || {},
      },
      req.user?.username || 'system'
    )

    res.json({
      success: true,
      message: 'Field definition created successfully',
      data: field,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Admin: Update field definition
 * PUT /api/pmc/admin/fields/definitions/:fieldId
 */
export const adminUpdateFieldDefinition = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const hasPermission = req.user?.permissions?.includes('pmc.manage_fields')
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' })
    }

    const { fieldId } = req.params
    const field = await fieldResponseService.upsertFieldDefinition(fieldId, req.body, req.user?.username || 'system')

    if (!field) {
      return res.status(404).json({ success: false, message: 'Field definition not found' })
    }

    res.json({
      success: true,
      message: 'Field definition updated successfully',
      data: field,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Admin: Delete field definition
 * DELETE /api/pmc/admin/fields/definitions/:fieldId
 */
export const adminDeleteFieldDefinition = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const hasPermission = req.user?.permissions?.includes('pmc.manage_fields')
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' })
    }

    const { fieldId } = req.params
    const result = await fieldResponseService.deleteFieldDefinition(fieldId)

    res.json({
      success: true,
      message: 'Field definition deleted successfully',
      data: result,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})

/**
 * Admin: Bulk field update
 * POST /api/pmc/admin/fields/bulk-update
 */
export const adminBulkUpdateFields = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const hasPermission = req.user?.permissions?.includes('pmc.manage_fields')
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' })
    }

    const { updates } = req.body

    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: 'Updates array is required' })
    }

    const results = await fieldResponseService.bulkUpdateFields(updates, req.user?.username || 'system')

    res.json({
      success: true,
      message: 'Bulk update completed',
      data: results,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message })
  }
})
