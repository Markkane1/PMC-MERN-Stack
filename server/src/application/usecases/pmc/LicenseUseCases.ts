import { Request, Response } from 'express'
import { logAccess } from '../../services/common/LogService'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { createOrUpdateLicense } from '../../services/pmc/ApplicantService'
import { paginateArray, parsePaginationParams, paginateResponse } from '../../../infrastructure/utils/pagination'
import type {
  ApplicantRepository,
  BusinessProfileRepository,
  LicenseRepository,
  DistrictRepository,
  TehsilRepository,
} from '../../../domain/repositories/pmc'
import {
  applicantRepositoryMongo,
  businessProfileRepositoryMongo,
  licenseRepositoryMongo,
  districtRepositoryMongo,
  tehsilRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'
import { aggregateLicenseList } from '../../../infrastructure/database/aggregations'
import { pdfJobQueueService, buildPdfJobAcceptedResponse } from '../../services/pmc/PdfJobQueueService'
import type { PdfArtifact } from '../../services/pmc/PdfGenerationRuntime'

type AuthRequest = Request & { user?: any }

type LicenseDeps = {
  applicantRepo: ApplicantRepository
  businessProfileRepo: BusinessProfileRepository
  licenseRepo: LicenseRepository
  districtRepo: DistrictRepository
  tehsilRepo: TehsilRepository
}

const defaultDeps: LicenseDeps = {
  applicantRepo: applicantRepositoryMongo,
  businessProfileRepo: businessProfileRepositoryMongo,
  licenseRepo: licenseRepositoryMongo,
  districtRepo: districtRepositoryMongo,
  tehsilRepo: tehsilRepositoryMongo,
}

function getRequesterKeys(req: AuthRequest) {
  const userId = req.user?._id ? String(req.user._id) : req.user?.id ? String(req.user.id) : null
  return userId ? [`user:${userId}`, `ip:${req.ip}`] : [`ip:${req.ip}`]
}

function sendPdfArtifact(res: Response, artifact: PdfArtifact) {
  res.setHeader('Content-Type', artifact.mimeType)
  res.setHeader('Content-Disposition', `attachment; filename="${artifact.filename}"`)
  res.setHeader('Content-Length', artifact.size)
  res.setHeader('X-Generated-At', artifact.generatedAt.toISOString())
  return res.send(artifact.buffer)
}

function sendQueuedPdfResponse(res: Response, jobId: string, status: string, data: Record<string, unknown> = {}) {
  return res.status(202).json({
    ...buildPdfJobAcceptedResponse({
      jobId,
      type: 'license',
      status: status as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    data,
  })
}

function toFiniteNumber(value: unknown): number | null {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function toDateOnly(value: unknown): string | null {
  if (!value) return null
  const parsed = new Date(String(value))
  if (!Number.isFinite(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

async function buildLicensePdfData(applicant: any, license?: any) {
  const numericId = (applicant as any)?.numericId ?? (license as any)?.applicantId

  const businessProfile = numericId
    ? await defaultDeps.businessProfileRepo.findByApplicantId(Number(numericId))
    : null

  const district = businessProfile?.districtId
    ? await defaultDeps.districtRepo.findByDistrictId(businessProfile.districtId)
    : null
  const tehsil = businessProfile?.tehsilId
    ? await defaultDeps.tehsilRepo.findByTehsilId(businessProfile.tehsilId)
    : null

  return {
    license_number:
      (license as any)?.licenseNumber ??
      (license as any)?.license_number ??
      (applicant as any)?.trackingNumber ??
      '',
    license_duration:
      (license as any)?.licenseDuration ??
      (license as any)?.license_duration ??
      '1 Year',
    owner_name:
      (license as any)?.ownerName ??
      (license as any)?.owner_name ??
      `${(applicant as any)?.firstName || ''} ${(applicant as any)?.lastName || ''}`.trim(),
    business_name:
      (license as any)?.businessName ??
      (license as any)?.business_name ??
      businessProfile?.businessName ??
      businessProfile?.name ??
      'N/A',
    address: (license as any)?.address ?? businessProfile?.postalAddress ?? 'N/A',
    cnic_number: (applicant as any)?.cnic,
    district_name: district?.districtName ?? null,
    tehsil_name: tehsil?.tehsilName ?? null,
    date_of_issue:
      toDateOnly((license as any)?.dateOfIssue ?? (license as any)?.date_of_issue) ??
      new Date().toISOString().slice(0, 10),
  }
}

async function respondWithLicensePdfJob(
  req: AuthRequest,
  res: Response,
  pdfData: Awaited<ReturnType<typeof buildLicensePdfData>>
) {
  const result = await pdfJobQueueService.generateOrQueue('license', pdfData, getRequesterKeys(req))

  if (result.mode === 'inline') {
    return sendPdfArtifact(res, result.artifact)
  }

  return res.status(202).json({
    ...buildPdfJobAcceptedResponse(result.job),
    data: {
      licenseNumber: pdfData.license_number,
    },
  })
}

export const generateLicensePdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = req.query.applicant_id as string | undefined
  const trackingNumber = req.query.tracking_number as string | undefined

  let applicant = null
  if (applicantId) {
    applicant = await defaultDeps.applicantRepo.findByNumericId(Number(applicantId))
  } else if (trackingNumber) {
    applicant = await defaultDeps.applicantRepo.findByTrackingNumber(trackingNumber)
  }

  if (!applicant) {
    return res.status(400).json({ error: "Either 'applicant_id' or 'tracking_number' must be provided." })
  }

  await createOrUpdateLicense((applicant as any).numericId)
  const data = await buildLicensePdfData(applicant)

  await logAccess({
    userId: req.user?._id ? String(req.user._id) : undefined,
    username: req.user?.username,
    modelName: 'License',
    objectId: String(data.license_number),
    method: req.method,
    ipAddress: req.ip,
    endpoint: req.originalUrl,
  })

  return respondWithLicensePdfJob(req, res, data)
})

export const licensePdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const licenseNumber = req.query.license_number as string | undefined
  const dateOfIssue = req.query.date_of_issue as string | undefined

  if (!licenseNumber) {
    return res.status(400).send('Missing license_number query parameter.')
  }

  const license = await defaultDeps.licenseRepo.findActiveByLicenseNumber(
    licenseNumber,
    dateOfIssue ? new Date(dateOfIssue) : undefined
  )

  if (!license) {
    return res.status(404).send('No active license found with the given license_number.')
  }

  const applicant = await defaultDeps.applicantRepo.findByNumericId((license as any).applicantId)
  const data = await buildLicensePdfData(applicant, license)

  await logAccess({
    userId: req.user?._id ? String(req.user._id) : undefined,
    username: req.user?.username,
    modelName: 'License',
    objectId: String(licenseNumber),
    method: req.method,
    ipAddress: req.ip,
    endpoint: req.originalUrl,
  })

  return respondWithLicensePdfJob(req, res, data)
})

export const licenseByUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  if (!user) return res.json(paginateArray([], parsePaginationParams(req.query)))

  const pagination = parsePaginationParams(req.query)

  let filter: Record<string, unknown> = {}
  if (user.groups && user.groups.length > 0) {
    filter = {}
  } else {
    const applicants = await defaultDeps.applicantRepo.list({ createdBy: user._id })
    const applicantIds = applicants.map((a: any) => (a as any).numericId)
    filter = applicantIds.length
      ? {
          $or: [
            { applicantId: { $in: applicantIds } },
            { applicant_id: { $in: applicantIds } },
            { applicant_id: { $in: applicantIds.map(String) } },
          ],
        }
      : { _id: null }
  }

  const result = await aggregateLicenseList({
    filter,
    page: pagination.page,
    limit: pagination.limit,
  })

  return res.json(
    paginateResponse(
      result.data.map((license: any) => serializeLicense(license)),
      {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
      }
    )
  )
})

function serializeLicense(
  license: any,
  profilesByApplicantId?: Map<number, any>,
  districtNameById?: Map<number, string>,
  tehsilNameById?: Map<number, string>
) {
  const applicantId = toFiniteNumber(license?.applicantId ?? license?.applicant_id)
  const embeddedProfile = license?.businessProfileDoc || null
  const profile = applicantId !== null ? profilesByApplicantId?.get(applicantId) || embeddedProfile : embeddedProfile
  const districtId = toFiniteNumber(profile?.districtId ?? profile?.district_id)
  const tehsilId = toFiniteNumber(profile?.tehsilId ?? profile?.tehsil_id)
  const embeddedDistrictName = license?.districtDoc?.districtName ?? license?.districtDoc?.district_name ?? null
  const embeddedTehsilName = license?.tehsilDoc?.tehsilName ?? license?.tehsilDoc?.tehsil_name ?? null

  return {
    id: license._id || license.id,
    license_for: license.licenseFor ?? license.license_for,
    license_number: license.licenseNumber ?? license.license_number,
    license_duration: license.licenseDuration ?? license.license_duration,
    owner_name: license.ownerName ?? license.owner_name,
    business_name: license.businessName ?? license.business_name ?? profile?.businessName ?? profile?.business_name ?? profile?.name,
    types_of_plastics: license.typesOfPlastics ?? license.types_of_plastics,
    particulars: license.particulars,
    fee_amount: license.feeAmount ?? license.fee_amount,
    address: license.address ?? profile?.postalAddress ?? profile?.postal_address,
    date_of_issue: toDateOnly(license.dateOfIssue ?? license.date_of_issue),
    applicant_id: applicantId,
    district_name: districtId !== null ? districtNameById?.get(districtId) ?? embeddedDistrictName : embeddedDistrictName,
    tehsil_name: tehsilId !== null ? tehsilNameById?.get(tehsilId) ?? embeddedTehsilName : embeddedTehsilName,
    city_name: profile?.cityTownVillage ?? profile?.city_town_village ?? null,
    is_active: license.isActive ?? license.is_active ?? true,
    created_at: license.createdAt ?? license.created_at,
  }
}
