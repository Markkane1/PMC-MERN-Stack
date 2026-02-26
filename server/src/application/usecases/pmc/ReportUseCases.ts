import { Request, Response } from 'express'
import ExcelJS from 'exceljs'
import mongoose from 'mongoose'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type { ApplicantRepository, BusinessProfileRepository, ApplicantFeeRepository, PSIDTrackingRepository, DistrictRepository } from '../../../domain/repositories/pmc'
import {
  applicantRepositoryMongo,
  businessProfileRepositoryMongo,
  applicantFeeRepositoryMongo,
  psidTrackingRepositoryMongo,
  districtRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'
import { cacheManager } from '../../../infrastructure/cache/cacheManager'

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

type FeeTimelineRow = {
  till: string
  fee_received: number
  fee_verified: number
  fee_unverified: number
}

let feeTimelineInFlight: Promise<FeeTimelineRow[]> | null = null

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
  const startedAt = Date.now()
  const cacheKey = 'reports:fee-timeline:v2'
  const cached = await cacheManager.get<FeeTimelineRow[]>(cacheKey)
  if (cached) {
    res.setHeader('X-Report-Cache', 'HIT')
    res.setHeader('X-Handler-Time-Ms', String(Date.now() - startedAt))
    return res.json(cached)
  }
  res.setHeader('X-Report-Cache', 'MISS')

  if (!feeTimelineInFlight) {
    feeTimelineInFlight = (async () => {
      const feeCollection = mongoose.connection.db?.collection('ApplicantFee')
      let timeline: FeeTimelineRow[] = []

      if (feeCollection) {
        const grouped = await feeCollection
          .aggregate([
            {
              $addFields: {
                normalizedAmount: {
                  $convert: {
                    input: { $ifNull: ['$feeAmount', '$fee_amount'] },
                    to: 'double',
                    onError: 0,
                    onNull: 0,
                  },
                },
                normalizedSettled: { $ifNull: ['$isSettled', '$is_settled'] },
                normalizedCreatedAt: {
                  $convert: {
                    input: { $ifNull: ['$createdAt', '$created_at'] },
                    to: 'date',
                    onError: null,
                    onNull: null,
                  },
                },
              },
            },
            { $match: { normalizedCreatedAt: { $ne: null } } },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$normalizedCreatedAt',
                  },
                },
                fee_received: { $sum: '$normalizedAmount' },
                fee_verified: {
                  $sum: {
                    $cond: [{ $eq: ['$normalizedSettled', true] }, '$normalizedAmount', 0],
                  },
                },
                fee_unverified: {
                  $sum: {
                    $cond: [{ $eq: ['$normalizedSettled', true] }, 0, '$normalizedAmount'],
                  },
                },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray()

        let runningReceived = 0
        let runningVerified = 0
        let runningUnverified = 0
        timeline = (grouped as any[]).map((row) => {
          runningReceived += Number(row?.fee_received || 0)
          runningVerified += Number(row?.fee_verified || 0)
          runningUnverified += Number(row?.fee_unverified || 0)
          return {
            till: String(row?._id || ''),
            fee_received: runningReceived,
            fee_verified: runningVerified,
            fee_unverified: runningUnverified,
          }
        })
      }

      if (!timeline.length) {
        const fees = await defaultDeps.feeRepo.aggregateBySettlement()
        const settled = fees.find((f) => f._id === true)?.total || 0
        const unsettled = fees.find((f) => f._id === false)?.total || 0
        const total = fees.reduce((sum, f) => sum + (f.total || 0), 0)
        timeline = [
          {
            till: new Date().toISOString().slice(0, 10),
            fee_received: total,
            fee_verified: settled,
            fee_unverified: unsettled,
          },
        ]
      }

      const payload = timeline.slice(-16)
      await cacheManager.set(cacheKey, payload, { ttl: 300 })
      return payload
    })()
      .finally(() => {
        feeTimelineInFlight = null
      })
  }

  const payload = await feeTimelineInFlight
  res.setHeader('X-Report-Coalesced', '1')
  res.setHeader('X-Handler-Time-Ms', String(Date.now() - startedAt))
  return res.json(payload)
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
  const profileByApplicantId = new Map<number, any>()
  for (const profile of profiles as any[]) {
    const applicantId = Number((profile as any)?.applicantId ?? (profile as any)?.applicant_id)
    if (!Number.isFinite(applicantId) || profileByApplicantId.has(applicantId)) continue
    profileByApplicantId.set(applicantId, profile)
  }

  for (const applicant of applicants) {
    const applicantId = Number((applicant as any)?.numericId ?? (applicant as any)?.id)
    const profile = Number.isFinite(applicantId) ? profileByApplicantId.get(applicantId) : null
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
