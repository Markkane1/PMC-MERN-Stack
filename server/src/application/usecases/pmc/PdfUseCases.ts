import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type { ApplicantRepository } from '../../../domain/repositories/pmc'
import { applicantRepositoryMongo } from '../../../infrastructure/database/repositories/pmc'
import { ChalanPdfService } from '../../services/pmc/ChalanPdfService'
import {
  buildPdfJobAcceptedResponse,
  pdfJobQueueService,
  type PdfJobSnapshot,
} from '../../services/pmc/PdfJobQueueService'
import { ReceiptPdfService } from '../../services/pmc/ReceiptPdfService'
import { QRCodeService } from '../../services/pmc/QRCodeService'
import type { PdfArtifact } from '../../services/pmc/PdfGenerationRuntime'

type PdfDeps = { applicantRepo: ApplicantRepository }
const defaultDeps: PdfDeps = { applicantRepo: applicantRepositoryMongo }

type AuthRequest = Request & { user?: any }

function getRequesterKeys(req: AuthRequest) {
  const userId = req.user?._id ? String(req.user._id) : req.user?.id ? String(req.user.id) : null
  return userId ? [`user:${userId}`, `ip:${req.ip}`] : [`ip:${req.ip}`]
}

function sendPdfArtifact(
  res: Response,
  artifact: PdfArtifact,
  extraHeaders: Record<string, string | number | undefined> = {}
) {
  res.setHeader('Content-Type', artifact.mimeType)
  res.setHeader('Content-Disposition', `attachment; filename="${artifact.filename}"`)
  res.setHeader('Content-Length', artifact.size)
  res.setHeader('X-Generated-At', artifact.generatedAt.toISOString())

  for (const [header, value] of Object.entries(extraHeaders)) {
    if (value !== undefined) {
      res.setHeader(header, value)
    }
  }

  return res.send(artifact.buffer)
}

function sendQueuedPdfResponse(
  res: Response,
  job: PdfJobSnapshot,
  data: Record<string, unknown> = {}
) {
  return res.status(202).json({
    ...buildPdfJobAcceptedResponse(job),
    data,
  })
}

function buildReceiptData(applicant: any, overrides: Record<string, unknown> = {}) {
  return {
    receiptNumber:
      String(overrides.receiptNumber || `RCP-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`),
    applicantId: String(overrides.applicantId || applicant.numericId || applicant.id),
    applicantName: `${applicant.firstName} ${applicant.lastName || ''}`.trim(),
    applicantEmail: applicant.email,
    applicantPhone: applicant.phone || applicant.mobileNo,
    cnic: applicant.cnic,
    trackingNumber: applicant.trackingNumber,
    amountPaid: Number(overrides.amountPaid || 0),
    amountDue: overrides.amountDue ? Number(overrides.amountDue) : undefined,
    paymentDate: overrides.paymentDate instanceof Date ? overrides.paymentDate : new Date(),
    description: String(overrides.description || 'Application Fee Payment'),
    paymentMethod: String(overrides.paymentMethod || 'Bank Transfer'),
    referenceNumber: String(overrides.referenceNumber || ''),
    remarks: String(overrides.remarks || ''),
  }
}

