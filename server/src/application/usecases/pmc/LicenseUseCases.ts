import { Request, Response } from 'express'
import PDFDocument from 'pdfkit'
import { logAccess } from '../../services/common/LogService'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { createOrUpdateLicense } from '../../services/pmc/ApplicantService'
import type { ApplicantRepository, BusinessProfileRepository, LicenseRepository, DistrictRepository, TehsilRepository } from '../../../domain/repositories/pmc'
import {
  applicantRepositoryMongo,
  businessProfileRepositoryMongo,
  licenseRepositoryMongo,
  districtRepositoryMongo,
  tehsilRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'

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

function buildLicensePdf(res: Response, data: Record<string, any>) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'attachment; filename="license.pdf"')
  doc.pipe(res)

  const pageWidth = doc.page.width
  const pageHeight = doc.page.height
  const left = doc.page.margins.left
  const right = pageWidth - doc.page.margins.right

  doc.rect(left, 30, right - left, pageHeight - 60).lineWidth(1).stroke()

  doc.fontSize(22).text('Plastic Management License', left, 48, { align: 'center' })
  doc.moveDown(1.5)

  const startY = 110
  const colGap = 30
  const colWidth = (right - left - colGap) / 2

  const rows: Array<[string, string]> = [
    ['License Number', data.license_number || ''],
    ['License Duration', data.license_duration || ''],
    ['Owner Name', data.owner_name || ''],
    ['Business Name', data.business_name || ''],
    ['CNIC', data.cnic_number || ''],
    ['Address', data.address || ''],
    ['District', data.district_name || ''],
    ['Tehsil', data.tehsil_name || ''],
    ['Date of Issue', data.date_of_issue || ''],
  ]

  doc.fontSize(12)
  let y = startY
  rows.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? left + 20 : left + colWidth + colGap + 20
    if (index % 2 === 0 && index > 0) y += 26
    doc.font('Helvetica-Bold').text(`${label}:`, x, y, { width: 110 })
    doc.font('Helvetica').text(value, x + 120, y, { width: colWidth - 120 })
  })

  doc.moveTo(left + 20, pageHeight - 120).lineTo(left + 300, pageHeight - 120).stroke()
  doc.fontSize(10).text('Authorized Signature', left + 20, pageHeight - 110)

  doc.end()
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

  const businessProfile = await defaultDeps.businessProfileRepo.findByApplicantId((applicant as any).numericId)
  const district = businessProfile?.districtId
    ? await defaultDeps.districtRepo.findByDistrictId(businessProfile.districtId)
    : null
  const tehsil = businessProfile?.tehsilId
    ? await defaultDeps.tehsilRepo.findByTehsilId(businessProfile.tehsilId)
    : null

  const data = {
    license_number: (applicant as any).trackingNumber,
    license_duration: '1 Year',
    owner_name: `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
    business_name: businessProfile?.businessName || businessProfile?.name || 'N/A',
    address: businessProfile?.postalAddress || 'N/A',
    cnic_number: (applicant as any).cnic,
    district_name: district?.districtName,
    tehsil_name: tehsil?.tehsilName,
    date_of_issue: new Date().toISOString().slice(0, 10),
  }

  await logAccess({
    userId: req.user?._id ? String(req.user._id) : undefined,
    username: req.user?.username,
    modelName: 'License',
    objectId: String(data.license_number),
    method: req.method,
    ipAddress: req.ip,
    endpoint: req.originalUrl,
  })
  return buildLicensePdf(res, data)
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
  const businessProfile = applicant
    ? await defaultDeps.businessProfileRepo.findByApplicantId((applicant as any).numericId)
    : null

  const district = businessProfile?.districtId
    ? await defaultDeps.districtRepo.findByDistrictId(businessProfile.districtId)
    : null
  const tehsil = businessProfile?.tehsilId
    ? await defaultDeps.tehsilRepo.findByTehsilId(businessProfile.tehsilId)
    : null

  const data = {
    license_number: (license as any).licenseNumber ?? (license as any).license_number,
    license_duration: (license as any).licenseDuration ?? (license as any).license_duration,
    owner_name: (license as any).ownerName ?? (license as any).owner_name,
    business_name: (license as any).businessName ?? (license as any).business_name,
    address: (license as any).address,
    cnic_number: (applicant as any)?.cnic,
    district_name: district?.districtName,
    tehsil_name: tehsil?.tehsilName,
    date_of_issue: toDateOnly((license as any).dateOfIssue ?? (license as any).date_of_issue),
  }

  await logAccess({
    userId: req.user?._id ? String(req.user._id) : undefined,
    username: req.user?.username,
    modelName: 'License',
    objectId: String(licenseNumber),
    method: req.method,
    ipAddress: req.ip,
    endpoint: req.originalUrl,
  })
  return buildLicensePdf(res, data)
})

export const licenseByUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  if (!user) return res.json([])

  const districtsPromise = defaultDeps.districtRepo.list()
  const tehsilsPromise = defaultDeps.tehsilRepo.list()

  let licenses: any[] = []
  if (user.groups && user.groups.length > 0) {
    licenses = await defaultDeps.licenseRepo.list()
  } else {
    const applicants = await defaultDeps.applicantRepo.list({ createdBy: user._id })
    const applicantIds = applicants.map((a: any) => (a as any).numericId)
    licenses = await defaultDeps.licenseRepo.listByApplicantIds(applicantIds)
  }

  const applicantIds = Array.from(
    new Set(
      licenses
        .map((license) => toFiniteNumber((license as any)?.applicantId ?? (license as any)?.applicant_id))
        .filter((id): id is number => Number.isFinite(id))
    )
  )
  const profilesPromise = applicantIds.length
    ? defaultDeps.businessProfileRepo.listByApplicantIds(applicantIds)
    : Promise.resolve([])

  const [profiles, districts, tehsils] = await Promise.all([
    profilesPromise,
    districtsPromise,
    tehsilsPromise,
  ])

  const profilesByApplicantId = new Map<number, any>()
  for (const profile of profiles as any[]) {
    const applicantId = toFiniteNumber((profile as any)?.applicantId ?? (profile as any)?.applicant_id)
    if (applicantId !== null) profilesByApplicantId.set(applicantId, profile)
  }

  const districtNameById = new Map<number, string>()
  for (const district of districts as any[]) {
    const districtId = toFiniteNumber((district as any)?.districtId ?? (district as any)?.district_id)
    if (districtId !== null) {
      districtNameById.set(districtId, String((district as any)?.districtName ?? (district as any)?.district_name ?? ''))
    }
  }

  const tehsilNameById = new Map<number, string>()
  for (const tehsil of tehsils as any[]) {
    const tehsilId = toFiniteNumber((tehsil as any)?.tehsilId ?? (tehsil as any)?.tehsil_id)
    if (tehsilId !== null) {
      tehsilNameById.set(tehsilId, String((tehsil as any)?.tehsilName ?? (tehsil as any)?.tehsil_name ?? ''))
    }
  }

  return res.json(
    licenses.map((license: any) =>
      serializeLicense(
        license,
        profilesByApplicantId,
        districtNameById,
        tehsilNameById
      )
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
  const profile = applicantId !== null ? profilesByApplicantId?.get(applicantId) : null
  const districtId = toFiniteNumber(profile?.districtId ?? profile?.district_id)
  const tehsilId = toFiniteNumber(profile?.tehsilId ?? profile?.tehsil_id)

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
    district_name: districtId !== null ? districtNameById?.get(districtId) ?? null : null,
    tehsil_name: tehsilId !== null ? tehsilNameById?.get(tehsilId) ?? null : null,
    city_name: profile?.cityTownVillage ?? profile?.city_town_village ?? null,
    is_active: license.isActive ?? license.is_active ?? true,
    created_at: license.createdAt ?? license.created_at,
  }
}

