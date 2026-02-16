import {
  AdvancedFieldDefinitionModel,
  AdvancedFieldResponseModel,
  FieldResponseAuditLogModel,
  FieldSectionModel,
} from '../../models/pmc/AdvancedFieldResponse'
import type {
  AdvancedFieldDefinitionRepository,
  AdvancedFieldResponseRepository,
  FieldResponseAuditLogRepository,
  FieldSectionRepository,
} from '../../../../domain/repositories/pmc'

/**
 * Advanced Field Definition Repository Implementation
 */
export const createAdvancedFieldDefinitionRepository = (): AdvancedFieldDefinitionRepository => ({
  async findAll() {
    return AdvancedFieldDefinitionModel.find().sort({ section: 1, order: 1 }).lean()
  },

  async findById(id: string) {
    return AdvancedFieldDefinitionModel.findById(id).lean()
  },

  async findByFieldId(fieldId: string) {
    return AdvancedFieldDefinitionModel.findOne({ fieldId }).lean()
  },

  async findBySection(sectionId: string) {
    return AdvancedFieldDefinitionModel.find({ section: sectionId }).sort({ order: 1 }).lean()
  },

  async findActive() {
    return AdvancedFieldDefinitionModel.find({ status: 'ACTIVE' }).sort({ section: 1, order: 1 }).lean()
  },

  async create(fieldData: Record<string, unknown>) {
    const field = new AdvancedFieldDefinitionModel(fieldData)
    return field.save()
  },

  async update(id: string, updates: Record<string, unknown>) {
    return AdvancedFieldDefinitionModel.findByIdAndUpdate(id, updates, { new: true }).lean()
  },

  async updateStatus(id: string, status: string) {
    return AdvancedFieldDefinitionModel.findByIdAndUpdate(id, { status }, { new: true }).lean()
  },

  async delete(id: string) {
    const result = await AdvancedFieldDefinitionModel.findByIdAndDelete(id)
    return result !== null
  },

  async findWithDependencies(fieldIds: string[]) {
    return AdvancedFieldDefinitionModel.find({
      $or: [{ fieldId: { $in: fieldIds } }, { dependencies: { $in: fieldIds } }],
    }).lean()
  },

  async listByOrder(sectionId?: string) {
    const filter = sectionId ? { section: sectionId } : {}
    return AdvancedFieldDefinitionModel.find(filter).sort({ section: 1, order: 1 }).lean()
  },
})

/**
 * Advanced Field Response Repository Implementation
 */
export const createAdvancedFieldResponseRepository = (): AdvancedFieldResponseRepository => ({
  async findAll() {
    return AdvancedFieldResponseModel.find().sort({ createdAt: -1 }).lean()
  },

  async findById(id: string) {
    return AdvancedFieldResponseModel.findById(id).lean()
  },

  async findByApplicantId(applicantId: number) {
    return AdvancedFieldResponseModel.find({ applicantId }).sort({ createdAt: -1 }).lean()
  },

  async findByApplicantAndSection(applicantId: number, sectionId: string) {
    return AdvancedFieldResponseModel.findOne({ applicantId, sectionId }).lean()
  },

  async create(responseData: Record<string, unknown>) {
    const response = new AdvancedFieldResponseModel(responseData)
    return response.save()
  },

  async update(id: string, updates: Record<string, unknown>) {
    return AdvancedFieldResponseModel.findByIdAndUpdate(id, updates, { new: true }).lean()
  },

  async updateResponse(applicantId: number, sectionId: string, responses: any[]) {
    return AdvancedFieldResponseModel.findOneAndUpdate(
      { applicantId, sectionId },
      {
        responses,
        updatedAt: new Date(),
      },
      { new: true, upsert: true }
    ).lean()
  },

  async delete(id: string) {
    const result = await AdvancedFieldResponseModel.findByIdAndDelete(id)
    return result !== null
  },

  async deleteByApplicantId(applicantId: number) {
    const result = await AdvancedFieldResponseModel.deleteMany({ applicantId })
    return result.deletedCount
  },

  async findComplete(applicantId: number) {
    return AdvancedFieldResponseModel.find({ applicantId, isComplete: true }).lean()
  },

  async findIncomplete(applicantId: number) {
    return AdvancedFieldResponseModel.find({ applicantId, isComplete: false }).lean()
  },

  async countByCompletion(applicantId: number) {
    const complete = await AdvancedFieldResponseModel.countDocuments({ applicantId, isComplete: true })
    const incomplete = await AdvancedFieldResponseModel.countDocuments({ applicantId, isComplete: false })
    return { complete, incomplete }
  },

  async getCompletionStatus(applicantId: number) {
    const responses = await AdvancedFieldResponseModel.find({ applicantId }).lean()
    const total = responses.length
    const completed = responses.filter((r) => r.isComplete).length

    return {
      total,
      completed,
      pending: total - completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      responses,
    }
  },
})

/**
 * Field Response Audit Log Repository Implementation
 */
export const createFieldResponseAuditLogRepository = (): FieldResponseAuditLogRepository => ({
  async findAll() {
    return FieldResponseAuditLogModel.find().sort({ timestamp: -1 }).lean()
  },

  async findById(id: string) {
    return FieldResponseAuditLogModel.findById(id).lean()
  },

  async findByApplicantId(applicantId: number, limit = 100) {
    return FieldResponseAuditLogModel.find({ applicantId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
  },

  async findByFieldId(fieldId: string, limit = 100) {
    return FieldResponseAuditLogModel.find({ fieldId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
  },

  async findByApplicantAndField(applicantId: number, fieldId: string) {
    return FieldResponseAuditLogModel.find({ applicantId, fieldId }).sort({ timestamp: -1 }).lean()
  },

  async create(auditData: Record<string, unknown>) {
    const log = new FieldResponseAuditLogModel(auditData)
    return log.save()
  },

  async delete(id: string) {
    const result = await FieldResponseAuditLogModel.findByIdAndDelete(id)
    return result !== null
  },

  async deleteOldLogs(olderThanDays: number) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const result = await FieldResponseAuditLogModel.deleteMany({ timestamp: { $lt: cutoffDate } })
    return result.deletedCount
  },
})

/**
 * Field Section Repository Implementation
 */
export const createFieldSectionRepository = (): FieldSectionRepository => ({
  async findAll() {
    return FieldSectionModel.find().sort({ order: 1 }).populate('fields').lean()
  },

  async findById(id: string) {
    return FieldSectionModel.findById(id).populate('fields').lean()
  },

  async findBySectionId(sectionId: string) {
    return FieldSectionModel.findOne({ sectionId }).populate('fields').lean()
  },

  async findActive() {
    return FieldSectionModel.find({ status: 'ACTIVE' }).sort({ order: 1 }).populate('fields').lean()
  },

  async create(sectionData: Record<string, unknown>) {
    const section = new FieldSectionModel(sectionData)
    return section.save()
  },

  async update(id: string, updates: Record<string, unknown>) {
    return FieldSectionModel.findByIdAndUpdate(id, updates, { new: true }).populate('fields').lean()
  },

  async delete(id: string) {
    const result = await FieldSectionModel.findByIdAndDelete(id)
    return result !== null
  },

  async listByOrder() {
    return FieldSectionModel.find().sort({ order: 1 }).populate('fields').lean()
  },
})
