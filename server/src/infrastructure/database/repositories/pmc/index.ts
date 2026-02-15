import type {
  ApplicantRepository,
  BusinessProfileRepository,
  DistrictRepository,
  TehsilRepository,
  LicenseRepository,
  ApplicationSubmittedRepository,
  ApplicationAssignmentRepository,
  ApplicantDocumentRepository,
  ApplicantFieldResponseRepository,
  ApplicantManualFieldsRepository,
  ApplicantFeeRepository,
  PSIDTrackingRepository,
  ProducerRepository,
  ConsumerRepository,
  CollectorRepository,
  RecyclerRepository,
  InspectionReportRepository,
  SingleUsePlasticsSnapshotRepository,
  CompetitionRegistrationRepository,
  DistrictPlasticCommitteeDocumentRepository,
} from '../../../../domain/repositories/pmc'
import { ApplicantDetailModel } from '../../models/pmc/ApplicantDetail'
import { BusinessProfileModel } from '../../models/pmc/BusinessProfile'
import { DistrictModel } from '../../models/pmc/District'
import { TehsilModel } from '../../models/pmc/Tehsil'
import { LicenseModel } from '../../models/pmc/License'
import { ApplicationSubmittedModel } from '../../models/pmc/ApplicationSubmitted'
import { ApplicationAssignmentModel } from '../../models/pmc/ApplicationAssignment'
import { ApplicantDocumentModel } from '../../models/pmc/ApplicantDocument'
import { ApplicantFieldResponseModel } from '../../models/pmc/ApplicantFieldResponse'
import { ApplicantManualFieldsModel } from '../../models/pmc/ApplicantManualFields'
import { ApplicantFeeModel } from '../../models/pmc/ApplicantFee'
import { PSIDTrackingModel } from '../../models/pmc/PSIDTracking'
import { ProducerModel } from '../../models/pmc/Producer'
import { ConsumerModel } from '../../models/pmc/Consumer'
import { CollectorModel } from '../../models/pmc/Collector'
import { RecyclerModel } from '../../models/pmc/Recycler'
import { InspectionReportModel } from '../../models/pmc/InspectionReport'
import { SingleUsePlasticsSnapshotModel } from '../../models/pmc/SingleUsePlasticsSnapshot'
import { CompetitionRegistrationModel } from '../../models/pmc/CompetitionRegistration'
import { DistrictPlasticCommitteeDocumentModel } from '../../models/pmc/DistrictPlasticCommitteeDocument'
const mapDistrict = (doc: any) => {
  if (!doc) return doc
  const districtId = doc.districtId ?? doc.district_id ?? doc.id
  const districtName = doc.districtName ?? doc.district_name ?? doc.name
  const districtCode = doc.districtCode ?? doc.district_code ?? doc.code
  const divisionId = doc.divisionId ?? doc.division_id
  const shortName = doc.shortName ?? doc.short_name
  const pitbDistrictId = doc.pitbDistrictId ?? doc.pitb_district_id
  return {
    ...doc,
    districtId,
    districtName,
    districtCode,
    divisionId,
    shortName,
    pitbDistrictId,
  }
}

const mapTehsil = (doc: any) => {
  if (!doc) return doc
  const tehsilId = doc.tehsilId ?? doc.tehsil_id ?? doc.id
  const tehsilName = doc.tehsilName ?? doc.tehsil_name ?? doc.name
  const tehsilCode = doc.tehsilCode ?? doc.tehsil_code ?? doc.code
  const districtId = doc.districtId ?? doc.district_id
  const divisionId = doc.divisionId ?? doc.division_id
  return {
    ...doc,
    tehsilId,
    tehsilName,
    tehsilCode,
    districtId,
    divisionId,
  }
}


const mapApplicant = (doc: any) => {
  if (!doc) return doc
  const numericId = doc.numericId ?? (doc.numeric_id !== undefined ? Number(doc.numeric_id) : undefined) ?? (doc.id !== undefined ? Number(doc.id) : undefined)
  return {
    ...doc,
    numericId,
    registrationFor: doc.registrationFor ?? doc.registration_for,
    firstName: doc.firstName ?? doc.first_name,
    lastName: doc.lastName ?? doc.last_name,
    applicantDesignation: doc.applicantDesignation ?? doc.applicant_designation,
    mobileOperator: doc.mobileOperator ?? doc.mobile_operator,
    mobileNo: doc.mobileNo ?? doc.mobile_no,
    applicationStatus: doc.applicationStatus ?? doc.application_status,
    trackingNumber: doc.trackingNumber ?? doc.tracking_number,
    assignedGroup: doc.assignedGroup ?? doc.assigned_group,
    trackingHash: doc.trackingHash ?? doc.tracking_hash,
    createdBy: doc.createdBy ?? doc.created_by ?? doc.created_by_id,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
  }
}

