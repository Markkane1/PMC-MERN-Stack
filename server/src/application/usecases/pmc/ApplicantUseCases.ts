import { Response, Request } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type { AuthRequest } from '../../../interfaces/http/middlewares/auth'
import {
  applicantRepositoryMongo,
  businessProfileRepositoryMongo,
  applicationSubmittedRepositoryMongo,
  districtRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'
import type { ApplicantRepository, BusinessProfileRepository, ApplicationSubmittedRepository, DistrictRepository } from '../../../domain/repositories/pmc'
import {
  assembleApplicantDetail,
  createOrUpdateLicense,
  maybeCreateSubmitted,
  maybeUpdateTrackingNumber,
} from '../../services/pmc/ApplicantService'

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

const legacyAssignedGroupFilter = (value: string | Record<string, unknown>) => ({
  $or: [{ assignedGroup: value }, { assigned_group: value }],
})

const legacyApplicationStatusFilter = (value: string | Record<string, unknown>) => ({
  $or: [{ applicationStatus: value }, { application_status: value }],
})

const legacyNumericIdFilter = (value: Record<string, unknown> | number[] | number) => {
  if (typeof value === 'object' && value && '$in' in value) {
    const ids = (value as any).$in
    return { $or: [{ numericId: { $in: ids } }, { id: { $in: ids.map((v: any) => String(v)) } }] }
  }
  return { $or: [{ numericId: value }, { id: String(value) }] }
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
    return {
      filter: {
        $or: [
          { assignedGroup: { $in: ['LSO', 'APPLICANT'] } },
          { assigned_group: { $in: ['LSO', 'APPLICANT'] } },
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
      filter: {
        $or: [{ assignedGroup: { $in: matchingGroups } }, { assigned_group: { $in: matchingGroups } }],
      },
    }
  }

  return { filter: { createdBy: user._id } }
}

export const listApplicants = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { filter } = await filterByUserGroups(req)
  const applicants = await defaultDeps.applicantRepo.list(filter)
  const data = await Promise.all(applicants.map((a) => assembleApplicantDetail(a)))
  res.json(data)
})

export const getApplicant = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicant = await defaultDeps.applicantRepo.findByNumericId(Number(req.params.id))
  if (!applicant) return res.status(404).json({ message: 'Not found' })
  const data = await assembleApplicantDetail(applicant)
  return res.json(data)
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

  if (userGroups.includes('Super')) {
    const clauses: any[] = []
    const assignedGroup = req.query.assigned_group as string | undefined
    const applicationStatus = req.query.application_status as string | undefined

    if (assignedGroup === 'Submitted') {
      const submitted = await defaultDeps.applicationSubmittedRepo.list()
      const ids = submitted.map((s: any) => (s as any).applicantId).filter(Boolean)
      if (ids.length) {
        clauses.push(legacyNumericIdFilter({ $in: ids }))
      }
    } else if (assignedGroup === 'PMC') {
      clauses.push({
        $or: [
          { assignedGroup: { $in: ['LSO', 'LSM', 'LSM2', 'TL'] } },
          { assigned_group: { $in: ['LSO', 'LSM', 'LSM2', 'TL'] } },
        ],
      })
    } else if (assignedGroup) {
      clauses.push(legacyAssignedGroupFilter(assignedGroup))
    }

    if (applicationStatus) {
      clauses.push(legacyApplicationStatusFilter(applicationStatus))
    }

    const filter = clauses.length ? { $and: clauses } : {}
    const applicants = await defaultDeps.applicantRepo.list(filter)
    const data = await Promise.all(applicants.map((a) => assembleApplicantDetail(a)))
    return res.json(data)
  }

  const { filter } = await filterByUserGroups(req)
  const applicants = await defaultDeps.applicantRepo.list(filter)
  const data = await Promise.all(applicants.map((a) => assembleApplicantDetail(a)))
  return res.json(data)
})

export const listApplicantsMainDO = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  if (!user?.groups?.includes('DO')) {
    return res.status(400).json({ error: 'Not DO Group' })
  }

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

  const applicants = await defaultDeps.applicantRepo.list({ $and: clauses })
  const data = await Promise.all(applicants.map((a) => assembleApplicantDetail(a)))
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
