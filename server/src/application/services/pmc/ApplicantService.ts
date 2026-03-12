import type { ApplicantRepository, BusinessProfileRepository, DistrictRepository, TehsilRepository, LicenseRepository, ApplicationSubmittedRepository, ApplicationAssignmentRepository, ApplicantDocumentRepository, ApplicantFieldResponseRepository, ApplicantManualFieldsRepository, ApplicantFeeRepository, PSIDTrackingRepository, ProducerRepository, ConsumerRepository, CollectorRepository, RecyclerRepository } from '../../../domain/repositories/pmc'
import { buildApplicantServiceDeps } from '../../../infrastructure/database/repositories/pmc'
import {
  serializeApplicantDocument,
  serializeApplicantFieldResponse,
  serializeApplicantManualFields,
  serializeAssignment,
  serializeBusinessProfile,
  serializeCollector,
  serializeConsumer,
  serializeProducer,
  serializeRecycler,
} from './serializers'
import mongoose from 'mongoose'

export type ApplicantServiceDeps = {
  applicantRepo: ApplicantRepository
  businessProfileRepo: BusinessProfileRepository
  districtRepo: DistrictRepository
  tehsilRepo: TehsilRepository
  licenseRepo: LicenseRepository
  applicationSubmittedRepo: ApplicationSubmittedRepository
  applicationAssignmentRepo: ApplicationAssignmentRepository
  applicantDocumentRepo: ApplicantDocumentRepository
  applicantFieldResponseRepo: ApplicantFieldResponseRepository
  applicantManualFieldsRepo: ApplicantManualFieldsRepository
  applicantFeeRepo: ApplicantFeeRepository
  psidTrackingRepo: PSIDTrackingRepository
  producerRepo: ProducerRepository
  consumerRepo: ConsumerRepository
  collectorRepo: CollectorRepository
  recyclerRepo: RecyclerRepository
}

const defaultDeps: ApplicantServiceDeps = buildApplicantServiceDeps()

function normalizeArray(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
  return [String(value)]
}

export async function maybeCreateSubmitted(applicantId: number, deps: ApplicantServiceDeps = defaultDeps) {
  const exists = await deps.applicationSubmittedRepo.findByApplicantId(applicantId)
  if (!exists) {
    await deps.applicationSubmittedRepo.create(applicantId)
  }
}

export async function maybeUpdateTrackingNumber(applicantId: number, deps: ApplicantServiceDeps = defaultDeps) {
  const applicant = await deps.applicantRepo.findByNumericId(applicantId)
  if (!applicant) return
  const businessProfile = await deps.businessProfileRepo.findByApplicantId(applicantId)
  if (!businessProfile || !applicant.registrationFor) return

  const district = businessProfile.districtId
    ? await deps.districtRepo.findByDistrictId(businessProfile.districtId)
    : null

  const districtCode = district?.shortName || district?.districtName?.slice(0, 3).toUpperCase() || 'XXX'
  const registrationCode = applicant.registrationFor.slice(0, 3).toUpperCase()
  const applicantIdNum = String(applicant.numericId).padStart(3, '0')

  const trackingNumber = `${districtCode}-${registrationCode}-${applicantIdNum}`
  await deps.applicantRepo.updateOne({ numericId: applicantId }, { trackingNumber })
}

export async function getPlasticTypes(applicant: any, deps: ApplicantServiceDeps = defaultDeps): Promise<string> {
  const regFor = (applicant.registrationFor || '').trim()
  if (!regFor) return 'N/A'

  if (regFor === 'Producer') {
    const producer = await deps.producerRepo.findByApplicantId(applicant.numericId)
    const list = [...normalizeArray(producer?.registrationRequiredFor), ...normalizeArray(producer?.registrationRequiredForOther)]
    return list.length ? list.join(', ') : 'N/A'
  }

  if (regFor === 'Consumer') {
    const consumer = await deps.consumerRepo.findByApplicantId(applicant.numericId)
    const list = [...normalizeArray(consumer?.registrationRequiredFor), ...normalizeArray(consumer?.registrationRequiredForOther)]
    return list.length ? list.join(', ') : 'N/A'
  }

  if (regFor === 'Collector') {
    const collector = await deps.collectorRepo.findByApplicantId(applicant.numericId)
    const list = [...normalizeArray(collector?.registrationRequiredFor), ...normalizeArray(collector?.registrationRequiredForOther)]
    return list.length ? list.join(', ') : 'N/A'
  }

  if (regFor === 'Recycler') {
    const recycler = await deps.recyclerRepo.findByApplicantId(applicant.numericId)
    const list = normalizeArray(recycler?.selectedCategories)
    return list.length ? list.join(', ') : 'N/A'
  }

  return 'N/A'
}