const mapBusinessProfile = (doc: any) => {
  if (!doc) return doc
  const applicantId = doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined)
  const numericId = doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined)
  return {
    ...doc,
    numericId,
    applicantId,
    entityType: doc.entityType ?? doc.entity_type,
    trackingNumber: doc.trackingNumber ?? doc.tracking_number,
    name: doc.name,
    businessName: doc.businessName ?? doc.business_name,
    businessRegistrationType: doc.businessRegistrationType ?? doc.business_registration_type,
    businessRegistrationNo: doc.businessRegistrationNo ?? doc.business_registration_no,
    districtId: doc.districtId ?? doc.district_id,
    tehsilId: doc.tehsilId ?? doc.tehsil_id,
    cityTownVillage: doc.cityTownVillage ?? doc.city_town_village,
    postalAddress: doc.postalAddress ?? doc.postal_address,
    postalCode: doc.postalCode ?? doc.postal_code,
    locationLatitude: doc.locationLatitude ?? doc.location_latitude,
    locationLongitude: doc.locationLongitude ?? doc.location_longitude,
    mobileOperator: doc.mobileOperator ?? doc.mobile_operator,
    mobileNo: doc.mobileNo ?? doc.mobile_no,
    phoneNo: doc.phoneNo ?? doc.phone_no,
    websiteAddress: doc.websiteAddress ?? doc.website_address,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
  }
}

const mapAssignment = (doc: any) => {
  if (!doc) return doc
  const numericId = doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined)
  return {
    ...doc,
    numericId,
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    assignedGroup: doc.assignedGroup ?? doc.assigned_group,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
    createdBy: doc.createdBy ?? doc.created_by_id,
    updatedBy: doc.updatedBy ?? doc.updated_by_id,
  }
}

const mapSubmitted = (doc: any) => {
  if (!doc) return doc
  return {
    ...doc,
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
  }
}

const mapApplicantDocument = (doc: any) => {
  if (!doc) return doc
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    documentDescription: doc.documentDescription ?? doc.document_description,
    documentPath: doc.documentPath ?? doc.document,
    createdAt: doc.createdAt ?? doc.created_at,
  }
}

const mapApplicantFieldResponse = (doc: any) => {
  if (!doc) return doc
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    fieldKey: doc.fieldKey ?? doc.field_key,
    createdAt: doc.createdAt ?? doc.created_at,
  }
}

const mapApplicantManualFields = (doc: any) => {
  if (!doc) return doc
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    listOfProducts: doc.listOfProducts ?? doc.list_of_products,
    listOfByProducts: doc.listOfByProducts ?? doc.list_of_by_products,
    rawMaterialImported: doc.rawMaterialImported ?? doc.raw_material_imported,
    sellerNameIfRawMaterialBought: doc.sellerNameIfRawMaterialBought ?? doc.seller_name_if_raw_material_bought,
    selfImportDetails: doc.selfImportDetails ?? doc.self_import_details,
    rawMaterialUtilized: doc.rawMaterialUtilized ?? doc.raw_material_utilized,
    complianceThickness75: doc.complianceThickness75 ?? doc.compliance_thickness_75,
    validConsentPermitBuildingBylaws: doc.validConsentPermitBuildingBylaws ?? doc.valid_consent_permit_building_bylaws,
    stockistDistributorList: doc.stockistDistributorList ?? doc.stockist_distributor_list,
    procurementPerDay: doc.procurementPerDay ?? doc.procurement_per_day,
    noOfWorkers: doc.noOfWorkers ?? doc.no_of_workers,
    laborDeptRegistrationStatus: doc.laborDeptRegistrationStatus ?? doc.labor_dept_registration_status,
    occupationalSafetyAndHealthFacilities: doc.occupationalSafetyAndHealthFacilities ?? doc.occupational_safety_and_health_facilities,
    adverseEnvironmentalImpacts: doc.adverseEnvironmentalImpacts ?? doc.adverse_environmental_impacts,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
  }
}

const mapApplicantFee = (doc: any) => {
  if (!doc) return doc
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    feeAmount: doc.feeAmount ?? doc.fee_amount,
    isSettled: doc.isSettled ?? doc.is_settled,
    createdAt: doc.createdAt ?? doc.created_at,
    updatedAt: doc.updatedAt ?? doc.updated_at,
  }
}

