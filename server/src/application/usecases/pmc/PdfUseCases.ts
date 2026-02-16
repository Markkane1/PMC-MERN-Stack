import { Request, Response } from 'express'
import PDFDocument from 'pdfkit'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type { ApplicantRepository } from '../../../domain/repositories/pmc'
import { applicantRepositoryMongo } from '../../../infrastructure/database/repositories/pmc'
import { ChalanPdfService } from '../../services/pmc/ChalanPdfService'
import { ReceiptPdfService } from '../../services/pmc/ReceiptPdfService'
import { QRCodeService } from '../../services/pmc/QRCodeService'

type PdfDeps = { applicantRepo: ApplicantRepository }
const defaultDeps: PdfDeps = { applicantRepo: applicantRepositoryMongo }

type AuthRequest = Request & { user?: any }

function buildSimplePdf(res: Response, title: string, data: Record<string, any>) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${title}.pdf"`)
  doc.pipe(res)
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right

  doc.rect(left, 30, right - left, doc.page.height - 60).lineWidth(1).stroke()
  doc.fontSize(18).text(title, left, 50, { align: 'center' })
  doc.moveDown(2)

  doc.fontSize(11)
  let y = 120
  for (const [key, value] of Object.entries(data)) {
    doc.font('Helvetica-Bold').text(`${key}:`, left + 20, y, { width: 140 })
    doc.font('Helvetica').text(String(value ?? ''), left + 170, y, { width: right - left - 190 })
    y += 22
  }

  doc.moveTo(left + 20, doc.page.height - 120).lineTo(left + 260, doc.page.height - 120).stroke()
  doc.fontSize(10).text('Authorized Signature', left + 20, doc.page.height - 110)
  doc.end()
}

