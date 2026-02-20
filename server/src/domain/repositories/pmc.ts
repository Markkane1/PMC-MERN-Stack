import type { ApplicantDetail } from '../entities/pmc'
import type {
  ApplicationAssignment,
  ApplicantDocument,
  ApplicantFieldResponse,
  ApplicantManualFields,
  ApplicantFee,
  PSIDTracking,
  Producer,
  Consumer,
  Collector,
  Recycler,
  ApplicationSubmitted,
} from '../entities/pmcExtras'

export interface ApplicantRepository {
  findByNumericId(numericId: number): Promise<ApplicantDetail | null>
  findById(id: string): Promise<ApplicantDetail | null>
  findByTrackingNumber(trackingNumber: string): Promise<ApplicantDetail | null>
  findOne(filter: Record<string, unknown>): Promise<ApplicantDetail | null>
  findOneWithCreator(filter: Record<string, unknown>): Promise<any | null>
  list(filter?: Record<string, unknown>): Promise<ApplicantDetail[]>
  listPaginated(
    filter?: Record<string, unknown>,
    page?: number,
    pageSize?: number,
    sort?: Record<string, 1 | -1>,
    projection?: Record<string, 0 | 1>
  ): Promise<{ data: ApplicantDetail[]; pagination: any }>
  create(applicant: Partial<ApplicantDetail>): Promise<ApplicantDetail>
  updateByNumericId(numericId: number, updates: Partial<ApplicantDetail>): Promise<ApplicantDetail | null>
  updateOne(filter: Record<string, unknown>, updates: Record<string, unknown>): Promise<void>
  deleteByNumericId(numericId: number): Promise<void>
  count(filter?: Record<string, unknown>): Promise<number>
  aggregate(pipeline: any[]): Promise<any[]>
  getStatsByStatus(): Promise<any[]>
  getStatsByDistrict(): Promise<any[]>
  getDashboardMetrics(filter?: Record<string, unknown>): Promise<any>
}

export interface BusinessProfileRepository {
  findByApplicantId(applicantId: number): Promise<any | null>
  listByApplicantIds(applicantIds: number[]): Promise<any[]>
  listByDistrictId(districtId: number): Promise<any[]>
  list(filter?: Record<string, unknown>): Promise<any[]>
  searchByBusinessName(regex: RegExp, limit: number): Promise<any[]>
}

export interface DistrictRepository {
  list(filter?: Record<string, unknown>, sort?: Record<string, 1 | -1>): Promise<any[]>
  listPaginated(
    filter?: Record<string, unknown>,
    page?: number,
    pageSize?: number,
    sort?: Record<string, 1 | -1>
  ): Promise<{ data: any[]; pagination: any }>
  findByDistrictId(districtId: number): Promise<any | null>
  findByShortName(shortName: string): Promise<any | null>
}

export interface TehsilRepository {
  list(filter?: Record<string, unknown>, sort?: Record<string, 1 | -1>): Promise<any[]>
  listPaginated(
    filter?: Record<string, unknown>,
    page?: number,
    pageSize?: number,
    sort?: Record<string, 1 | -1>
  ): Promise<{ data: any[]; pagination: any }>
  listByDistrictId(districtId?: number): Promise<any[]>
  findByTehsilId(tehsilId: number): Promise<any | null>
}

export interface LicenseRepository {
  upsertByApplicantId(applicantId: number, data: Partial<any>): Promise<any>
  findActiveByLicenseNumber(licenseNumber: string, dateOfIssue?: Date): Promise<any | null>
  list(): Promise<any[]>
  listByApplicantIds(applicantIds: number[]): Promise<any[]>
}

export interface InspectionReportRepository {
  list(filter?: Record<string, unknown>): Promise<any[]>
  create(payload: Record<string, unknown>): Promise<any>
  updateByNumericId(numericId: number, updates: Record<string, unknown>): Promise<any | null>
  deleteByNumericId(numericId: number): Promise<void>
}

export interface SingleUsePlasticsSnapshotRepository {
  findById(id: string): Promise<any | null>
  upsertAddItems(id: string, items: any[]): Promise<any>
}

export interface CompetitionRepository {
  findAll(): Promise<any[]>
  findById(id: string): Promise<any | null>
  findActive(): Promise<any[]>
  create(data: Record<string, unknown>): Promise<any>
  update(id: string, data: Partial<Record<string, unknown>>): Promise<any | null>
  updateStatus(id: string, status: string): Promise<any | null>
  delete(id: string): Promise<boolean>
  incrementEnrolledCount(id: string): Promise<void>
}