const mapPSIDTracking = (doc: any) => {
  if (!doc) return doc
  return {
    ...doc,
    numericId: doc.numericId ?? (doc.id !== undefined ? Number(doc.id) : undefined),
    applicantId: doc.applicantId ?? (doc.applicant_id !== undefined ? Number(doc.applicant_id) : undefined),
    deptTransactionId: doc.deptTransactionId ?? doc.dept_transaction_id,
    dueDate: doc.dueDate ?? doc.due_date,
    expiryDate: doc.expiryDate ?? doc.expiry_date,
    amountWithinDueDate: doc.amountWithinDueDate ?? doc.amount_within_due_date,
    amountAfterDueDate: doc.amountAfterDueDate ?? doc.amount_after_due_date,
    consumerName: doc.consumerName ?? doc.consumer_name,
    mobileNo: doc.mobileNo ?? doc.mobile_no,
    districtId: doc.districtId ?? doc.district_id,
    amountBifurcation: doc.amountBifurcation ?? doc.amount_bifurcation,
    consumerNumber: doc.consumerNumber ?? doc.consumer_number,
    paymentStatus: doc.paymentStatus ?? doc.payment_status,
    amountPaid: doc.amountPaid ?? doc.amount_paid,
    paidDate: doc.paidDate ?? doc.paid_date,
    paidTime: doc.paidTime ?? doc.paid_time,
    bankCode: doc.bankCode ?? doc.bank_code,
    createdAt: doc.createdAt ?? doc.created_at,
  }
}

