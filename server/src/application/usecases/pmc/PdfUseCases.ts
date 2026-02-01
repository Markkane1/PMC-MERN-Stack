import { Request, Response } from 'express'
import PDFDocument from 'pdfkit'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type { ApplicantRepository } from '../../../domain/repositories/pmc'
import { applicantRepositoryMongo } from '../../../infrastructure/database/repositories/pmc'

type PdfDeps = { applicantRepo: ApplicantRepository }
const defaultDeps: PdfDeps = { applicantRepo: applicantRepositoryMongo }

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

export const chalanPdf = asyncHandler(async (req: Request, res: Response) => {
  const applicantId = req.query.ApplicantId as string | undefined
  if (!applicantId) return res.status(400).json({ message: 'ApplicantId is required' })
  const applicant = await defaultDeps.applicantRepo.findByNumericId(Number(applicantId))
  if (!applicant) return res.status(404).json({ message: 'Applicant not found' })

  return buildSimplePdf(res, 'Bank Challan', {
    TrackingNumber: (applicant as any).trackingNumber,
    Name: `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
    CNIC: (applicant as any).cnic,
    Date: new Date().toISOString().slice(0, 10),
  })
})