export interface CompetitionRegistrationRepository {
  findAll(): Promise<any[]>
  findByCompetition(competitionId: string): Promise<any[]>
  findByApplicant(applicantId: number): Promise<any[]>
  findById(id: string): Promise<any | null>
  findByRegistrationId(registrationId: string): Promise<any | null>
  findByCompetitionAndApplicant(competitionId: string, applicantId: number): Promise<any | null>
  create(data: Record<string, unknown>): Promise<any>
  update(id: string, data: Partial<Record<string, unknown>>): Promise<any | null>
  updateStatus(id: string, status: string): Promise<any | null>
  delete(id: string): Promise<boolean>
  scoreSubmission(id: string, score: number, scoredBy: string): Promise<any | null>
}

export interface CourierLabelRepository {
  findAll(): Promise<any[]>
  findByRegistration(registrationId: string): Promise<any | null>
  findByTrackingNumber(trackingNumber: string): Promise<any | null>
  create(data: Record<string, unknown>): Promise<any>
  update(id: string, data: Partial<Record<string, unknown>>): Promise<any | null>
  updateStatus(id: string, status: string): Promise<any | null>
}

export interface DistrictPlasticCommitteeDocumentRepository {
  create(payload: Record<string, unknown>): Promise<any>
  list(): Promise<any[]>
}

export interface ApplicantDocumentRepository {
  listByApplicantId(applicantId: number): Promise<ApplicantDocument[]>
  list(): Promise<ApplicantDocument[]>
  create(payload: Record<string, unknown>): Promise<ApplicantDocument>
  findLatestByApplicantAndDescription(applicantId: number, description: string): Promise<ApplicantDocument | null>
}

export interface ApplicantFieldResponseRepository {
  listByApplicantId(applicantId: number): Promise<ApplicantFieldResponse[]>
}

export interface ApplicantManualFieldsRepository {
  findByApplicantId(applicantId: number): Promise<ApplicantManualFields | null>
  listWithLatLon(): Promise<ApplicantManualFields[]>
  list(filter?: Record<string, unknown>): Promise<ApplicantManualFields[]>
}

export interface ApplicantFeeRepository {
  findAll(): Promise<ApplicantFee[]>
  list(): Promise<ApplicantFee[]>
  listByApplicantId(applicantId: number): Promise<ApplicantFee[]>
  listByApplicantIds?(applicantIds: number[]): Promise<ApplicantFee[]>
  sumFeeByApplicantId(applicantId: number): Promise<number>
  countByApplicantId(applicantId: number): Promise<number>
  aggregateBySettlement(): Promise<Array<{ _id: boolean; total: number; count: number }>>
}

export interface PSIDTrackingRepository {
  findAll(): Promise<PSIDTracking[]>
  listPaidByApplicantId(applicantId: number): Promise<PSIDTracking[]>
  findByConsumerNumber(consumerNumber: string): Promise<PSIDTracking | null>
  findByConsumerAndDept(consumerNumber: string, deptTransactionId: string): Promise<PSIDTracking | null>
  countByApplicantId(applicantId: number): Promise<number>
  findLatestByApplicantId(applicantId: number): Promise<PSIDTracking | null>
  list(): Promise<PSIDTracking[]>
  create(payload: Record<string, unknown>): Promise<PSIDTracking>
  updateById(id: string, updates: Record<string, unknown>): Promise<PSIDTracking | null>
}

export interface ProducerRepository {
  findByApplicantId(applicantId: number): Promise<Producer | null>
  listByApplicantIds(applicantIds: number[]): Promise<Producer[]>
}

export interface ConsumerRepository {
  findByApplicantId(applicantId: number): Promise<Consumer | null>
  listByApplicantIds(applicantIds: number[]): Promise<Consumer[]>
}

export interface CollectorRepository {
  findByApplicantId(applicantId: number): Promise<Collector | null>
  listByApplicantIds(applicantIds: number[]): Promise<Collector[]>
}

export interface RecyclerRepository {
  findByApplicantId(applicantId: number): Promise<Recycler | null>
  listByApplicantIds(applicantIds: number[]): Promise<Recycler[]>
}

export interface ApplicationSubmittedRepository {
  findByApplicantId(applicantId: number): Promise<ApplicationSubmitted | null>
  listByApplicantIds?(applicantIds: number[]): Promise<ApplicationSubmitted[]>
  create(applicantId: number): Promise<ApplicationSubmitted>
  list(): Promise<ApplicationSubmitted[]>
}

export interface ApplicationAssignmentRepository {
  listByApplicantIds(applicantIds: number[]): Promise<ApplicationAssignment[]>
  findLatestByApplicantId(applicantId: number): Promise<ApplicationAssignment | null>
  list(filter?: Record<string, unknown>): Promise<ApplicationAssignment[]>
  create(payload: Record<string, unknown>): Promise<ApplicationAssignment>
}