export const applicantRepositoryMongo: ApplicantRepository = {
  async findByNumericId(numericId: number) {
    const doc = await ApplicantDetailModel.findOne({ numericId }).lean().maxTimeMS(30000)
    if (doc) return mapApplicant(doc)
    const legacy = await ApplicantDetailModel.findOne({ id: String(numericId) }).lean().maxTimeMS(30000)
    return legacy ? mapApplicant(legacy) : null
  },
  async findById(id: string) {
    const doc = await ApplicantDetailModel.findById(id).lean().maxTimeMS(30000)
    return doc ? mapApplicant(doc) : null
  },
  async findByTrackingNumber(trackingNumber: string) {
    const doc = await ApplicantDetailModel.findOne({ trackingNumber }).lean().maxTimeMS(30000)
    if (doc) return mapApplicant(doc)
    const legacy = await ApplicantDetailModel.findOne({ tracking_number: trackingNumber }).lean().maxTimeMS(30000)
    return legacy ? mapApplicant(legacy) : null
  },
  async findOne(filter: Record<string, unknown>) {
    const doc = await ApplicantDetailModel.findOne(filter).lean().maxTimeMS(30000)
    return doc ? mapApplicant(doc) : null
  },
  async findOneWithCreator(filter: Record<string, unknown>) {
    const doc = await ApplicantDetailModel.findOne(filter).populate('createdBy').lean().maxTimeMS(30000)
    return doc ? mapApplicant(doc) : null
  },
  async list(filter: Record<string, unknown> = {}) {
    const docs = await ApplicantDetailModel.find(filter)
      .lean()
      .maxTimeMS(30000)
      .select('-__v')
    return docs.map(mapApplicant)
  },
<<<<<<< HEAD
  async listPaginated(
    filter: Record<string, unknown> = {},
    page: number = 1,
    pageSize: number = 20,
    sort: Record<string, 1 | -1> = { createdAt: -1 }
  ) {
    const skip = (page - 1) * pageSize
    const [docs, total] = await Promise.all([
      ApplicantDetailModel.find(filter)
        .lean()
        .select('-__v')
        .maxTimeMS(30000)
        .sort(sort)
        .skip(skip)
        .limit(pageSize),
      ApplicantDetailModel.countDocuments(filter).maxTimeMS(30000),
    ])
    return {
      data: docs.map(mapApplicant),
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
        hasNextPage: page < Math.ceil(total / pageSize),
        hasPreviousPage: page > 1,
      },
    }
=======
  async listPaged(
    filter: Record<string, unknown> = {},
    options: { page?: number; limit?: number; sort?: Record<string, 1 | -1> } = {}
  ) {
    const page = Math.max(Number(options.page || 1), 1)
    const limit = Math.min(Math.max(Number(options.limit || 200), 1), 1000)
    const skip = (page - 1) * limit
    const sort = options.sort || { createdAt: -1 }
    const docs = await ApplicantDetailModel.find(filter).sort(sort).skip(skip).limit(limit).lean()
    return docs.map(mapApplicant)
>>>>>>> 154f65844a53b9b14ce69dd577a9f79de8b3c6e5
  },
  async create(applicant: Partial<any>) {
    const created = await ApplicantDetailModel.create(applicant)
    return mapApplicant(created.toObject())
  },
  async updateByNumericId(numericId: number, updates: Partial<any>) {
    const doc = await ApplicantDetailModel.findOneAndUpdate({ numericId }, updates, { new: true }).lean()
    if (doc) return mapApplicant(doc)
    const legacy = await ApplicantDetailModel.findOneAndUpdate({ id: String(numericId) }, updates, { new: true }).lean()
    return legacy ? mapApplicant(legacy) : null
  },
  async updateOne(filter: Record<string, unknown>, updates: Record<string, unknown>) {
    await ApplicantDetailModel.updateOne(filter, updates)
  },
  async deleteByNumericId(numericId: number) {
    await ApplicantDetailModel.findOneAndDelete({ numericId })
  },
  async count(filter: Record<string, unknown> = {}) {
    return ApplicantDetailModel.countDocuments(filter)
  },
  async aggregate(pipeline: any[]) {
    return ApplicantDetailModel.aggregate(pipeline)
  },
  async getStatsByStatus() {
    return ApplicantDetailModel.aggregate([
      {
        $group: {
          _id: '$applicationStatus',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ])
  },
  async getStatsByDistrict() {
    return ApplicantDetailModel.aggregate([
      {
        $group: {
          _id: '$districtId',
          count: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [{ $eq: ['$applicationStatus', 'approved'] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$applicationStatus', 'pending'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ])
  },
  async getDashboardMetrics(filter: Record<string, unknown> = {}) {
    const results = await ApplicantDetailModel.aggregate([
      { $match: filter },
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$applicationStatus',
                count: { $sum: 1 },
              },
            },
          ],
          byDistrict: [
            {
              $group: {
                _id: '$districtId',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          summary: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                approved: {
                  $sum: {
                    $cond: [{ $eq: ['$applicationStatus', 'approved'] }, 1, 0],
                  },
                },
                pending: {
                  $sum: {
                    $cond: [{ $eq: ['$applicationStatus', 'pending'] }, 1, 0],
                  },
                },
              },
            },
          ],
        },
      },
    ])
    return results[0] || {}
  },
}

export const businessProfileRepositoryMongo: BusinessProfileRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await BusinessProfileModel.findOne({ applicantId }).lean().maxTimeMS(30000)
    if (doc) return mapBusinessProfile(doc)
    const legacy = await BusinessProfileModel.findOne({ applicant_id: String(applicantId) }).lean().maxTimeMS(30000)
    return legacy ? mapBusinessProfile(legacy) : null
  },
  async listByApplicantIds(applicantIds: number[]) {
    const docs = await BusinessProfileModel.find({ applicantId: { $in: applicantIds } }).lean().select('-__v').maxTimeMS(30000)
    if (docs.length) return docs.map(mapBusinessProfile)
    const legacy = await BusinessProfileModel.find({ applicant_id: { $in: applicantIds.map(String) } }).lean().select('-__v').maxTimeMS(30000)
    return legacy.map(mapBusinessProfile)
  },
  async listByDistrictId(districtId: number) {
    const docs = await BusinessProfileModel.find({ districtId }).lean().select('-__v').maxTimeMS(30000)
    if (docs.length) return docs.map(mapBusinessProfile)
    const legacy = await BusinessProfileModel.find({ district_id: districtId }).lean().select('-__v').maxTimeMS(30000)
    return legacy.map(mapBusinessProfile)
  },
  async list(filter: Record<string, unknown> = {}) {
    const docs = await BusinessProfileModel.find(filter).lean().select('-__v').maxTimeMS(30000)
    return docs.map(mapBusinessProfile)
  },
  async searchByBusinessName(regex: RegExp, limit: number) {
    const docs = await BusinessProfileModel.find({ businessName: regex }).select('-__v').limit(limit).lean().maxTimeMS(30000)
    if (docs.length) return docs.map(mapBusinessProfile)
    const legacy = await BusinessProfileModel.find({ business_name: regex }).select('-__v').limit(limit).lean().maxTimeMS(30000)
    return legacy.map(mapBusinessProfile)
  },
}

export const districtRepositoryMongo: DistrictRepository = {
  async list(filter: Record<string, unknown> = {}, sort: Record<string, 1 | -1> = {}) {
    const rows = await DistrictModel.find(filter).lean().select('-__v').maxTimeMS(30000).sort(sort)
    return rows.map(mapDistrict)
  },
  async listPaginated(
    filter: Record<string, unknown> = {},
    page: number = 1,
    pageSize: number = 50,
    sort: Record<string, 1 | -1> = { districtId: 1 }
  ) {
    const skip = (page - 1) * pageSize
    const [rows, total] = await Promise.all([
      DistrictModel.find(filter)
        .lean()
        .select('-__v')
        .maxTimeMS(30000)
        .sort(sort)
        .skip(skip)
        .limit(pageSize),
      DistrictModel.countDocuments(filter).maxTimeMS(30000),
    ])
    return {
      data: rows.map(mapDistrict),
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
        hasNextPage: page < Math.ceil(total / pageSize),
        hasPreviousPage: page > 1,
      },
    }
  },
  async findByDistrictId(districtId: number) {
    const doc = await DistrictModel.findOne({ districtId }).lean().maxTimeMS(30000)
    if (doc) return mapDistrict(doc)
    // fallback for legacy schema
    const legacy = await DistrictModel.findOne({ district_id: districtId }).lean().maxTimeMS(30000)
    return legacy ? mapDistrict(legacy) : null
  },
  async findByShortName(shortName: string) {
    const doc = await DistrictModel.findOne({ shortName }).lean().maxTimeMS(30000)
    if (doc) return mapDistrict(doc)
    const legacy = await DistrictModel.findOne({ short_name: shortName }).lean().maxTimeMS(30000)
    return legacy ? mapDistrict(legacy) : null
  },
}