export const receiptPdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = req.query.ApplicantId as string | undefined
  if (!applicantId) return res.status(400).json({ message: 'ApplicantId is required' })

  const applicant = await defaultDeps.applicantRepo.findByNumericId(Number(applicantId))
  if (!applicant) return res.status(404).json({ message: 'Applicant not found' })

  const receiptData = buildReceiptData(applicant, {
    applicantId,
    amountPaid: 0.01,
    description: 'Application Receipt',
    paymentMethod: 'N/A',
  })

  const artifact = await ReceiptPdfService.generateReceiptPdfWithMetadata(receiptData)
  return sendPdfArtifact(res, artifact)
})

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

  const applicant = await defaultDeps.applicantRepo.findByNumericId(Number(applicantIdParam))
  if (!applicant) {
    return res.status(404).json({
      success: false,
      message: 'Applicant not found',
    })
  }

  const chalanNumber = `CHN-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`

  try {
    const chalanData = {
      chalanNumber,
      applicantId: String(applicantIdParam),
      applicantName: `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
      amountDue: parseFloat(String(resolvedAmountDue)),
      dueDate: new Date(String(resolvedDueDate)),
      description: description || 'Application Registration Fee',
      bankName: resolvedBankName || 'State Bank of Pakistan (SBP)',
      bankBranch: resolvedBankBranch || 'Main Office, Islamabad',
      accountNumber: resolvedAccountNumber || '01-9900-00001-1',
      bankCode: resolvedBankCode || '0020',
    }

    ChalanPdfService.validateChalanData(chalanData)

    const result = await pdfJobQueueService.generateOrQueue(
      'chalan',
      chalanData,
      getRequesterKeys(req)
    )

    if (result.mode === 'inline') {
      return sendPdfArtifact(res, result.artifact, {
        'X-Chalan-Number': chalanNumber,
      })
    }

    return sendQueuedPdfResponse(res, result.job, {
      chalanNumber,
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: `Failed to generate chalan: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

export const generateReceiptPdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { applicantId, amountPaid, paymentMethod, referenceNumber, receiptNumber, remarks } = req.body

  if (!applicantId) {
    return res.status(400).json({
      success: false,
      message: 'Applicant ID is required',
    })
  }

  if (!amountPaid || Number(amountPaid) <= 0) {
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

  try {
    const receiptData = buildReceiptData(applicant, {
      applicantId,
      amountPaid,
      paymentMethod,
      referenceNumber,
      receiptNumber,
      remarks,
    })

    ReceiptPdfService.validateReceiptData(receiptData)

    const result = await pdfJobQueueService.generateOrQueue(
      'receipt',
      receiptData,
      getRequesterKeys(req)
    )

    if (result.mode === 'inline') {
      return sendPdfArtifact(res, result.artifact, {
        'X-Receipt-Number': receiptData.receiptNumber,
      })
    }

    return sendQueuedPdfResponse(res, result.job, {
      receiptNumber: receiptData.receiptNumber,
    })
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: `Failed to generate receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

export const getPdfJob = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { jobId } = req.params
  const requesterKeys = getRequesterKeys(req)
  const job = pdfJobQueueService.getJob(jobId, requesterKeys)

  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'PDF job not found',
    })
  }

  if (job.status === 'queued' || job.status === 'processing') {
    return res.status(202).json({
      success: true,
      ...pdfJobQueueService.getJobSnapshot(jobId, requesterKeys),
    })
  }

  if (job.status === 'failed') {
    return res.status(500).json({
      success: false,
      ...pdfJobQueueService.getJobSnapshot(jobId, requesterKeys),
      message: job.error || 'PDF generation failed',
    })
  }

  if (!job.artifact) {
    return res.status(500).json({
      success: false,
      message: 'PDF job completed without an artifact',
    })
  }

  if (req.query.download === '1') {
    return sendPdfArtifact(res, job.artifact)
  }

  return res.json({
    success: true,
    ...pdfJobQueueService.getJobSnapshot(jobId, requesterKeys),
    downloadUrl: `${pdfJobQueueService.buildPollUrl(jobId)}?download=1`,
  })
})

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
    const qrContent = QRCodeService.parseQRCodeData(resolvedQrData)

    if (qrContent.type !== 'CHALAN') {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code type (expected CHALAN)',
      })
    }

    if (qrContent.chalanNo !== resolvedChalanNumber) {
      return res.status(400).json({
        success: false,
        message: 'Chalan number does not match QR code data',
      })
    }

    return res.json({
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
    return res.status(400).json({
      success: false,
      message: `Failed to verify chalan QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})
