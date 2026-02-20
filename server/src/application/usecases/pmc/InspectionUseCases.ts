import multer from 'multer'
import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import { parsePaginationParams, paginateResponse } from '../../../infrastructure/utils/pagination'
import { parallelQueriesWithMetadata } from '../../../infrastructure/utils/parallelQueries'
import { InspectionReportModel } from '../../../infrastructure/database/models/pmc/InspectionReport'
import { DistrictModel } from '../../../infrastructure/database/models/pmc/District'
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

export const listInspectionReports = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, pageSize } = parsePaginationParams(req.query)
  const userProfile = req.user?._id ? await defaultDeps.userProfileRepo.findByUserId(String(req.user._id)) : null

  const filter: any = {}
  if (userProfile?.districtId) {
    filter.districtId = userProfile.districtId
  }

  // Parallel fetch of reports and districts
  const { reports, districts } = await parallelQueriesWithMetadata({
    reports: defaultDeps.reportRepo.list(filter),
    districts: defaultDeps.districtRepo.list(),
  })

  // Manual pagination
  const skip = (page - 1) * pageSize
  const paginated = reports.slice(skip, skip + pageSize)
  
  const districtMap = new Map(districts.map((d: any) => [d.districtId, d.districtName]))
  const data = paginated.map((r: any) => serializeInspectionReport(r, districtMap))
  return res.json(paginateResponse(data, { page, pageSize, total: reports.length }))
})

export const getInspectionReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const reportId = req.params.id
  // Try to find by _id first, then by numericId
  let report = await InspectionReportModel.findById(reportId).lean()
  if (!report) {
    report = await InspectionReportModel.findOne({ numericId: Number(reportId) }).lean()
  }
  
  if (!report) return res.status(404).json({ message: 'Inspection report not found' })
  
  // Get district details if available
  const districtDoc = (report as any).districtId ? await DistrictModel.findOne({ districtId: (report as any).districtId }).lean() : null
  const districtName = districtDoc ? (districtDoc as any).districtName || (districtDoc as any).district_name : undefined
  
  const districtMap = districtName ? new Map([[(report as any).districtId, districtName]]) : new Map()
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
      businessName: (report as any).businessName,
      businessType: (report as any).businessType,
      district: (report as any).districtId ? districtMap.get((report as any).districtId || 0) : '',
      inspectionDate: (report as any).inspectionDate ? (report as any).inspectionDate.toISOString().slice(0, 10) : '',
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
    doc.text((report as any).businessName || '', columns[0], y, { width: 190 })
    doc.text((report as any).businessType || '', columns[1], y, { width: 100 })
    doc.text(districtMap.get((report as any).districtId || 0) || '', columns[2], y, { width: 100 })
    doc.text((report as any).inspectionDate ? (report as any).inspectionDate.toISOString().slice(0, 10) : '', columns[3], y)
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
  const districts = await defaultDeps.districtRepo.list()
  const summaries = []
  for (const district of districts) {
    const reports = await defaultDeps.reportRepo.list({ districtId: (district as any).districtId })
    const totalInspections = reports.length
    const totalFineAmount = reports.reduce((sum: number, r: any) => sum + ((r as any).fineAmount || 0), 0)
    summaries.push({
      district: (district as any).districtName,
      total_inspections: totalInspections,
      total_fine_amount: totalFineAmount,
    })
  }
  return summaries
}

function serializeInspectionReport(report: any, districtMap?: Map<number, string>) {
  return {
    id: report.numericId,
    business_name: report.businessName,
    business_type: report.businessType,
    license_number: report.licenseNumber,
    violation_found: report.violationFound,
    violation_type: report.violationType,
    action_taken: report.actionTaken,
    plastic_bags_confiscation: report.plasticBagsConfiscation,
    confiscation_other_plastics: report.confiscationOtherPlastics,
    total_confiscation: report.totalConfiscation,
    other_single_use_items: report.otherSingleUseItems,
    latitude: report.latitude,
    longitude: report.longitude,
    inspection_date: report.inspectionDate ? report.inspectionDate.toISOString().slice(0, 10) : null,
    fine_amount: report.fineAmount,
    fine_recovery_status: report.fineRecoveryStatus,
    fine_recovery_date: report.fineRecoveryDate ? report.fineRecoveryDate.toISOString().slice(0, 10) : null,
    recovery_amount: report.recoveryAmount,
    de_sealed_date: report.deSealedDate ? report.deSealedDate.toISOString().slice(0, 10) : null,
    fine_recovery_breakup: report.fineRecoveryBreakup,
    affidavit: report.affidavitPath ? `/api/pmc/media/${report.affidavitPath.replace('media/', '')}` : null,
    confiscation_receipt: report.confiscationReceiptPath ? `/api/pmc/media/${report.confiscationReceiptPath.replace('media/', '')}` : null,
    payment_challan: report.paymentChallanPath ? `/api/pmc/media/${report.paymentChallanPath.replace('media/', '')}` : null,
    receipt_book_number: report.receiptBookNumber,
    receipt_number: report.receiptNumber,
    district: districtMap?.get(report.districtId) || report.districtId,
    created_at: report.createdAt,
  }
}