export async function getParticulars(applicant: any, deps: ApplicantServiceDeps = defaultDeps): Promise<string> {
  const regFor = (applicant.registrationFor || '').toLowerCase().trim()
  if (regFor === 'producer') {
    const producer = await deps.producerRepo.findByApplicantId(applicant.numericId)
    return `Number of Machines: ${producer?.numberOfMachines || 'Unknown'}`
  }
  const businessProfile = await deps.businessProfileRepo.findByApplicantId(applicant.numericId)
  if (businessProfile?.entityType) {
    return `Business Type: ${businessProfile.entityType}`
  }
  return 'N/A'
}

export async function createOrUpdateLicense(applicantId: mongoose.Types.ObjectId | number, userId?: mongoose.Types.ObjectId, deps: ApplicantServiceDeps = defaultDeps) {
  const applicant = typeof applicantId === 'number'
    ? await deps.applicantRepo.findByNumericId(applicantId)
    : await deps.applicantRepo.findById(String(applicantId))
  if (!applicant) return
  if (applicant.assignedGroup !== 'Download License') return

  const ownerName = `${applicant.firstName} ${applicant.lastName || ''}`.trim()
  const businessProfile = await deps.businessProfileRepo.findByApplicantId(applicant.numericId)
  const businessName = businessProfile?.businessName || businessProfile?.name || ''
  const address = businessProfile?.postalAddress || ''

  const feeAmount = await deps.applicantFeeRepo.sumFeeByApplicantId(applicant.numericId)

  const typesOfPlastics = await getPlasticTypes(applicant, deps)
  const particulars = await getParticulars(applicant, deps)

  await deps.licenseRepo.upsertByApplicantId(applicant.numericId, {
    licenseFor: applicant.registrationFor,
    licenseNumber: applicant.trackingNumber || '',
    licenseDuration: '3 Years',
    ownerName,
    businessName,
    typesOfPlastics: typesOfPlastics.slice(0, 200),
    particulars: particulars.slice(0, 200),
    feeAmount,
    address: address.slice(0, 300),
    dateOfIssue: new Date(),
    createdBy: userId as any,
  })
}

function resolveApplicantId(applicant: any): number | undefined {
  const numericId =
    Number.isFinite(applicant?.numericId) ? Number(applicant.numericId) : Number.parseInt(String(applicant?.id), 10)
  return Number.isFinite(numericId) ? numericId : undefined
}

function buildBaseApplicantPayload(applicant: any) {
  return {
    id: applicant.numericId ?? applicant.id ?? applicant._id,
    first_name: applicant.firstName ?? applicant.first_name,
    last_name: applicant.lastName ?? applicant.last_name,
    applicant_designation: applicant.applicantDesignation ?? applicant.applicant_designation,
    gender: applicant.gender,
    cnic: applicant.cnic,
    email: applicant.email,
    mobile_operator: applicant.mobileOperator ?? applicant.mobile_operator,
    mobile_no: applicant.mobileNo ?? applicant.mobile_no,
    application_status: applicant.applicationStatus ?? applicant.application_status,
    tracking_number: applicant.trackingNumber ?? applicant.tracking_number,
    remarks: applicant.remarks,
    assigned_group: applicant.assignedGroup ?? applicant.assigned_group,
    registration_for: applicant.registrationFor ?? applicant.registration_for,
    tracking_hash: applicant.trackingHash ?? applicant.tracking_hash,
    created_at: applicant.createdAt ?? applicant.created_at,
    updated_at: applicant.updatedAt ?? applicant.updated_at,
  }
}

function serializeApplicantFees(fees: any[]) {
  return fees.map((fee: any) => ({
    id: fee.numericId || fee._id || fee.id,
    applicant: fee.applicantId ?? fee.applicant_id,
    fee_amount: fee.feeAmount ?? fee.fee_amount,
    is_settled: fee.isSettled ?? fee.is_settled,
    reason: fee.reason,
    created_at: fee.createdAt ?? fee.created_at,
    updated_at: fee.updatedAt ?? fee.updated_at,
  }))
}

