import { Request, Response } from 'express'
import ExcelJS from 'exceljs'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type { ApplicantRepository, BusinessProfileRepository, ApplicantFeeRepository, PSIDTrackingRepository, DistrictRepository } from '../../../domain/repositories/pmc'
import {
  applicantRepositoryMongo,
  businessProfileRepositoryMongo,
  applicantFeeRepositoryMongo,
  psidTrackingRepositoryMongo,
  districtRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'

type ReportDeps = {
  applicantRepo: ApplicantRepository
  businessProfileRepo: BusinessProfileRepository
  feeRepo: ApplicantFeeRepository
  psidRepo: PSIDTrackingRepository
  districtRepo: DistrictRepository
}

const defaultDeps: ReportDeps = {
  applicantRepo: applicantRepositoryMongo,
  businessProfileRepo: businessProfileRepositoryMongo,
  feeRepo: applicantFeeRepositoryMongo,
  psidRepo: psidTrackingRepositoryMongo,
  districtRepo: districtRepositoryMongo,
}

async function buildWorkbook() {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PMC MERN'
  return workbook
}

export const report = asyncHandler(async (_req: Request, res: Response) => {
  const workbook = await buildWorkbook()
  const sheet = workbook.addWorksheet('Applications')

  sheet.columns = [
    { header: 'Tracking Number', key: 'trackingNumber', width: 20 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'CNIC', key: 'cnic', width: 18 },
    { header: 'Mobile', key: 'mobileNo', width: 15 },
    { header: 'Status', key: 'applicationStatus', width: 15 },
    { header: 'Assigned Group', key: 'assignedGroup', width: 15 },
  ]

  const applicants = await defaultDeps.applicantRepo.list()
  for (const applicant of applicants) {
    sheet.addRow({
      trackingNumber: (applicant as any).trackingNumber,
      name: `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
      cnic: (applicant as any).cnic,
      mobileNo: (applicant as any).mobileNo,
      applicationStatus: (applicant as any).applicationStatus,
      assignedGroup: (applicant as any).assignedGroup,
    })
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"')
  await workbook.xlsx.write(res)
  res.end()
})

export const reportFee = asyncHandler(async (_req: Request, res: Response) => {
  const fees = await defaultDeps.feeRepo.aggregateBySettlement()

  const response = {
    settled: fees.find((f) => f._id === true)?.total || 0,
    unsettled: fees.find((f) => f._id === false)?.total || 0,
    total_fees: fees.reduce((sum, f) => sum + (f.total || 0), 0),
  }

  return res.json(response)
})

export const exportApplicant = asyncHandler(async (_req: Request, res: Response) => {
  const workbook = await buildWorkbook()
  const sheet = workbook.addWorksheet('Applicants')

  sheet.columns = [
    { header: 'Tracking Number', key: 'trackingNumber', width: 20 },
    { header: 'Applicant', key: 'name', width: 25 },
    { header: 'District', key: 'district', width: 20 },
    { header: 'Registration For', key: 'registrationFor', width: 15 },
    { header: 'Status', key: 'applicationStatus', width: 15 },
  ]

  const applicants = await defaultDeps.applicantRepo.list()
  const profiles = await defaultDeps.businessProfileRepo.listByApplicantIds(applicants.map((a: any) => (a as any).numericId))
  const districts = await defaultDeps.districtRepo.list()
  const districtMap = new Map(districts.map((d: any) => [d.districtId, d.districtName]))

  for (const applicant of applicants) {
    const profile = profiles.find((p: any) => (p as any).applicantId === (applicant as any).numericId)
    const districtName = profile?.districtId ? districtMap.get(profile.districtId) : ''
    sheet.addRow({
      trackingNumber: (applicant as any).trackingNumber,
      name: `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
      district: districtName,
      registrationFor: (applicant as any).registrationFor,
      applicationStatus: (applicant as any).applicationStatus,
    })
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="applicants.xlsx"')
  await workbook.xlsx.write(res)
  res.end()
})

export const psidReport = asyncHandler(async (_req: Request, res: Response) => {
  const workbook = await buildWorkbook()
  const sheet = workbook.addWorksheet('PSID')

  sheet.columns = [
    { header: 'PSID', key: 'consumerNumber', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Applicant ID', key: 'applicantId', width: 12 },
  ]

  const psids = await defaultDeps.psidRepo.list()
  for (const psid of psids) {
    sheet.addRow({
      consumerNumber: (psid as any).consumerNumber,
      status: (psid as any).status,
      amount: (psid as any).amountWithinDueDate,
      applicantId: (psid as any).applicantId,
    })
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="psid-report.xlsx"')
  await workbook.xlsx.write(res)
  res.end()
})
