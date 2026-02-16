import { Competition, CompetitionRegistration, CourierLabel, ICompetition, ICompetitionRegistration, ICourierLabel } from '../../../../domain/models/Competition'
import mongoose from 'mongoose'

/**
 * Competition Repository Interface
 */
export interface CompetitionRepository {
  findAll(): Promise<ICompetition[]>
  findById(id: string): Promise<ICompetition | null>
  findActive(): Promise<ICompetition[]>
  create(data: Omit<ICompetition, '_id'>): Promise<ICompetition>
  update(id: string, data: Partial<ICompetition>): Promise<ICompetition | null>
  updateStatus(id: string, status: string): Promise<ICompetition | null>
  delete(id: string): Promise<boolean>
  incrementEnrolledCount(id: string): Promise<void>
}

/**
 * Competition Registration Repository Interface
 */
export interface CompetitionRegistrationRepository {
  findAll(): Promise<ICompetitionRegistration[]>
  findByCompetition(competitionId: string | mongoose.Types.ObjectId): Promise<ICompetitionRegistration[]>
  findByApplicant(applicantId: number): Promise<ICompetitionRegistration[]>
  findById(id: string): Promise<ICompetitionRegistration | null>
  findByRegistrationId(registrationId: string): Promise<ICompetitionRegistration | null>
  findByCompetitionAndApplicant(competitionId: string, applicantId: number): Promise<ICompetitionRegistration | null>
  create(data: Omit<ICompetitionRegistration, '_id'>): Promise<ICompetitionRegistration>
  update(id: string, data: Partial<ICompetitionRegistration>): Promise<ICompetitionRegistration | null>
  updateStatus(id: string, status: string): Promise<ICompetitionRegistration | null>
  delete(id: string): Promise<boolean>
  scoreSubmission(id: string, score: number, scoredBy: string): Promise<ICompetitionRegistration | null>
}

/**
 * Courier Label Repository Interface
 */
export interface CourierLabelRepository {
  findAll(): Promise<ICourierLabel[]>
  findByRegistration(registrationId: string): Promise<ICourierLabel | null>
  findByTrackingNumber(trackingNumber: string): Promise<ICourierLabel | null>
  create(data: Omit<ICourierLabel, '_id'>): Promise<ICourierLabel>
  update(id: string, data: Partial<ICourierLabel>): Promise<ICourierLabel | null>
  updateStatus(id: string, status: string): Promise<ICourierLabel | null>
}

/**
 * Competition Repository Implementation
 */
export const createCompetitionRepository = (): CompetitionRepository => ({
  async findAll() {
    return Competition.find().sort({ startDate: -1 })
  },
  async findById(id) {
    return Competition.findById(id)
  },
  async findActive() {
    return Competition.find({
      status: 'OPEN',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).sort({ endDate: 1 })
  },
  async create(data) {
    return await new Competition(data).save()
  },
  async update(id, data) {
    return Competition.findByIdAndUpdate(id, data, { new: true })
  },
  async updateStatus(id, status) {
    return Competition.findByIdAndUpdate(id, { status }, { new: true })
  },
  async delete(id) {
    const result = await Competition.findByIdAndDelete(id)
    return !!result
  },
  async incrementEnrolledCount(id) {
    await Competition.findByIdAndUpdate(id, { $inc: { enrolledCount: 1 } })
  },
})

/**
 * Competition Registration Repository Implementation
 */
export const createCompetitionRegistrationRepository = (): CompetitionRegistrationRepository => ({
  async findAll() {
    return CompetitionRegistration.find().sort({ registeredAt: -1 })
  },
  async findByCompetition(competitionId) {
    return CompetitionRegistration.find({ competitionId }).sort({ registeredAt: -1 })
  },
  async findByApplicant(applicantId) {
    return CompetitionRegistration.find({ applicantId })
  },
  async findById(id) {
    return CompetitionRegistration.findById(id)
  },
  async findByRegistrationId(registrationId) {
    return CompetitionRegistration.findOne({ registrationId })
  },
  async findByCompetitionAndApplicant(competitionId, applicantId) {
    return CompetitionRegistration.findOne({ competitionId, applicantId })
  },
  async create(data) {
    return await new CompetitionRegistration(data).save()
  },
  async update(id, data) {
    return CompetitionRegistration.findByIdAndUpdate(id, data, { new: true })
  },
  async updateStatus(id, status) {
    return CompetitionRegistration.findByIdAndUpdate(id, { status }, { new: true })
  },
  async delete(id) {
    const result = await CompetitionRegistration.findByIdAndDelete(id)
    return !!result
  },
  async scoreSubmission(id, score, scoredBy) {
    return CompetitionRegistration.findByIdAndUpdate(
      id,
      {
        score,
        scoredBy,
        scoredAt: new Date(),
        status: 'JUDGING',
      },
      { new: true }
    )
  },
})

/**
 * Courier Label Repository Implementation
 */
export const createCourierLabelRepository = (): CourierLabelRepository => ({
  async findAll() {
    return CourierLabel.find({})
  },
  async findByRegistration(registrationId) {
    return CourierLabel.findOne({ registrationId })
  },
  async findByTrackingNumber(trackingNumber) {
    return CourierLabel.findOne({ trackingNumber })
  },
  async create(data) {
    return await new CourierLabel(data).save()
  },
  async update(id, data) {
    return CourierLabel.findByIdAndUpdate(id, data, { new: true })
  },
  async updateStatus(id, status) {
    return CourierLabel.findByIdAndUpdate(id, { status }, { new: true })
  },
})