export const receiptPdf = asyncHandler(async (req: Request, res: Response) => {
  const applicantId = req.query.ApplicantId as string | undefined
  if (!applicantId) return res.status(400).json({ message: 'ApplicantId is required' })
  const applicant = await defaultDeps.applicantRepo.findByNumericId(Number(applicantId))
  if (!applicant) return res.status(404).json({ message: 'Applicant not found' })

  return buildSimplePdf(res, 'Application Receipt', {
    TrackingNumber: (applicant as any).trackingNumber,
    Name: `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
    CNIC: (applicant as any).cnic,
    Date: new Date().toISOString().slice(0, 10),
  })
})

/**
 * Generate Bank Chalan PDF with QR code
 * POST /api/pmc/chalan-pdf
 * Query: applicantId (optional - if provided, auto-fill applicant details)
 * Body: {
 *   amountDue: number (required)
 *   dueDate: Date (required)
 *   bankName?: string
 *   bankBranch?: string
 *   accountNumber?: string
 * }
 */
export const chalanPdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { applicantId: queryApplicantId } = req.query
  const {
    applicantId: bodyApplicantId,
    applicant_id: bodyApplicantIdLegacy,
    amountDue,
    amount_due: amountDueLegacy,
    dueDate,
    due_date: dueDateLegacy,
    bankName,
    bank_name: bankNameLegacy,
    bankBranch,
    bank_branch: bankBranchLegacy,
    accountNumber,
    account_number: accountNumberLegacy,
    bankCode,
    bank_code: bankCodeLegacy,
    description,
  } = req.body

  // Determine applicant ID
  const applicantIdParam = queryApplicantId || bodyApplicantId || bodyApplicantIdLegacy
  const resolvedAmountDue = amountDue ?? amountDueLegacy
  const resolvedDueDate = dueDate ?? dueDateLegacy
  const resolvedBankName = bankName ?? bankNameLegacy
  const resolvedBankBranch = bankBranch ?? bankBranchLegacy
  const resolvedAccountNumber = accountNumber ?? accountNumberLegacy
  const resolvedBankCode = bankCode ?? bankCodeLegacy
  if (!applicantIdParam) {
    return res.status(400).json({
      success: false,
      message: 'Applicant ID is required (query param or body)',
    })
  }

  if (!resolvedAmountDue || !resolvedDueDate) {
    return res.status(400).json({
      success: false,
      message: 'Amount due and due date are required',
    })
  }

  // Fetch applicant details
  const applicant = await defaultDeps.applicantRepo.findByNumericId(Number(applicantIdParam))
  if (!applicant) {
    return res.status(404).json({
      success: false,
      message: 'Applicant not found',
    })
  }

  // Generate unique chalan number
  const chalanNumber = `CHN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

  try {
    // Validate chalan data
    const chalanData = {
      chalanNumber,
      applicantId: String(applicantIdParam),
      applicantName: `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
      amountDue: parseFloat(resolvedAmountDue),
      dueDate: new Date(resolvedDueDate),
      description: description || 'Application Registration Fee',
      bankName: resolvedBankName || 'State Bank of Pakistan (SBP)',
      bankBranch: resolvedBankBranch || 'Main Office, Islamabad',
      accountNumber: resolvedAccountNumber || '01-9900-00001-1',
      bankCode: resolvedBankCode || '0020',
    }

    // Validate chalan data
    ChalanPdfService.validateChalanData(chalanData)

    // Generate PDF
    const pdfMetadata = await ChalanPdfService.generateChalanPdfWithMetadata(chalanData)

    // Set response headers
    res.setHeader('Content-Type', pdfMetadata.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${pdfMetadata.filename}"`)
    res.setHeader('Content-Length', pdfMetadata.size)
    res.setHeader('X-Chalan-Number', chalanNumber)
    res.setHeader('X-Generated-At', pdfMetadata.generatedAt.toISOString())

    // Send PDF
    res.send(pdfMetadata.buffer)
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to generate chalan: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Generate Receipt PDF
 * POST /api/pmc/receipt-pdf
 * Body: {
 *   applicantId: string (required)
 *   amountPaid: number (required)
 *   paymentMethod?: string
 *   referenceNumber?: string
 *   receiptNumber?: string
 * }
 */
export const generateReceiptPdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { 
    applicantId, 
    amountPaid, 
    paymentMethod, 
    referenceNumber, 
    receiptNumber,
    remarks 
  } = req.body

  if (!applicantId) {
    return res.status(400).json({
      success: false,
      message: 'Applicant ID is required',
    })
  }

  if (!amountPaid || amountPaid <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid amount paid is required',
    })
  }

  const applicant = await defaultDeps.applicantRepo.findByNumericId(Number(applicantId))
  if (!applicant) {
    return res.status(404).json({
      success: false,
      message: 'Applicant not found',
    })
  }

  const receiptNum = receiptNumber || `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

  try {
    // Validate receipt data
    const receiptData = {
      receiptNumber: receiptNum,
      applicantId: String(applicantId),
      applicantName: `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
      applicantEmail: (applicant as any).email,
      applicantPhone: (applicant as any).phone,
      cnic: (applicant as any).cnic,
      trackingNumber: (applicant as any).trackingNumber,
      amountPaid: parseFloat(amountPaid),
      paymentDate: new Date(),
      description: 'Application Fee Payment',
      paymentMethod: paymentMethod || 'Bank Transfer',
      referenceNumber: referenceNumber || '',
      remarks: remarks || '',
    }

    // Validate receipt data
    ReceiptPdfService.validateReceiptData(receiptData)

    // Generate PDF
    const pdfMetadata = await ReceiptPdfService.generateReceiptPdfWithMetadata(receiptData)

    // Set response headers
    res.setHeader('Content-Type', pdfMetadata.mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${pdfMetadata.filename}"`)
    res.setHeader('Content-Length', pdfMetadata.size)
    res.setHeader('X-Receipt-Number', receiptNum)
    res.setHeader('X-Generated-At', pdfMetadata.generatedAt.toISOString())

    // Send PDF
    res.send(pdfMetadata.buffer)
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to generate receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

/**
 * Verify Chalan QR Code
 * POST /api/pmc/verify-chalan
 * Body: {
 *   qrData: string (QR code data)
 *   chalanNumber: string (chalan number to verify against)
 * }
 */
export const verifyChalanQr = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { qrData, chalanNumber, qr_data: qrDataLegacy, chalan_number: chalanNumberLegacy } = req.body
  const resolvedQrData = qrData || qrDataLegacy
  const resolvedChalanNumber = chalanNumber || chalanNumberLegacy

  if (!resolvedQrData || !resolvedChalanNumber) {
    return res.status(400).json({
      success: false,
      message: 'QR data and chalan number are required',
    })
  }

  try {
    // Parse QR code data
    const qrContent = QRCodeService.parseQRCodeData(resolvedQrData)

    // Verify it's a chalan QR code
    if (qrContent.type !== 'CHALAN') {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code type (expected CHALAN)',
      })
    }

    // Verify chalan number matches
    if (qrContent.chalanNo !== resolvedChalanNumber) {
      return res.status(400).json({
        success: false,
        message: 'Chalan number does not match QR code data',
      })
    }

    // Verification successful
    res.json({
      success: true,
      message: 'Chalan verified successfully',
      data: {
        chalanNumber: qrContent.chalanNo,
        applicantId: qrContent.applicantId,
        amount: qrContent.amount,
        verifiedAt: new Date(),
        qrType: qrContent.type,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to verify chalan QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})