function serializePsidTrackingRows(psidTracking: any[]) {
  return psidTracking.map((psid: any) => ({
    id: psid._id || psid.id,
    applicant_id: psid.applicantId ?? psid.applicant_id,
    dept_transaction_id: psid.deptTransactionId ?? psid.dept_transaction_id,
    due_date: psid.dueDate ? new Date(psid.dueDate).toISOString().slice(0, 10) : psid.due_date ? new Date(psid.due_date).toISOString().slice(0, 10) : null,
    expiry_date: psid.expiryDate ?? psid.expiry_date,
    amount_within_due_date: psid.amountWithinDueDate ?? psid.amount_within_due_date,
    amount_after_due_date: psid.amountAfterDueDate ?? psid.amount_after_due_date,
    consumer_name: psid.consumerName ?? psid.consumer_name,
    mobile_no: psid.mobileNo ?? psid.mobile_no,
    cnic: psid.cnic,
    email: psid.email,
    district_id: psid.districtId ?? psid.district_id,
    amount_bifurcation: psid.amountBifurcation ?? psid.amount_bifurcation,
    consumer_number: psid.consumerNumber ?? psid.consumer_number,
    status: psid.status,
    message: psid.message,
    payment_status: psid.paymentStatus ?? psid.payment_status,
    amount_paid: psid.amountPaid ?? psid.amount_paid,
    paid_date: psid.paidDate ? new Date(psid.paidDate).toISOString().slice(0, 10) : psid.paid_date ? new Date(psid.paid_date).toISOString().slice(0, 10) : null,
    paid_time: psid.paidTime ?? psid.paid_time,
    bank_code: psid.bankCode ?? psid.bank_code,
    created_at: psid.createdAt ?? psid.created_at,
  }))
}

function buildCompactApplicantPayload(
  applicant: any,
  relations: {
    assignments?: any[]
    submitted?: any | null
    fees?: any[]
  }
) {
  const base = buildBaseApplicantPayload(applicant)
  const applicantAssignments = (relations.assignments || []).map((assignment) => serializeAssignment(assignment))
  const applicantFees = relations.fees || []
  const totalFeeAmount = applicantFees.reduce(
    (sum: number, fee: any) => sum + Number((fee.feeAmount ?? fee.fee_amount) || 0),
    0
  )
  const verifiedFeeAmount = applicantFees
    .filter((fee: any) => Boolean(fee.isSettled ?? fee.is_settled))
    .reduce((sum: number, fee: any) => sum + Number((fee.feeAmount ?? fee.fee_amount) || 0), 0)

  return {
    ...base,
    has_identity_document: false,
    has_fee_challan: applicantFees.length > 0,
    is_downloaded_fee_challan: applicantFees.length > 0,
    businessprofile: null,
    producer: null,
    consumer: null,
    collector: null,
    recycler: null,
    applicationassignment: applicantAssignments,
    applicationdocument: [],
    submittedapplication: relations.submitted
      ? {
          id: (relations.submitted as any).id ?? (relations.submitted as any)._id,
          applicant_id: (relations.submitted as any).applicantId ?? (relations.submitted as any).applicant_id,
          created_at: (relations.submitted as any).createdAt ?? (relations.submitted as any).created_at,
          updated_at: (relations.submitted as any).updatedAt ?? (relations.submitted as any).updated_at,
        }
      : null,
    field_responses: [],
    applicantfees: [],
    total_fee_amount: totalFeeAmount,
    verified_fee_amount: verifiedFeeAmount,
    manual_fields: null,
    psid_tracking: [],
  }
}

