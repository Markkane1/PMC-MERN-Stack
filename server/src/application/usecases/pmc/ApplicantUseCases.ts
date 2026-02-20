import { Response, Request } from 'express'
import mongoose from 'mongoose'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { logAccess } from '../../services/common/LogService'
import type { AuthRequest } from '../../../interfaces/http/middlewares/auth'
import {
  applicantRepositoryMongo,
  businessProfileRepositoryMongo,
  applicationSubmittedRepositoryMongo,
  districtRepositoryMongo,
  applicantDocumentRepositoryMongo,
  applicantFeeRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'
import type { ApplicantRepository, BusinessProfileRepository, ApplicationSubmittedRepository, DistrictRepository } from '../../../domain/repositories/pmc'
import {
  assembleApplicantDetail,
  assembleApplicantDetailsCompact,
  createOrUpdateLicense,
  maybeCreateSubmitted,
  maybeUpdateTrackingNumber,
} from '../../services/pmc/ApplicantService'
import { parsePaginationParams, paginateResponse } from '../../../infrastructure/utils/pagination'
import { parallelQueriesWithMetadata } from '../../../infrastructure/utils/parallelQueries'
import { cacheManager } from '../../../infrastructure/cache/cacheManager'

type ApplicantUseCaseDeps = {
  applicantRepo: ApplicantRepository
  businessProfileRepo: BusinessProfileRepository
  applicationSubmittedRepo: ApplicationSubmittedRepository
  districtRepo: DistrictRepository
}

const defaultDeps: ApplicantUseCaseDeps = {
  applicantRepo: applicantRepositoryMongo,
  businessProfileRepo: businessProfileRepositoryMongo,
  applicationSubmittedRepo: applicationSubmittedRepositoryMongo,
  districtRepo: districtRepositoryMongo,
}

const TARGET_GROUPS = new Set(['LSO', 'LSM', 'DO', 'TL', 'MO', 'LSM2', 'DEO', 'DG', 'Download License'])

const legacyAssignedGroupFilter = (value: string | Record<string, unknown>) => {
  if (typeof value === 'object' && value && '$in' in value) {
    const values = Array.isArray((value as any).$in)
      ? (value as any).$in.map((v: unknown) => String(v))
      : []
    return {
      $or: [
        { assignedGroup: { $in: values } },
        { assigned_group: { $in: values } },
      ],
    }
  }
  const normalizedValue = String(value)
  return {
    $or: [{ assignedGroup: normalizedValue }, { assigned_group: normalizedValue }],
  }
}

const legacyApplicationStatusFilter = (value: string | Record<string, unknown>) => {
  if (typeof value === 'object' && value && '$in' in value) {
    const values = Array.isArray((value as any).$in)
      ? (value as any).$in.map((v: unknown) => String(v))
      : []
    return {
      $or: [
        { applicationStatus: { $in: values } },
        { application_status: { $in: values } },
      ],
    }
  }
  const normalizedValue = String(value)
  return {
    $or: [
      { applicationStatus: normalizedValue },
      { application_status: normalizedValue },
    ],
  }
}

const legacyNumericIdFilter = (value: Record<string, unknown> | number[] | number) => {
  if (typeof value === 'object' && value && '$in' in value) {
    const rawIds = Array.isArray((value as any).$in) ? (value as any).$in : []
    const numericIds = rawIds.map((v: any) => Number(v)).filter((v: number) => Number.isFinite(v))
    const stringIds = rawIds.map((v: any) => String(v))
    return {
      $or: [
        { numericId: { $in: numericIds } },
        { id: { $in: stringIds } },
        { numeric_id: { $in: numericIds } },
      ],
    }
  }

  if (Array.isArray(value)) {
    const numericIds = value.map((v: any) => Number(v)).filter((v: number) => Number.isFinite(v))
    const stringIds = value.map((v: any) => String(v))
    return {
      $or: [
        { numericId: { $in: numericIds } },
        { id: { $in: stringIds } },
        { numeric_id: { $in: numericIds } },
      ],
    }
  }

  const numericId = Number(value)
  const stringId = String(value)
  return {
    $or: [
      { numericId: Number.isFinite(numericId) ? numericId : -1 },
      { id: stringId },
      { numeric_id: Number.isFinite(numericId) ? numericId : -1 },
    ],
  }
}

async function getSubmittedApplicantIds(): Promise<number[]> {
  const cacheKey = 'applicants:submitted-ids'
  const cached = await cacheManager.get<number[]>(cacheKey)
  if (Array.isArray(cached) && cached.length) {
    return cached
  }

  const submitted = await defaultDeps.applicationSubmittedRepo.list()
  let ids = submitted
    .map((s: any) => Number((s as any).applicantId))
    .filter((id: number) => Number.isFinite(id))

  // Fallback for legacy rows where only applicant_id exists and may not map through schema.
  if (!ids.length) {
    const raw = await mongoose.connection.db
      ?.collection('applicationsubmitteds')
      .find({}, { projection: { applicantId: 1, applicant_id: 1 } })
      .toArray()
    ids = (raw || [])
      .map((row: any) => Number(row?.applicantId ?? row?.applicant_id))
      .filter((id: number) => Number.isFinite(id))
  }

  const uniqueIds = Array.from(new Set(ids))
  await cacheManager.set(cacheKey, uniqueIds, { ttl: 300 })
  return uniqueIds
}

async function filterByUserGroups(req: AuthRequest) {
  const user = req.user
  if (!user) return { filter: { createdBy: null } }

  const userGroups: string[] = user.groups || []
  const matchingGroups = userGroups.filter((g) => TARGET_GROUPS.has(g))

  if (userGroups.includes('Super')) {
    const clauses: any[] = []
    if (req.query.assigned_group) {
      clauses.push(legacyAssignedGroupFilter(req.query.assigned_group as string))
    }
    if (req.query.application_status) {
      clauses.push(legacyApplicationStatusFilter(req.query.application_status as string))
    }
    return { filter: clauses.length ? { $and: clauses } : {} }
  }

  if (matchingGroups.includes('LSO') && user.username?.toLowerCase().startsWith('lso.')) {
    // Extract suffix from username (e.g., "lso.001" → "001")
    const parts = user.username.split('.')
    const suffix = parts[1] ? parseInt(parts[1], 10) : null
    if (!suffix && suffix !== 0) {
      // Invalid LSO username format, restrict to this user's applicants
      return { filter: { createdBy: user._id } }
    }

    // 3-way modulo partitioning: LSO user with suffix N gets applicants where numericId % 3 == N % 3
    const moduloValue = suffix % 3

    return {
      filter: {
        $and: [
          legacyAssignedGroupFilter({ $in: ['LSO', 'APPLICANT'] }),
          {
            $expr: {
              $eq: [{ $mod: [{ $ifNull: ['$numericId', 0] }, 3] }, moduloValue],
            },
          },
        ],
      },
    }
  }

  if (matchingGroups.includes('DO') && user.username?.toLowerCase().startsWith('do.')) {
    const parts = user.username.split('.')
    const districtShort = parts[1] ? parts[1].toUpperCase() : null
    if (!districtShort) return { filter: { _id: null } }

    const district = await defaultDeps.districtRepo.findByShortName(districtShort)
    if (!district) return { filter: { _id: null } }

    const profiles = await defaultDeps.businessProfileRepo.listByDistrictId(district.districtId)
    const applicantIds = profiles.map((p: any) => p.applicantId).filter(Boolean)

    return {
      filter: {
        $and: [legacyAssignedGroupFilter('DO'), legacyNumericIdFilter({ $in: applicantIds })],
      },
    }
  }

  if (matchingGroups.length > 0) {
    return {
      filter: legacyAssignedGroupFilter({ $in: matchingGroups }),
    }
  }

  return { filter: { createdBy: user._id } }
}

export const listApplicants = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { filter } = await filterByUserGroups(req)
  
  // Parse pagination parameters (page and pageSize from query)
  const { page, pageSize } = parsePaginationParams(req.query)
  
  // Use paginated repository method
  const result = await defaultDeps.applicantRepo.listPaginated(filter, page, pageSize)
  
  // Assemble details for paginated data
  const data = await Promise.all(result.data.map((a) => assembleApplicantDetail(a)))
  
  // Return paginated response
  res.json(paginateResponse(data, result.pagination))
})