export const tehsilRepositoryMongo: TehsilRepository = {
  async list(filter: Record<string, unknown> = {}, sort: Record<string, 1 | -1> = {}) {
    const rows = await TehsilModel.find(filter).lean().select('-__v').maxTimeMS(30000).sort(sort)
    return rows.map(mapTehsil)
  },
  async listPaginated(
    filter: Record<string, unknown> = {},
    page: number = 1,
    pageSize: number = 50,
    sort: Record<string, 1 | -1> = { tehsilId: 1 }
  ) {
    const skip = (page - 1) * pageSize
    const [rows, total] = await Promise.all([
      TehsilModel.find(filter)
        .lean()
        .select('-__v')
        .maxTimeMS(30000)
        .sort(sort)
        .skip(skip)
        .limit(pageSize),
      TehsilModel.countDocuments(filter).maxTimeMS(30000),
    ])
    return {
      data: rows.map(mapTehsil),
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
        hasNextPage: page < Math.ceil(total / pageSize),
        hasPreviousPage: page > 1,
      },
    }
  },
  async listByDistrictId(districtId?: number) {
    const rows = districtId ? await TehsilModel.find({ districtId }).lean().select('-__v').maxTimeMS(30000) : await TehsilModel.find().lean().select('-__v').maxTimeMS(30000)
    if (rows.length) return rows.map(mapTehsil)
    // fallback for legacy schema
    const legacy = districtId
      ? await TehsilModel.find({ district_id: districtId }).lean().select('-__v').maxTimeMS(30000)
      : await TehsilModel.find().lean().select('-__v').maxTimeMS(30000)
    return legacy.map(mapTehsil)
  },
  async findByTehsilId(tehsilId: number) {
    const doc = await TehsilModel.findOne({ tehsilId }).lean().maxTimeMS(30000)
    if (doc) return mapTehsil(doc)
    const legacy = await TehsilModel.findOne({ tehsil_id: tehsilId }).lean().maxTimeMS(30000)
    return legacy ? mapTehsil(legacy) : null
  },
}

export const licenseRepositoryMongo: LicenseRepository = {
  async upsertByApplicantId(applicantId: number, data: Partial<any>) {
    const doc = await LicenseModel.findOneAndUpdate({ applicantId }, data, { upsert: true, new: true })
    return doc.toObject()
  },
  async findActiveByLicenseNumber(licenseNumber: string, dateOfIssue?: Date) {
    if (dateOfIssue) {
      return LicenseModel.findOne({ licenseNumber, dateOfIssue, isActive: true }).lean()
    }
    return LicenseModel.findOne({ licenseNumber, isActive: true }).sort({ dateOfIssue: -1 }).lean()
  },
  async list() {
    return LicenseModel.find().lean()
  },
  async listByApplicantIds(applicantIds: number[]) {
    return LicenseModel.find({ applicantId: { $in: applicantIds } }).lean()
  },
}