function buildDetailedApplicantPayload(
  applicant: any,
  relations: {
    businessProfile?: any | null
    district?: any | null
    tehsil?: any | null
    producer?: any | null
    consumer?: any | null
    collector?: any | null
    recycler?: any | null
    assignments?: any[]
    documents?: any[]
    submitted?: any | null
    fieldResponses?: any[]
    fees?: any[]
    manualFields?: any | null
    psidTracking?: any[]
  }
) {
  const documents = relations.documents || []
  const fees = relations.fees || []
  const psidTracking = relations.psidTracking || []

  const hasIdentityDocument = documents.some(
    (d: any) => ((d.documentDescription ?? d.document_description) || '') === 'Identity Document'
  )
  const hasFeeChallan =
    documents.some((d: any) => ((d.documentDescription ?? d.document_description) || '') === 'Fee Challan') ||
    psidTracking.length > 0
  const isDownloadedFeeChallan = fees.length > 0 && psidTracking.length === 0

  const businessProfileData = serializeBusinessProfile(relations.businessProfile) as any
  if (businessProfileData) {
    businessProfileData.district_name = relations.district?.districtName ?? relations.district?.district_name ?? null
    businessProfileData.tehsil_name = relations.tehsil?.tehsilName ?? relations.tehsil?.tehsil_name ?? null
  }

  return {
    id: applicant.numericId ?? applicant.numeric_id ?? applicant.id,
    first_name: applicant.firstName ?? applicant.first_name,
    last_name: applicant.lastName ?? applicant.last_name,
    applicant_designation: applicant.applicantDesignation ?? applicant.applicant_designation,
    gender: applicant.gender,
    cnic: applicant.cnic,
    email: applicant.email,
    mobile_operator: applicant.mobileOperator ?? applicant.mobile_operator,
    mobile_no: applicant.mobileNo ?? applicant.mobile_no,
    application_status: applicant.applicationStatus ?? applicant.application_status,
    tracking_number: applicant.trackingNumber ?? applicant.tracking_number,
    remarks: applicant.remarks,
    assigned_group: applicant.assignedGroup ?? applicant.assigned_group,
    registration_for: applicant.registrationFor ?? applicant.registration_for,
    tracking_hash: applicant.trackingHash ?? applicant.tracking_hash,
    created_at: applicant.createdAt ?? applicant.created_at,
    updated_at: applicant.updatedAt ?? applicant.updated_at,
    has_identity_document: hasIdentityDocument,
    has_fee_challan: hasFeeChallan,
    is_downloaded_fee_challan: isDownloadedFeeChallan,
    businessprofile: businessProfileData,
    producer: serializeProducer(relations.producer),
    consumer: serializeConsumer(relations.consumer),
    collector: serializeCollector(relations.collector),
    recycler: serializeRecycler(relations.recycler),
    applicationassignment: (relations.assignments || []).map((assignment: any) => serializeAssignment(assignment)),
    applicationdocument: documents.map((document: any) => serializeApplicantDocument(document)),
    submittedapplication: relations.submitted || null,
    field_responses: (relations.fieldResponses || []).map((response: any) => serializeApplicantFieldResponse(response)),
    applicantfees: serializeApplicantFees(fees),
    manual_fields: serializeApplicantManualFields(relations.manualFields),
    psid_tracking: serializePsidTrackingRows(psidTracking),
  }
}

async function findSubmittedByApplicantIds(applicantIds: number[], deps: ApplicantServiceDeps) {
  if (!applicantIds.length) return []
  if (deps.applicationSubmittedRepo.listByApplicantIds) {
    return deps.applicationSubmittedRepo.listByApplicantIds(applicantIds)
  }
  const submitted = await Promise.all(applicantIds.map((id) => deps.applicationSubmittedRepo.findByApplicantId(id)))
  return submitted.filter(Boolean) as any[]
}

async function findFeesByApplicantIds(applicantIds: number[], deps: ApplicantServiceDeps) {
  if (!applicantIds.length) return []
  if (deps.applicantFeeRepo.listByApplicantIds) {
    return deps.applicantFeeRepo.listByApplicantIds(applicantIds)
  }
  const nested = await Promise.all(applicantIds.map((id) => deps.applicantFeeRepo.listByApplicantId(id)))
  return nested.flat()
}