export const getApplicant = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = Number(req.params.id)
  const cacheKey = `applicant:${applicantId}:detail`

  // Try cache first
  const cached = await cacheManager.get<any>(cacheKey)
  if (cached) {
    res.set('X-Cache', 'HIT')
    console.log(`✅ Cache HIT: applicant ${applicantId}`)
    return res.json(cached)
  }

  // Cache miss
  res.set('X-Cache', 'MISS')
  console.log(`❌ Cache MISS: applicant ${applicantId}`)

  // Fetch applicant, documents, and fees in parallel
  const result = await parallelQueriesWithMetadata({
    applicant: defaultDeps.applicantRepo.findByNumericId(applicantId),
    documents: applicantDocumentRepositoryMongo.listByApplicantId(applicantId),
    fees: applicantFeeRepositoryMongo.listByApplicantId(applicantId),
  })
  
  if (!result.applicant) {
    return res.status(404).json({ message: 'Not found' })
  }
  
  const data = await assembleApplicantDetail(result.applicant)
  
  // Include documents and fees in response
  const responseData = {
    ...data,
    documents: result.documents || [],
    fees: result.fees || [],
  }

  // Store in cache (10 minute TTL for user data)
  await cacheManager.set(cacheKey, responseData, { ttl: 600 })

  return res.json(responseData)
})

