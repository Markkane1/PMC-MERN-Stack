import multer from 'multer'
import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import { parsePaginationParams, paginateResponse } from '../../../infrastructure/utils/pagination'
import { parallelQueriesWithMetadata } from '../../../infrastructure/utils/parallelQueries'
import { InspectionReportModel } from '../../../infrastructure/database/models/pmc/InspectionReport'
import type { InspectionReportRepository, SingleUsePlasticsSnapshotRepository, DistrictRepository } from '../../../domain/repositories/pmc'
import type { UserProfileRepository } from '../../../domain/repositories/accounts'
import {
  inspectionReportRepositoryMongo,
  singleUsePlasticsSnapshotRepositoryMongo,
  districtRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'
import { userProfileRepositoryMongo } from '../../../infrastructure/database/repositories/accounts'
import {
  IMAGE_PDF_EXTENSIONS,
  IMAGE_PDF_MIMETYPES,
  MAX_FILE_SIZE,
  createFileFilter,
  ensureUploadSubDir,
  secureRandomFilename,
} from '../../../interfaces/http/middlewares/upload'

type AuthRequest = Request & { user?: any }

type InspectionDeps = {
  reportRepo: InspectionReportRepository
  snapshotRepo: SingleUsePlasticsSnapshotRepository
  districtRepo: DistrictRepository
  userProfileRepo: UserProfileRepository
}

const defaultDeps: InspectionDeps = {
  reportRepo: inspectionReportRepositoryMongo,
  snapshotRepo: singleUsePlasticsSnapshotRepositoryMongo,
  districtRepo: districtRepositoryMongo,
  userProfileRepo: userProfileRepositoryMongo,
}

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const subDir = file.fieldname === 'affidavit' ? 'media/affidavits' : 'media/inspections'
    const dest = ensureUploadSubDir(subDir)
    cb(null, dest)
  },
  filename: (_req, file, cb) => {
    cb(null, secureRandomFilename(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 3,
    fields: 100,
    fieldSize: 1024 * 1024,
  },
  fileFilter: createFileFilter(IMAGE_PDF_MIMETYPES, IMAGE_PDF_EXTENSIONS),
})

function parseJsonField(value: any, fallback: any) {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
  return value
}

