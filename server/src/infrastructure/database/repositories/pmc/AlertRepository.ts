import { AlertModel, AlertRecipientModel, AlertTemplateModel } from '../../models/pmc/Alert'
import { AlertRepository, AlertRecipientRepository, AlertTemplateRepository } from '../../../../domain/repositories/pmc'

/**
 * Alert Repository Implementation
 */
export const createAlertRepository = (): AlertRepository => ({
  async findAll() {
    return AlertModel.find().sort({ createdAt: -1 }).lean()
  },

  async findById(id: string) {
    return AlertModel.findById(id).lean()
  },

  async findByApplicantId(applicantId: number, limit = 20, offset = 0) {
    return AlertModel.find({ applicantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean()
  },

  async findUnreadByApplicantId(applicantId: number) {
    return AlertModel.find({ applicantId, isRead: false }).sort({ createdAt: -1 }).lean()
  },

  async countUnreadByApplicantId(applicantId: number) {
    return AlertModel.countDocuments({ applicantId, isRead: false })
  },

  async findByType(type: string, limit = 20) {
    return AlertModel.find({ type })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
  },

  async findByStatus(status: string, limit = 20) {
    return AlertModel.find({ status })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
  },

  async findByTypeAndApplicant(type: string, applicantId: number) {
    return AlertModel.find({ type, applicantId }).sort({ createdAt: -1 }).lean()
  },

  async create(alertData) {
    const alert = new AlertModel(alertData)
    return alert.save()
  },

  async update(id: string, updates) {
    return AlertModel.findByIdAndUpdate(id, updates, { new: true }).lean()
  },

  async updateStatus(id: string, status: string) {
    const updateData: any = { status }
    if (status === 'SENT') {
      updateData.sentAt = new Date()
    } else if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date()
    }
    return AlertModel.findByIdAndUpdate(id, updateData, { new: true }).lean()
  },

  async markAsRead(id: string) {
    return AlertModel.findByIdAndUpdate(id, { isRead: true, readAt: new Date() }, { new: true }).lean()
  },

  async markMultipleAsRead(ids: string[]) {
    const result = await AlertModel.updateMany({ _id: { $in: ids } }, { isRead: true, readAt: new Date() })
    return result.modifiedCount
  },

  async delete(id: string) {
    const result = await AlertModel.findByIdAndDelete(id)
    return result !== null
  },

  async deleteByApplicantId(applicantId: number) {
    const result = await AlertModel.deleteMany({ applicantId })
    return result.deletedCount
  },

  async listByFilter(filter, limit = 20, offset = 0) {
    return AlertModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean()
  },

  async countByFilter(filter) {
    return AlertModel.countDocuments(filter)
  },
})

/**
 * Alert Recipient Repository Implementation
 */
export const createAlertRecipientRepository = (): AlertRecipientRepository => ({
  async findByApplicantId(applicantId: number) {
    return AlertRecipientModel.findOne({ applicantId }).lean()
  },

  async findAll() {
    return AlertRecipientModel.find().lean()
  },

  async create(recipientData) {
    const recipient = new AlertRecipientModel(recipientData)
    return recipient.save()
  },

  async update(applicantId: number, updates) {
    return AlertRecipientModel.findOneAndUpdate({ applicantId }, updates, { new: true }).lean()
  },

  async updatePreferences(applicantId: number, preferences) {
    return AlertRecipientModel.findOneAndUpdate(
      { applicantId },
      { 'preferences': preferences },
      { new: true }
    ).lean()
  },

  async delete(applicantId: number) {
    const result = await AlertRecipientModel.findOneAndDelete({ applicantId })
    return result !== null
  },

  async findActiveRecipients() {
    return AlertRecipientModel.find({ isActive: true }).lean()
  },
})

/**
 * Alert Template Repository Implementation
 */
export const createAlertTemplateRepository = (): AlertTemplateRepository => ({
  async findAll() {
    return AlertTemplateModel.find().lean()
  },

  async findById(id: string) {
    return AlertTemplateModel.findById(id).lean()
  },

  async findByType(type: string) {
    return AlertTemplateModel.findOne({ type }).lean()
  },

  async create(templateData) {
    const template = new AlertTemplateModel(templateData)
    return template.save()
  },

  async update(id: string, updates) {
    return AlertTemplateModel.findByIdAndUpdate(id, updates, { new: true }).lean()
  },

  async delete(id: string) {
    const result = await AlertTemplateModel.findByIdAndDelete(id)
    return result !== null
  },

  async findActive() {
    return AlertTemplateModel.find({ isActive: true }).lean()
  },
})