export const createApplicant = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payload: any = mapApplicantPayload(req.body)
  payload.createdBy = req.user?._id

  const applicant = await defaultDeps.applicantRepo.create(payload)

  if ((applicant as any).applicationStatus === 'Submitted') {
    await defaultDeps.applicantRepo.updateOne(
      { _id: (applicant as any)._id, $or: [{ assignedGroup: null }, { assignedGroup: 'APPLICANT' }] },
      { assignedGroup: 'LSO' }
    )
    await maybeCreateSubmitted((applicant as any).numericId)
  }

  await maybeUpdateTrackingNumber((applicant as any).numericId)

  const data = await assembleApplicantDetail(applicant as any)
  return res.status(201).json(data)
})

export const updateApplicant = asyncHandler(async (req: AuthRequest, res: Response) => {
  const payload: any = mapApplicantPayload(req.body)
  delete payload.trackingHash

  const applicant = await defaultDeps.applicantRepo.updateByNumericId(Number(req.params.id), payload)
  if (!applicant) return res.status(404).json({ message: 'Not found' })

  if ((applicant as any).applicationStatus === 'Submitted') {
    await defaultDeps.applicantRepo.updateOne(
      { _id: (applicant as any)._id, $or: [{ assignedGroup: null }, { assignedGroup: 'APPLICANT' }] },
      { assignedGroup: 'LSO' }
    )
    await maybeCreateSubmitted((applicant as any).numericId)
  }

  await maybeUpdateTrackingNumber((applicant as any).numericId)
  await createOrUpdateLicense((applicant as any).numericId, req.user?._id)

  const data = await assembleApplicantDetail(applicant as any)
  return res.json(data)
})

export const deleteApplicant = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.groups?.includes('Super')) {
    return res.status(403).json({ detail: 'You do not have permission to delete this record.' })
  }
  await defaultDeps.applicantRepo.deleteByNumericId(Number(req.params.id))
  return res.status(204).send()
})