function readField(report: any, ...keys: string[]) {
  for (const key of keys) {
    const value = report?.[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function toDateOnly(value: any) {
  if (!value) return null
  const parsed = new Date(String(value))
  if (!Number.isFinite(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

export const listInspectionReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, pageSize } = parsePaginationParams(req.query)
  const userProfile = req.user?._id ? await defaultDeps.userProfileRepo.findByUserId(String(req.user._id)) : null

  const filter: any = {}
  if (userProfile?.districtId) {
    filter.$or = [
      { districtId: userProfile.districtId },
      { district_id: userProfile.districtId },
      { district_id: String(userProfile.districtId) },
    ]
  }

  const skip = (page - 1) * pageSize
  const { reports, total, districts } = await parallelQueriesWithMetadata({
    reports: InspectionReportModel.find(filter)
      .sort({ inspectionDate: -1, inspection_date: -1, createdAt: -1, created_at: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    total: InspectionReportModel.countDocuments(filter),
    districts: defaultDeps.districtRepo.list(),
  })

  const districtMap = new Map(districts.map((d: any) => [d.districtId, d.districtName]))
  const data = reports.map((r: any) => serializeInspectionReport(r, districtMap))
  return res.json(paginateResponse(data, { page, pageSize, total }))
})

export const getInspectionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const reportId = req.params.id
  // Try to find by _id first, then by numericId
  let report = await InspectionReportModel.findById(reportId).lean()
  if (!report) {
    const asNumber = Number(reportId)
    report = await InspectionReportModel.findOne({
      $or: [
        { numericId: asNumber },
        { numeric_id: asNumber },
        { id: asNumber },
        { id: String(reportId) },
      ],
    } as any).lean()
  }
  
  if (!report) return res.status(404).json({ message: 'Inspection report not found' })
  
  // Get district details if available
  const districtId = Number(readField(report, 'districtId', 'district_id'))
  const districtDoc = Number.isFinite(districtId) ? await defaultDeps.districtRepo.findByDistrictId(districtId) : null
  const districtName = districtDoc ? (districtDoc as any).districtName : undefined
  
  const districtMap = districtName && Number.isFinite(districtId) ? new Map([[districtId, districtName]]) : new Map()
  const data = serializeInspectionReport(report, districtMap)
  return res.json(data)
})

export const createInspectionReport = [
  upload.fields([
    { name: 'affidavit', maxCount: 1 },
    { name: 'confiscation_receipt', maxCount: 1 },
    { name: 'payment_challan', maxCount: 1 },
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const files = req.files as Record<string, Express.Multer.File[]>
    const affidavit = files?.affidavit?.[0]
    const confiscationReceipt = files?.confiscation_receipt?.[0]
    const paymentChallan = files?.payment_challan?.[0]

    const payload: any = {
      businessName: req.body.business_name,
      businessType: req.body.business_type,
      licenseNumber: req.body.license_number,
      violationFound: parseJsonField(req.body.violation_found, []),
      violationType: parseJsonField(req.body.violation_type, []),
      actionTaken: parseJsonField(req.body.action_taken, []),
      plasticBagsConfiscation: Number(req.body.plastic_bags_confiscation || 0),
      confiscationOtherPlastics: parseJsonField(req.body.confiscation_other_plastics, {}),
      totalConfiscation: Number(req.body.total_confiscation || 0),
      otherSingleUseItems: parseJsonField(req.body.other_single_use_items, []),
      latitude: req.body.latitude ? Number(req.body.latitude) : undefined,
      longitude: req.body.longitude ? Number(req.body.longitude) : undefined,
      inspectionDate: req.body.inspection_date ? new Date(req.body.inspection_date) : undefined,
      fineAmount: req.body.fine_amount ? Number(req.body.fine_amount) : undefined,
      fineRecoveryStatus: req.body.fine_recovery_status,
      fineRecoveryDate: req.body.fine_recovery_date ? new Date(req.body.fine_recovery_date) : undefined,
      recoveryAmount: req.body.recovery_amount ? Number(req.body.recovery_amount) : undefined,
      deSealedDate: req.body.de_sealed_date ? new Date(req.body.de_sealed_date) : undefined,
      fineRecoveryBreakup: parseJsonField(req.body.fine_recovery_breakup, null),
      affidavitPath: affidavit ? `media/affidavits/${affidavit.filename}` : undefined,
      confiscationReceiptPath: confiscationReceipt ? `media/inspections/${confiscationReceipt.filename}` : undefined,
      paymentChallanPath: paymentChallan ? `media/inspections/${paymentChallan.filename}` : undefined,
      receiptBookNumber: req.body.receipt_book_number,
      receiptNumber: req.body.receipt_number,
      createdBy: req.user?._id,
    }

    const userProfile = req.user?._id ? await defaultDeps.userProfileRepo.findByUserId(String(req.user._id)) : null
    if (userProfile?.districtId) {
      payload.districtId = userProfile.districtId
    }

    const report = await defaultDeps.reportRepo.create(payload)

    if (Array.isArray(payload.otherSingleUseItems)) {
      const snapshot = await defaultDeps.snapshotRepo.upsertAddItems('single-use-snapshot', payload.otherSingleUseItems)
      if (!(snapshot as any).plasticItems) (snapshot as any).plasticItems = []
    }

    return res.status(201).json(serializeInspectionReport(report))
  }),
]

export const updateInspectionReport = [
  upload.fields([
    { name: 'affidavit', maxCount: 1 },
    { name: 'confiscation_receipt', maxCount: 1 },
    { name: 'payment_challan', maxCount: 1 },
  ]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const files = req.files as Record<string, Express.Multer.File[]>
    const affidavit = files?.affidavit?.[0]
    const confiscationReceipt = files?.confiscation_receipt?.[0]
    const paymentChallan = files?.payment_challan?.[0]

    const payload: any = {
      businessName: req.body.business_name,
      businessType: req.body.business_type,
      licenseNumber: req.body.license_number,
      violationFound: parseJsonField(req.body.violation_found, undefined),
      violationType: parseJsonField(req.body.violation_type, undefined),
      actionTaken: parseJsonField(req.body.action_taken, undefined),
      plasticBagsConfiscation: req.body.plastic_bags_confiscation ? Number(req.body.plastic_bags_confiscation) : undefined,
      confiscationOtherPlastics: parseJsonField(req.body.confiscation_other_plastics, undefined),
      totalConfiscation: req.body.total_confiscation ? Number(req.body.total_confiscation) : undefined,
      otherSingleUseItems: parseJsonField(req.body.other_single_use_items, undefined),
      latitude: req.body.latitude ? Number(req.body.latitude) : undefined,
      longitude: req.body.longitude ? Number(req.body.longitude) : undefined,
      inspectionDate: req.body.inspection_date ? new Date(req.body.inspection_date) : undefined,
      fineAmount: req.body.fine_amount ? Number(req.body.fine_amount) : undefined,
      fineRecoveryStatus: req.body.fine_recovery_status,
      fineRecoveryDate: req.body.fine_recovery_date ? new Date(req.body.fine_recovery_date) : undefined,
      recoveryAmount: req.body.recovery_amount ? Number(req.body.recovery_amount) : undefined,
      deSealedDate: req.body.de_sealed_date ? new Date(req.body.de_sealed_date) : undefined,
      fineRecoveryBreakup: parseJsonField(req.body.fine_recovery_breakup, undefined),
      receiptBookNumber: req.body.receipt_book_number,
      receiptNumber: req.body.receipt_number,
    }

    if (affidavit) payload.affidavitPath = `media/affidavits/${affidavit.filename}`
    if (confiscationReceipt) payload.confiscationReceiptPath = `media/inspections/${confiscationReceipt.filename}`
    if (paymentChallan) payload.paymentChallanPath = `media/inspections/${paymentChallan.filename}`

    const report = await defaultDeps.reportRepo.updateByNumericId(Number(req.params.id), payload)
    if (!report) return res.status(404).json({ message: 'Not found' })

    if (Array.isArray((report as any).otherSingleUseItems)) {
      await defaultDeps.snapshotRepo.upsertAddItems('single-use-snapshot', (report as any).otherSingleUseItems)
    }

    const districts = await defaultDeps.districtRepo.list()
    const districtMap = new Map(districts.map((d: any) => [d.districtId, d.districtName]))
    return res.json(serializeInspectionReport(report, districtMap))
  }),
]

export const deleteInspectionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  await defaultDeps.reportRepo.deleteByNumericId(Number(req.params.id))
  return res.status(204).send()
})

