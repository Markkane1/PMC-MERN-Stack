import { Request, Response } from 'express'
import PDFDocument from 'pdfkit'
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

export const generateLicensePdf = asyncHandler(async (req: Request, res: Response) => {
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

  return buildLicensePdf(res, data)
})

export const licensePdf = asyncHandler(async (req: Request, res: Response) => {
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
    license_number: (license as any).licenseNumber,
    license_duration: (license as any).licenseDuration,
    owner_name: (license as any).ownerName,
    business_name: (license as any).businessName,
    address: (license as any).address,
    cnic_number: (applicant as any)?.cnic,
    district_name: district?.districtName,
    tehsil_name: tehsil?.tehsilName,
    date_of_issue: (license as any).dateOfIssue?.toISOString().slice(0, 10),
  }

  return buildLicensePdf(res, data)
})

export const licenseByUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  if (!user) return res.json([])

  if (user.groups && user.groups.length > 0) {
    const licenses = await defaultDeps.licenseRepo.list()
    return res.json(licenses.map((l: any) => serializeLicense(l)))
  }

  const applicants = await defaultDeps.applicantRepo.list({ createdBy: user._id })
  const applicantIds = applicants.map((a: any) => (a as any).numericId)
  const licenses = await defaultDeps.licenseRepo.listByApplicantIds(applicantIds)
  return res.json(licenses.map((l: any) => serializeLicense(l)))
})

function serializeLicense(license: any) {
  return {
    id: license._id || license.id,
    license_for: license.licenseFor,
    license_number: license.licenseNumber,
    license_duration: license.licenseDuration,
    owner_name: license.ownerName,
    business_name: license.businessName,
    types_of_plastics: license.typesOfPlastics,
    particulars: license.particulars,
    fee_amount: license.feeAmount,
    address: license.address,
    date_of_issue: license.dateOfIssue ? license.dateOfIssue.toISOString().slice(0, 10) : null,
    applicant_id: license.applicantId,
    is_active: license.isActive,
    created_at: license.createdAt,
  }
}