export const listApplicantsMain = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  const userGroups = user?.groups || []
  if (!user) return res.json([])
  const compactMode = ['1', 'true', 'yes'].includes(String(req.query.compact || '').toLowerCase())

  if (userGroups.includes('Super')) {
    const clauses: any[] = []
    const assignedGroup = req.query.assigned_group as string | undefined
    const applicationStatus = req.query.application_status as string | undefined

    const normalizedAssignedGroup = assignedGroup?.trim().toLowerCase()

    if (normalizedAssignedGroup === 'submitted') {
      const ids = await getSubmittedApplicantIds()
      if (ids.length) {
        clauses.push(legacyNumericIdFilter({ $in: ids }))
      } else {
        clauses.push({ _id: null })
      }
    } else if (normalizedAssignedGroup === 'pmc') {
      clauses.push(legacyAssignedGroupFilter({ $in: ['LSO', 'LSM', 'LSM2', 'TL'] }))
    } else if (assignedGroup) {
      clauses.push(legacyAssignedGroupFilter(assignedGroup))
    }

    if (applicationStatus) {
      clauses.push(legacyApplicationStatusFilter(applicationStatus))
    }

    const filter = clauses.length ? { $and: clauses } : {}
    const page = Number(req.query.page || 1)
    const limit = Number(req.query.page_size || req.query.limit || 200)
    const result = await defaultDeps.applicantRepo.listPaginated(filter, page, limit, { createdAt: -1 })
    const data = compactMode
      ? await assembleApplicantDetailsCompact(result.data as any[])
      : await Promise.all(result.data.map((a: any) => assembleApplicantDetail(a)))
    res.setHeader('X-Total-Count', String(result.pagination.total))
    await logAccess({
      userId: req.user?._id ? String(req.user._id) : undefined,
      username: req.user?.username,
      modelName: 'ApplicantDetail',
      objectId: 'LIST_MAIN',
      method: req.method,
      ipAddress: req.ip,
      endpoint: req.originalUrl,
    })
    return res.json(data)
  }

  const { filter } = await filterByUserGroups(req)
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.page_size || req.query.limit || 200)
  const result = await defaultDeps.applicantRepo.listPaginated(filter, page, limit, { createdAt: -1 })
  const data = compactMode
    ? await assembleApplicantDetailsCompact(result.data as any[])
    : await Promise.all(result.data.map((a: any) => assembleApplicantDetail(a)))
  res.setHeader('X-Total-Count', String(result.pagination.total))
  await logAccess({
    userId: req.user?._id ? String(req.user._id) : undefined,
    username: req.user?.username,
    modelName: 'ApplicantDetail',
    objectId: 'LIST_MAIN_DO',
    method: req.method,
    ipAddress: req.ip,
    endpoint: req.originalUrl,
  })
  return res.json(data)
})

export const listApplicantsMainDO = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  if (!user?.groups?.includes('DO')) {
    return res.status(400).json({ error: 'Not DO Group' })
  }
  const compactMode = ['1', 'true', 'yes'].includes(String(req.query.compact || '').toLowerCase())

  const parts = user.username?.split('.') || []
  const districtShort = parts[1] ? parts[1].toUpperCase() : null
  if (!districtShort) {
    return res.status(400).json({ error: 'Invalid username format. District short name missing.' })
  }

  const district = await defaultDeps.districtRepo.findByShortName(districtShort)
  if (!district) {
    return res.status(400).json({ error: 'No matching district found for the user.' })
  }

  const profiles = await defaultDeps.businessProfileRepo.listByDistrictId(district.districtId)
  const applicantIds = profiles.map((p: any) => p.applicantId).filter(Boolean)

  const clauses: any[] = [legacyNumericIdFilter({ $in: applicantIds })]
  if (req.query.assigned_group) {
    clauses.push(legacyAssignedGroupFilter(req.query.assigned_group as string))
  }
  if (req.query.application_status) {
    clauses.push(legacyApplicationStatusFilter(req.query.application_status as string))
  }

  const page = Number(req.query.page || 1)
  const limit = Number(req.query.page_size || req.query.limit || 200)
  const result = await defaultDeps.applicantRepo.listPaginated({ $and: clauses }, page, limit, { createdAt: -1 })
  const data = compactMode
    ? await assembleApplicantDetailsCompact(result.data as any[])
    : await Promise.all(result.data.map((a: any) => assembleApplicantDetail(a)))
  const totalCount = await defaultDeps.applicantRepo.count({ $and: clauses })
  res.setHeader('X-Total-Count', String(totalCount))
  await logAccess({
    userId: req.user?._id ? String(req.user._id) : undefined,
    username: req.user?.username,
    modelName: 'ApplicantDetail',
    objectId: 'LIST_MAIN_DO',
    method: req.method,
    ipAddress: req.ip,
    endpoint: req.originalUrl,
  })
  return res.json(data)
})

function mapApplicantPayload(body: any) {
  return {
    registrationFor: body.registration_for ?? body.registrationFor,
    firstName: body.first_name ?? body.firstName,
    lastName: body.last_name ?? body.lastName,
    applicantDesignation: body.applicant_designation ?? body.applicantDesignation,
    gender: body.gender,
    cnic: body.cnic,
    email: body.email,
    mobileOperator: body.mobile_operator ?? body.mobileOperator,
    mobileNo: body.mobile_no ?? body.mobileNo,
    applicationStatus: body.application_status ?? body.applicationStatus,
    trackingNumber: body.tracking_number ?? body.trackingNumber,
    remarks: body.remarks,
    assignedGroup: body.assigned_group ?? body.assignedGroup,
  }
}