export const inspectionReportRepositoryMongo: InspectionReportRepository = {
  async list(filter: Record<string, unknown> = {}) {
    return InspectionReportModel.find(filter).lean()
  },
  async create(payload: Record<string, unknown>) {
    const created = await InspectionReportModel.create(payload)
    return created.toObject()
  },
  async updateByNumericId(numericId: number, updates: Record<string, unknown>) {
    return InspectionReportModel.findOneAndUpdate({ numericId }, updates, { new: true }).lean()
  },
  async deleteByNumericId(numericId: number) {
    await InspectionReportModel.findOneAndDelete({ numericId })
  },
}

export const singleUsePlasticsSnapshotRepositoryMongo: SingleUsePlasticsSnapshotRepository = {
  async findById(id: string) {
    return SingleUsePlasticsSnapshotModel.findOne({ _id: id }).lean()
  },
  async upsertAddItems(id: string, items: any[]) {
    return SingleUsePlasticsSnapshotModel.findOneAndUpdate(
      { _id: id },
      { $addToSet: { plasticItems: { $each: items } } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  },
}

export const competitionRegistrationRepositoryMongo: CompetitionRegistrationRepository = {
  async create(payload: Record<string, unknown>) {
    const created = await CompetitionRegistrationModel.create(payload)
    return created.toObject()
  },
  async findByRegistrationId(registrationId: string) {
    return CompetitionRegistrationModel.findOne({ registrationId }).lean()
  },
}

export const districtPlasticCommitteeDocumentRepositoryMongo: DistrictPlasticCommitteeDocumentRepository = {
  async create(payload: Record<string, unknown>) {
    const created = await DistrictPlasticCommitteeDocumentModel.create(payload)
    return created.toObject()
  },
  async list() {
    return DistrictPlasticCommitteeDocumentModel.find().lean()
  },
}

export const applicationSubmittedRepositoryMongo: ApplicationSubmittedRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await ApplicationSubmittedModel.findOne({ applicantId }).lean()
    if (doc) return mapSubmitted(doc)
    const legacy = await ApplicationSubmittedModel.findOne({ applicant_id: String(applicantId) }).lean()
    return legacy ? mapSubmitted(legacy) : null
  },
  async create(applicantId: number) {
    const created = await ApplicationSubmittedModel.create({ applicantId })
    return mapSubmitted(created.toObject())
  },
  async list() {
    const docs = await ApplicationSubmittedModel.find().lean()
    return docs.map(mapSubmitted)
  },
}

export const applicationAssignmentRepositoryMongo: ApplicationAssignmentRepository = {
  async listByApplicantIds(applicantIds: number[]) {
    const docs = await ApplicationAssignmentModel.find({ applicantId: { $in: applicantIds } }).sort({ createdAt: -1 }).lean()
    if (docs.length) return docs.map(mapAssignment)
    const legacy = await ApplicationAssignmentModel.find({ applicant_id: { $in: applicantIds.map(String) } }).sort({ created_at: -1 }).lean()
    return legacy.map(mapAssignment)
  },
  async findLatestByApplicantId(applicantId: number) {
    const doc = await ApplicationAssignmentModel.findOne({ applicantId }).sort({ createdAt: -1 }).lean()
    if (doc) return mapAssignment(doc)
    const legacy = await ApplicationAssignmentModel.findOne({ applicant_id: String(applicantId) }).sort({ created_at: -1 }).lean()
    return legacy ? mapAssignment(legacy) : null
  },
  async list(filter: Record<string, unknown> = {}) {
    const docs = await ApplicationAssignmentModel.find(filter).sort({ createdAt: -1 }).lean()
    return docs.map(mapAssignment)
  },
  async create(payload: Record<string, unknown>) {
    const created = await ApplicationAssignmentModel.create(payload)
    return mapAssignment(created.toObject())
  },
}