export interface AlertRepository {
  findAll(): Promise<any[]>
  findById(id: string): Promise<any | null>
  findByApplicantId(applicantId: number, limit?: number, offset?: number): Promise<any[]>
  findUnreadByApplicantId(applicantId: number): Promise<any[]>
  countUnreadByApplicantId(applicantId: number): Promise<number>
  findByType(type: string, limit?: number): Promise<any[]>
  findByStatus(status: string, limit?: number): Promise<any[]>
  findByTypeAndApplicant(type: string, applicantId: number): Promise<any[]>
  create(alertData: Record<string, unknown>): Promise<any>
  update(id: string, updates: Record<string, unknown>): Promise<any | null>
  updateStatus(id: string, status: string): Promise<any | null>
  markAsRead(id: string): Promise<any | null>
  markMultipleAsRead(ids: string[]): Promise<number>
  delete(id: string): Promise<boolean>
  deleteByApplicantId(applicantId: number): Promise<number>
  listByFilter(filter: Record<string, unknown>, limit?: number, offset?: number): Promise<any[]>
  countByFilter(filter: Record<string, unknown>): Promise<number>
}

export interface AlertRecipientRepository {
  findByApplicantId(applicantId: number): Promise<any | null>
  findAll(): Promise<any[]>
  create(recipientData: Record<string, unknown>): Promise<any>
  update(applicantId: number, updates: Record<string, unknown>): Promise<any | null>
  updatePreferences(applicantId: number, preferences: Record<string, unknown>): Promise<any | null>
  delete(applicantId: number): Promise<boolean>
  findActiveRecipients(): Promise<any[]>
}

export interface AlertTemplateRepository {
  findAll(): Promise<any[]>
  findById(id: string): Promise<any | null>
  findByType(type: string): Promise<any | null>
  create(templateData: Record<string, unknown>): Promise<any>
  update(id: string, updates: Record<string, unknown>): Promise<any | null>
  delete(id: string): Promise<boolean>
  findActive(): Promise<any[]>
}

export interface AdvancedFieldDefinitionRepository {
  findAll(): Promise<any[]>
  findById(id: string): Promise<any | null>
  findByFieldId(fieldId: string): Promise<any | null>
  findBySection(sectionId: string): Promise<any[]>
  findActive(): Promise<any[]>
  create(fieldData: Record<string, unknown>): Promise<any>
  update(id: string, updates: Record<string, unknown>): Promise<any | null>
  updateStatus(id: string, status: string): Promise<any | null>
  delete(id: string): Promise<boolean>
  findWithDependencies(fieldIds: string[]): Promise<any[]>
  listByOrder(sectionId?: string): Promise<any[]>
}

export interface AdvancedFieldResponseRepository {
  findAll(): Promise<any[]>
  findById(id: string): Promise<any | null>
  findByApplicantId(applicantId: number): Promise<any[]>
  findByApplicantAndSection(applicantId: number, sectionId: string): Promise<any | null>
  create(responseData: Record<string, unknown>): Promise<any>
  update(id: string, updates: Record<string, unknown>): Promise<any | null>
  updateResponse(applicantId: number, sectionId: string, responses: any[]): Promise<any | null>
  delete(id: string): Promise<boolean>
  deleteByApplicantId(applicantId: number): Promise<number>
  findComplete(applicantId: number): Promise<any[]>
  findIncomplete(applicantId: number): Promise<any[]>
  countByCompletion(applicantId: number): Promise<{ complete: number; incomplete: number }>
  getCompletionStatus(applicantId: number): Promise<any>
}

export interface FieldResponseAuditLogRepository {
  findAll(): Promise<any[]>
  findById(id: string): Promise<any | null>
  findByApplicantId(applicantId: number, limit?: number): Promise<any[]>
  findByFieldId(fieldId: string, limit?: number): Promise<any[]>
  findByApplicantAndField(applicantId: number, fieldId: string): Promise<any[]>
  create(auditData: Record<string, unknown>): Promise<any>
  delete(id: string): Promise<boolean>
  deleteOldLogs(olderThanDays: number): Promise<number>
}

export interface FieldSectionRepository {
  findAll(): Promise<any[]>
  findById(id: string): Promise<any | null>
  findBySectionId(sectionId: string): Promise<any | null>
  findActive(): Promise<any[]>
  create(sectionData: Record<string, unknown>): Promise<any>
  update(id: string, updates: Record<string, unknown>): Promise<any | null>
  delete(id: string): Promise<boolean>
  listByOrder(): Promise<any[]>
}