export async function assembleApplicantDetailsCompact(applicants: any[], deps: ApplicantServiceDeps = defaultDeps) {
  if (!Array.isArray(applicants) || applicants.length === 0) return []

  const applicantIds = applicants
    .map(resolveApplicantId)
    .filter((id): id is number => Number.isFinite(id))

  const [assignments, submittedRows, fees] = await Promise.all([
    applicantIds.length ? deps.applicationAssignmentRepo.listByApplicantIds(applicantIds) : Promise.resolve([]),
    findSubmittedByApplicantIds(applicantIds, deps),
    findFeesByApplicantIds(applicantIds, deps),
  ])

  const assignmentsByApplicant = new Map<number, any[]>()
  for (const assignment of assignments as any[]) {
    const applicantId = Number((assignment as any)?.applicantId)
    if (!Number.isFinite(applicantId)) continue
    const list = assignmentsByApplicant.get(applicantId) || []
    list.push(assignment)
    assignmentsByApplicant.set(applicantId, list)
  }

  const submittedByApplicant = new Map<number, any>()
  for (const submitted of submittedRows as any[]) {
    const applicantId = Number((submitted as any)?.applicantId)
    if (!Number.isFinite(applicantId)) continue
    submittedByApplicant.set(applicantId, submitted)
  }

  const feesByApplicant = new Map<number, any[]>()
  for (const fee of fees as any[]) {
    const applicantId = Number((fee as any)?.applicantId)
    if (!Number.isFinite(applicantId)) continue
    const list = feesByApplicant.get(applicantId) || []
    list.push(fee)
    feesByApplicant.set(applicantId, list)
  }

  return applicants.map((applicant: any) => {
    const applicantId = resolveApplicantId(applicant)

    if (!applicantId) {
      return buildCompactApplicantPayload(applicant, {})
    }

    return buildCompactApplicantPayload(applicant, {
      assignments: assignmentsByApplicant.get(applicantId) || [],
      submitted: submittedByApplicant.get(applicantId) || null,
      fees: feesByApplicant.get(applicantId) || [],
    })
  })
}

export async function assembleApplicantDetail(applicant: any, deps: ApplicantServiceDeps = defaultDeps) {
  const applicantId = resolveApplicantId(applicant)
  if (!applicantId) {
    return buildDetailedApplicantPayload(applicant, {})
  }
  const [
    businessProfile,
    producer,
    consumer,
    collector,
    recycler,
    assignments,
    documents,
    submitted,
    fieldResponses,
    fees,
    manualFields,
    psidTracking,
  ] = await Promise.all([
    deps.businessProfileRepo.findByApplicantId(applicantId),
    deps.producerRepo.findByApplicantId(applicantId),
    deps.consumerRepo.findByApplicantId(applicantId),
    deps.collectorRepo.findByApplicantId(applicantId),
    deps.recyclerRepo.findByApplicantId(applicantId),
    deps.applicationAssignmentRepo.listByApplicantIds([applicantId]),
    deps.applicantDocumentRepo.listByApplicantId(applicantId),
    deps.applicationSubmittedRepo.findByApplicantId(applicantId),
    deps.applicantFieldResponseRepo.listByApplicantId(applicantId),
    deps.applicantFeeRepo.listByApplicantId(applicantId),
    deps.applicantManualFieldsRepo.findByApplicantId(applicantId),
    deps.psidTrackingRepo.listPaidByApplicantId(applicantId),
  ])

  const [district, tehsil] = businessProfile
    ? await Promise.all([
        businessProfile.districtId ? deps.districtRepo.findByDistrictId(businessProfile.districtId) : null,
        businessProfile.tehsilId ? deps.tehsilRepo.findByTehsilId(businessProfile.tehsilId) : null,
      ])
    : [null, null]

  return buildDetailedApplicantPayload(applicant, {
    businessProfile,
    district,
    tehsil,
    producer,
    consumer,
    collector,
    recycler,
    assignments,
    documents,
    submitted,
    fieldResponses,
    fees,
    manualFields,
    psidTracking,
  })
}

export function serializeAggregatedApplicantDetail(row: any) {
  return buildDetailedApplicantPayload(row, {
    businessProfile: row.businessProfileDoc || row.businessProfile || null,
    district: row.districtDoc || null,
    tehsil: row.tehsilDoc || null,
    producer: row.producerDoc || null,
    consumer: row.consumerDoc || null,
    collector: row.collectorDoc || null,
    recycler: row.recyclerDoc || null,
    assignments: row.assignmentDocs || [],
    documents: row.documentDocs || [],
    submitted: row.submittedDoc || null,
    fieldResponses: row.fieldResponseDocs || [],
    fees: row.feeDocs || [],
    manualFields: row.manualFieldDoc || null,
    psidTracking: row.psidTrackingDocs || [],
  })
}