export const allOtherSingleUsePlastics = asyncHandler(async (_req: Request, res: Response) => {
  const snapshot = await defaultDeps.snapshotRepo.findById('single-use-snapshot')
  return res.json((snapshot as any)?.plasticItems || [])
})

export const districtSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summaries = await districtSummaryInternal()
  return res.json(summaries)
})

export const exportAllInspectionsExcel = asyncHandler(async (_req: Request, res: Response) => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Inspections')
  sheet.columns = [
    { header: 'Business Name', key: 'businessName', width: 25 },
    { header: 'Business Type', key: 'businessType', width: 20 },
    { header: 'District', key: 'district', width: 20 },
    { header: 'Inspection Date', key: 'inspectionDate', width: 15 },
  ]

  const reports = await defaultDeps.reportRepo.list()
  const districts = await defaultDeps.districtRepo.list()
  const districtMap = new Map(districts.map((d: any) => [d.districtId, d.districtName]))

  for (const report of reports) {
    sheet.addRow({
      businessName: readField(report, 'businessName', 'business_name') || '',
      businessType: readField(report, 'businessType', 'business_type') || '',
      district: districtMap.get(Number(readField(report, 'districtId', 'district_id')) || 0) || '',
      inspectionDate: toDateOnly(readField(report, 'inspectionDate', 'inspection_date')) || '',
    })
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="inspection-report.xlsx"')
  await workbook.xlsx.write(res)
  res.end()
})