export const applicantDocumentRepositoryMongo: ApplicantDocumentRepository = {
  async listByApplicantId(applicantId: number) {
    const docs = await ApplicantDocumentModel.find({ applicantId }).lean()
    if (docs.length) return docs.map(mapApplicantDocument)
    const legacy = await ApplicantDocumentModel.find({ applicant_id: String(applicantId) }).lean()
    return legacy.map(mapApplicantDocument)
  },
  async list() {
    const docs = await ApplicantDocumentModel.find().lean()
    return docs.map(mapApplicantDocument)
  },
  async create(payload: Record<string, unknown>) {
    const created = await ApplicantDocumentModel.create(payload)
    return mapApplicantDocument(created.toObject())
  },
  async findLatestByApplicantAndDescription(applicantId: number, description: string) {
    const doc = await ApplicantDocumentModel.findOne({ applicantId, documentDescription: description })
      .sort({ createdAt: -1 })
      .lean()
    if (doc) return mapApplicantDocument(doc)
    const legacy = await ApplicantDocumentModel.findOne({
      applicant_id: String(applicantId),
      document_description: description,
    })
      .sort({ created_at: -1 })
      .lean()
    return legacy ? mapApplicantDocument(legacy) : null
  },
}

export const applicantFieldResponseRepositoryMongo: ApplicantFieldResponseRepository = {
  async listByApplicantId(applicantId: number) {
    const docs = await ApplicantFieldResponseModel.find({ applicantId }).lean()
    if (docs.length) return docs.map(mapApplicantFieldResponse)
    const legacy = await ApplicantFieldResponseModel.find({ applicant_id: String(applicantId) }).lean()
    return legacy.map(mapApplicantFieldResponse)
  },
}

export const applicantManualFieldsRepositoryMongo: ApplicantManualFieldsRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await ApplicantManualFieldsModel.findOne({ applicantId }).lean()
    if (doc) return mapApplicantManualFields(doc)
    const legacy = await ApplicantManualFieldsModel.findOne({ applicant_id: String(applicantId) }).lean()
    return legacy ? mapApplicantManualFields(legacy) : null
  },
  async listWithLatLon() {
    const docs = await ApplicantManualFieldsModel.find({
      latitude: { $ne: null },
      longitude: { $ne: null },
    }).lean()
    return docs.map(mapApplicantManualFields)
  },
  async list(filter: Record<string, unknown> = {}) {
    const docs = await ApplicantManualFieldsModel.find(filter).lean()
    return docs.map(mapApplicantManualFields)
  },
}

export const applicantFeeRepositoryMongo: ApplicantFeeRepository = {
  async listByApplicantId(applicantId: number) {
    const docs = await ApplicantFeeModel.find({ applicantId }).sort({ createdAt: -1 }).lean()
    if (docs.length) return docs.map(mapApplicantFee)
    const legacy = await ApplicantFeeModel.find({ applicant_id: String(applicantId) }).sort({ created_at: -1 }).lean()
    return legacy.map(mapApplicantFee)
  },
  async sumFeeByApplicantId(applicantId: number) {
    const feeAgg = await ApplicantFeeModel.aggregate([
      { $match: { applicantId } },
      { $group: { _id: null, total: { $sum: '$feeAmount' } } },
    ])
    return feeAgg[0]?.total || 0
  },
  async countByApplicantId(applicantId: number) {
    return ApplicantFeeModel.countDocuments({ applicantId })
  },
  async aggregateBySettlement() {
    return ApplicantFeeModel.aggregate([
      { $group: { _id: '$isSettled', total: { $sum: '$feeAmount' }, count: { $sum: 1 } } },
    ])
  },
}

export const psidTrackingRepositoryMongo: PSIDTrackingRepository = {
  async listPaidByApplicantId(applicantId: number) {
    const docs = await PSIDTrackingModel.find({ applicantId, paymentStatus: 'PAID' }).lean()
    if (docs.length) return docs.map(mapPSIDTracking)
    const legacy = await PSIDTrackingModel.find({ applicant_id: String(applicantId), payment_status: 'PAID' }).lean()
    return legacy.map(mapPSIDTracking)
  },
  async findByConsumerNumber(consumerNumber: string) {
    const doc = await PSIDTrackingModel.findOne({ consumerNumber }).lean()
    if (doc) return mapPSIDTracking(doc)
    const legacy = await PSIDTrackingModel.findOne({ consumer_number: consumerNumber }).lean()
    return legacy ? mapPSIDTracking(legacy) : null
  },
  async findByConsumerAndDept(consumerNumber: string, deptTransactionId: string) {
    const doc = await PSIDTrackingModel.findOne({ consumerNumber, deptTransactionId }).sort({ createdAt: -1 }).lean()
    if (doc) return mapPSIDTracking(doc)
    const legacy = await PSIDTrackingModel.findOne({
      consumer_number: consumerNumber,
      dept_transaction_id: deptTransactionId,
    })
      .sort({ created_at: -1 })
      .lean()
    return legacy ? mapPSIDTracking(legacy) : null
  },
  async countByApplicantId(applicantId: number) {
    return PSIDTrackingModel.countDocuments({ applicantId })
  },
  async findLatestByApplicantId(applicantId: number) {
    const doc = await PSIDTrackingModel.findOne({ applicantId }).sort({ createdAt: -1 }).lean()
    if (doc) return mapPSIDTracking(doc)
    const legacy = await PSIDTrackingModel.findOne({ applicant_id: String(applicantId) }).sort({ created_at: -1 }).lean()
    return legacy ? mapPSIDTracking(legacy) : null
  },
  async list() {
    const docs = await PSIDTrackingModel.find().lean()
    return docs.map(mapPSIDTracking)
  },
  async create(payload: Record<string, unknown>) {
    const created = await PSIDTrackingModel.create(payload)
    return mapPSIDTracking(created.toObject())
  },
  async updateById(id: string, updates: Record<string, unknown>) {
    const doc = await PSIDTrackingModel.findByIdAndUpdate(id, updates, { new: true }).lean()
    return doc ? mapPSIDTracking(doc) : null
  },
}

