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
  create(applicant: Partial<ApplicantDetail>): Promise<ApplicantDetail>
  updateByNumericId(numericId: number, updates: Partial<ApplicantDetail>): Promise<ApplicantDetail | null>
  updateOne(filter: Record<string, unknown>, updates: Record<string, unknown>): Promise<void>
  deleteByNumericId(numericId: number): Promise<void>
  count(filter?: Record<string, unknown>): Promise<number>
  aggregate(pipeline: any[]): Promise<any[]>
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
  findByDistrictId(districtId: number): Promise<any | null>
  findByShortName(shortName: string): Promise<any | null>
}

export interface TehsilRepository {
  list(filter?: Record<string, unknown>, sort?: Record<string, 1 | -1>): Promise<any[]>
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

export interface CompetitionRegistrationRepository {
  create(payload: Record<string, unknown>): Promise<any>
  findByRegistrationId(registrationId: string): Promise<any | null>
}

export interface DistrictPlasticCommitteeDocumentRepository {
  create(payload: Record<string, unknown>): Promise<any>
  list(): Promise<any[]>
}

export interface ApplicantDocumentRepository {
  listByApplicantId(applicantId: number): Promise<ApplicantDocument[]>
  list(): Promise<ApplicantDocument[]>
  create(payload: Record<string, unknown>): Promise<ApplicantDocument>
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
  listByApplicantId(applicantId: number): Promise<ApplicantFee[]>
  sumFeeByApplicantId(applicantId: number): Promise<number>
  countByApplicantId(applicantId: number): Promise<number>
  aggregateBySettlement(): Promise<Array<{ _id: boolean; total: number; count: number }>>
}

export interface PSIDTrackingRepository {
  listPaidByApplicantId(applicantId: number): Promise<PSIDTracking[]>
  findByConsumerNumber(consumerNumber: string): Promise<PSIDTracking | null>
  countByApplicantId(applicantId: number): Promise<number>
  findLatestByApplicantId(applicantId: number): Promise<PSIDTracking | null>
  list(): Promise<PSIDTracking[]>
  create(payload: Record<string, unknown>): Promise<PSIDTracking>
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
  create(applicantId: number): Promise<ApplicationSubmitted>
  list(): Promise<ApplicationSubmitted[]>
}

export interface ApplicationAssignmentRepository {
  listByApplicantIds(applicantIds: number[]): Promise<ApplicationAssignment[]>
  findLatestByApplicantId(applicantId: number): Promise<ApplicationAssignment | null>
  list(filter?: Record<string, unknown>): Promise<ApplicationAssignment[]>
  create(payload: Record<string, unknown>): Promise<ApplicationAssignment>
}