export const exportAllInspectionsPdf = asyncHandler(async (_req: Request, res: Response) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'attachment; filename="inspection-report.pdf"')
  doc.pipe(res)
  doc.fontSize(18).text('Inspection Reports', { align: 'center' })
  doc.moveDown(1.5)

  const reports = await defaultDeps.reportRepo.list()
  const districts = await defaultDeps.districtRepo.list()
  const districtMap = new Map(districts.map((d: any) => [d.districtId, d.districtName]))

  let y = doc.y + 10
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const columns = [left, left + 200, left + 320, left + 430]

  doc.fontSize(11).font('Helvetica-Bold')
  doc.text('Business', columns[0], y)
  doc.text('Type', columns[1], y)
  doc.text('District', columns[2], y)
  doc.text('Date', columns[3], y)
  doc.moveTo(left, y + 16).lineTo(right, y + 16).stroke()
  y += 24

  doc.font('Helvetica')
  for (const report of reports) {
    if (y > doc.page.height - 80) {
      doc.addPage()
      y = doc.page.margins.top
    }
    doc.text(String(readField(report, 'businessName', 'business_name') || ''), columns[0], y, { width: 190 })
    doc.text(String(readField(report, 'businessType', 'business_type') || ''), columns[1], y, { width: 100 })
    doc.text(districtMap.get(Number(readField(report, 'districtId', 'district_id')) || 0) || '', columns[2], y, { width: 100 })
    doc.text(toDateOnly(readField(report, 'inspectionDate', 'inspection_date')) || '', columns[3], y)
    y += 20
  }

  doc.end()
})

export const exportDistrictSummaryExcel = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await districtSummaryInternal()
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('District Summary')
  sheet.columns = [
    { header: 'District', key: 'district', width: 20 },
    { header: 'Total Inspections', key: 'total_inspections', width: 18 },
    { header: 'Total Fine Amount', key: 'total_fine_amount', width: 18 },
  ]
  for (const row of summary) {
    sheet.addRow(row)
  }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="inspection-district-summary.xlsx"')
  await workbook.xlsx.write(res)
  res.end()
})

export const exportDistrictSummaryPdf = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await districtSummaryInternal()
  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'attachment; filename="inspection-district-summary.pdf"')
  doc.pipe(res)
  doc.fontSize(18).text('District Summary', { align: 'center' })
  doc.moveDown(1.5)

  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  let y = doc.y + 10

  doc.fontSize(11).font('Helvetica-Bold')
  doc.text('District', left, y)
  doc.text('Inspections', left + 250, y)
  doc.text('Total Fine (Rs)', left + 360, y)
  doc.moveTo(left, y + 16).lineTo(right, y + 16).stroke()
  y += 24

  doc.font('Helvetica')
  for (const row of summary) {
    if (y > doc.page.height - 80) {
      doc.addPage()
      y = doc.page.margins.top
    }
    doc.text(row.district, left, y, { width: 220 })
    doc.text(String(row.total_inspections), left + 250, y)
    doc.text(String(row.total_fine_amount), left + 360, y)
    y += 20
  }
  doc.end()
})