export const producerRepositoryMongo: ProducerRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await ProducerModel.findOne({ applicantId }).lean()
    if (doc) return doc
    return ProducerModel.findOne({ applicant_id: String(applicantId) } as any).lean()
  },
  async listByApplicantIds(applicantIds: number[]) {
    const docs = await ProducerModel.find({ applicantId: { $in: applicantIds } }).lean()
    if (docs.length) return docs
    const legacyIds = applicantIds.map(String)
    return ProducerModel.find({ applicant_id: { $in: legacyIds } } as any).lean()
  },
}

export const consumerRepositoryMongo: ConsumerRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await ConsumerModel.findOne({ applicantId }).lean()
    if (doc) return doc
    return ConsumerModel.findOne({ applicant_id: String(applicantId) } as any).lean()
  },
  async listByApplicantIds(applicantIds: number[]) {
    const docs = await ConsumerModel.find({ applicantId: { $in: applicantIds } }).lean()
    if (docs.length) return docs
    const legacyIds = applicantIds.map(String)
    return ConsumerModel.find({ applicant_id: { $in: legacyIds } } as any).lean()
  },
}

export const collectorRepositoryMongo: CollectorRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await CollectorModel.findOne({ applicantId }).lean()
    if (doc) return doc
    return CollectorModel.findOne({ applicant_id: String(applicantId) } as any).lean()
  },
  async listByApplicantIds(applicantIds: number[]) {
    const docs = await CollectorModel.find({ applicantId: { $in: applicantIds } }).lean()
    if (docs.length) return docs
    const legacyIds = applicantIds.map(String)
    return CollectorModel.find({ applicant_id: { $in: legacyIds } } as any).lean()
  },
}

export const recyclerRepositoryMongo: RecyclerRepository = {
  async findByApplicantId(applicantId: number) {
    const doc = await RecyclerModel.findOne({ applicantId }).lean()
    if (doc) return doc
    return RecyclerModel.findOne({ applicant_id: String(applicantId) } as any).lean()
  },
  async listByApplicantIds(applicantIds: number[]) {
    const docs = await RecyclerModel.find({ applicantId: { $in: applicantIds } }).lean()
    if (docs.length) return docs
    const legacyIds = applicantIds.map(String)
    return RecyclerModel.find({ applicant_id: { $in: legacyIds } } as any).lean()
  },
}

export function buildApplicantServiceDeps() {
  return {
    applicantRepo: applicantRepositoryMongo,
    businessProfileRepo: businessProfileRepositoryMongo,
    districtRepo: districtRepositoryMongo,
    tehsilRepo: tehsilRepositoryMongo,
    licenseRepo: licenseRepositoryMongo,
    applicationSubmittedRepo: applicationSubmittedRepositoryMongo,
    applicationAssignmentRepo: applicationAssignmentRepositoryMongo,
    applicantDocumentRepo: applicantDocumentRepositoryMongo,
    applicantFieldResponseRepo: applicantFieldResponseRepositoryMongo,
    applicantManualFieldsRepo: applicantManualFieldsRepositoryMongo,
    applicantFeeRepo: applicantFeeRepositoryMongo,
    psidTrackingRepo: psidTrackingRepositoryMongo,
    producerRepo: producerRepositoryMongo,
    consumerRepo: consumerRepositoryMongo,
    collectorRepo: collectorRepositoryMongo,
    recyclerRepo: recyclerRepositoryMongo,
  }
}
