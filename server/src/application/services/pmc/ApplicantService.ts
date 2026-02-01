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

export async function assembleApplicantDetail(applicant: any, deps: ApplicantServiceDeps = defaultDeps) {
  const numericId =
    Number.isFinite(applicant?.numericId) ? Number(applicant.numericId) : Number.parseInt(String(applicant?.id), 10)
  const applicantId = Number.isFinite(numericId) ? numericId : undefined
  if (!applicantId) {
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
      has_identity_document: false,
      has_fee_challan: false,
      is_downloaded_fee_challan: false,
      businessprofile: null,
      producer: null,
      consumer: null,
      collector: null,
      recycler: null,
      applicationassignment: [],
      applicationdocument: [],
      submittedapplication: null,
      field_responses: [],
      applicantfees: [],
      manual_fields: null,
      psid_tracking: [],
    }
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

  const hasIdentityDocument = documents.some((d: any) => (d.documentDescription || '') === 'Identity Document')
  const hasFeeChallan =
    documents.some((d: any) => (d.documentDescription || '') === 'Fee Challan') || psidTracking.length > 0
  const isDownloadedFeeChallan =
    fees.length > 0 && (await deps.psidTrackingRepo.countByApplicantId(applicantId)) === 0

  let businessProfileData = serializeBusinessProfile(businessProfile) as any
  if (businessProfile) {
    const [district, tehsil] = await Promise.all([
      businessProfile.districtId ? deps.districtRepo.findByDistrictId(businessProfile.districtId) : null,
      businessProfile.tehsilId ? deps.tehsilRepo.findByTehsilId(businessProfile.tehsilId) : null,
    ])
    if (businessProfileData) {
      businessProfileData.district_name = district?.districtName || null
      businessProfileData.tehsil_name = tehsil?.tehsilName || null
    }
  }

  const psidTrackingSerialized = (psidTracking as any[]).map((psid: any) => ({
    id: psid._id || psid.id,
    applicant_id: psid.applicantId,
    dept_transaction_id: psid.deptTransactionId,
    due_date: psid.dueDate ? psid.dueDate.toISOString().slice(0, 10) : null,
    expiry_date: psid.expiryDate,
    amount_within_due_date: psid.amountWithinDueDate,
    amount_after_due_date: psid.amountAfterDueDate,
    consumer_name: psid.consumerName,
    mobile_no: psid.mobileNo,
    cnic: psid.cnic,
    email: psid.email,
    district_id: psid.districtId,
    amount_bifurcation: psid.amountBifurcation,
    consumer_number: psid.consumerNumber,
    status: psid.status,
    message: psid.message,
    payment_status: psid.paymentStatus,
    amount_paid: psid.amountPaid,
    paid_date: psid.paidDate ? psid.paidDate.toISOString().slice(0, 10) : null,
    paid_time: psid.paidTime,
    bank_code: psid.bankCode,
    created_at: psid.createdAt,
  }))

  return {
    id: applicant.numericId,
    first_name: applicant.firstName,
    last_name: applicant.lastName,
    applicant_designation: applicant.applicantDesignation,
    gender: applicant.gender,
    cnic: applicant.cnic,
    email: applicant.email,
    mobile_operator: applicant.mobileOperator,
    mobile_no: applicant.mobileNo,
    application_status: applicant.applicationStatus,
    tracking_number: applicant.trackingNumber,
    remarks: applicant.remarks,
    assigned_group: applicant.assignedGroup,
    registration_for: applicant.registrationFor,
    tracking_hash: applicant.trackingHash,
    created_at: applicant.createdAt,
    updated_at: applicant.updatedAt,
    has_identity_document: hasIdentityDocument,
    has_fee_challan: hasFeeChallan,
    is_downloaded_fee_challan: isDownloadedFeeChallan,
    businessprofile: businessProfileData,
    producer: serializeProducer(producer),
    consumer: serializeConsumer(consumer),
    collector: serializeCollector(collector),
    recycler: serializeRecycler(recycler),
    applicationassignment: assignments.map((a: any) => serializeAssignment(a)),
    applicationdocument: documents.map((d: any) => serializeApplicantDocument(d)),
    submittedapplication: submitted,
    field_responses: fieldResponses.map((f: any) => serializeApplicantFieldResponse(f)),
    applicantfees: fees.map((f: any) => ({
      id: f.numericId || f._id || f.id,
      applicant: f.applicantId,
      fee_amount: f.feeAmount,
      is_settled: f.isSettled,
      reason: f.reason,
      created_at: f.createdAt,
      updated_at: f.updatedAt,
    })),
    manual_fields: serializeApplicantManualFields(manualFields),
    psid_tracking: psidTrackingSerialized,
  }
}