async function districtSummaryInternal() {
  const [districts, grouped] = await Promise.all([
    defaultDeps.districtRepo.list(),
    InspectionReportModel.aggregate([
      {
        $project: {
          districtKey: { $ifNull: ['$districtId', '$district_id'] },
          fineValue: {
            $convert: {
              input: { $ifNull: ['$fineAmount', '$fine_amount'] },
              to: 'double',
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      { $match: { districtKey: { $ne: null } } },
      {
        $group: {
          _id: '$districtKey',
          total_inspections: { $sum: 1 },
          total_fine_amount: { $sum: '$fineValue' },
        },
      },
    ]),
  ])

  const statsByDistrictId = new Map<number, { total_inspections: number; total_fine_amount: number }>()
  for (const row of grouped as any[]) {
    const districtId = Number((row as any)?._id)
    if (!Number.isFinite(districtId)) continue
    statsByDistrictId.set(districtId, {
      total_inspections: Number((row as any)?.total_inspections || 0),
      total_fine_amount: Number((row as any)?.total_fine_amount || 0),
    })
  }

  return (districts as any[]).map((district: any) => {
    const districtId = Number((district as any)?.districtId ?? (district as any)?.district_id)
    const stats = Number.isFinite(districtId) ? statsByDistrictId.get(districtId) : null
    return {
      district: (district as any).districtName,
      total_inspections: stats?.total_inspections || 0,
      total_fine_amount: stats?.total_fine_amount || 0,
    }
  })
}

function serializeInspectionReport(report: any, districtMap?: Map<number, string>) {
  const districtId = Number(readField(report, 'districtId', 'district_id'))
  return {
    id: readField(report, 'numericId', 'numeric_id', 'id'),
    business_name: readField(report, 'businessName', 'business_name'),
    business_type: readField(report, 'businessType', 'business_type'),
    license_number: readField(report, 'licenseNumber', 'license_number'),
    violation_found: readField(report, 'violationFound', 'violation_found'),
    violation_type: readField(report, 'violationType', 'violation_type'),
    action_taken: readField(report, 'actionTaken', 'action_taken'),
    plastic_bags_confiscation: readField(report, 'plasticBagsConfiscation', 'plastic_bags_confiscation'),
    confiscation_other_plastics: readField(report, 'confiscationOtherPlastics', 'confiscation_other_plastics'),
    total_confiscation: readField(report, 'totalConfiscation', 'total_confiscation'),
    other_single_use_items: readField(report, 'otherSingleUseItems', 'other_single_use_items'),
    latitude: readField(report, 'latitude'),
    longitude: readField(report, 'longitude'),
    inspection_date: toDateOnly(readField(report, 'inspectionDate', 'inspection_date')),
    fine_amount: readField(report, 'fineAmount', 'fine_amount'),
    fine_recovery_status: readField(report, 'fineRecoveryStatus', 'fine_recovery_status'),
    fine_recovery_date: toDateOnly(readField(report, 'fineRecoveryDate', 'fine_recovery_date')),
    recovery_amount: readField(report, 'recoveryAmount', 'recovery_amount'),
    de_sealed_date: toDateOnly(readField(report, 'deSealedDate', 'de_sealed_date')),
    fine_recovery_breakup: readField(report, 'fineRecoveryBreakup', 'fine_recovery_breakup'),
    affidavit: readField(report, 'affidavitPath', 'affidavit')
      ? `/api/pmc/media/${String(readField(report, 'affidavitPath', 'affidavit')).replace('media/', '')}`
      : null,
    confiscation_receipt: readField(report, 'confiscationReceiptPath', 'confiscation_receipt')
      ? `/api/pmc/media/${String(readField(report, 'confiscationReceiptPath', 'confiscation_receipt')).replace('media/', '')}`
      : null,
    payment_challan: readField(report, 'paymentChallanPath', 'payment_challan')
      ? `/api/pmc/media/${String(readField(report, 'paymentChallanPath', 'payment_challan')).replace('media/', '')}`
      : null,
    receipt_book_number: readField(report, 'receiptBookNumber', 'receipt_book_number'),
    receipt_number: readField(report, 'receiptNumber', 'receipt_number'),
    district: districtMap?.get(districtId) || districtId,
    created_at: readField(report, 'createdAt', 'created_at'),
  }
}
