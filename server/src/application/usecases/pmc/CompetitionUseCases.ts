import path from 'path'
import fs from 'fs'
import multer from 'multer'
import PDFDocument from 'pdfkit'
import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { env } from '../../../infrastructure/config/env'
import type { CompetitionRegistrationRepository } from '../../../domain/repositories/pmc'
import { competitionRegistrationRepositoryMongo } from '../../../infrastructure/database/repositories/pmc'

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = path.join(env.uploadDir, 'media/competition')
    ensureDir(dest)
    cb(null, dest)
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}_${safeName}`)
  },
})

const upload = multer({ storage })

type CompetitionDeps = {
  repo: CompetitionRegistrationRepository
}

const defaultDeps: CompetitionDeps = {
  repo: competitionRegistrationRepositoryMongo,
}

export const registerCompetition = [
  upload.fields([
    { name: 'student_card_front', maxCount: 1 },
    { name: 'student_card_back', maxCount: 1 },
    { name: 'photo_object', maxCount: 1 },
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Record<string, Express.Multer.File[]>
    const front = files?.student_card_front?.[0]
    const back = files?.student_card_back?.[0]
    const photo = files?.photo_object?.[0]

    const registration = await defaultDeps.repo.create({
      fullName: req.body.full_name,
      institute: req.body.institute,
      grade: req.body.grade,
      category: req.body.category,
      competitionType: req.body.competition_type,
      mobile: req.body.mobile,
      studentCardFrontPath: front ? `media/competition/${front.filename}` : undefined,
      studentCardBackPath: back ? `media/competition/${back.filename}` : undefined,
      photoObjectPath: photo ? `media/competition/${photo.filename}` : undefined,
    })

    return res.status(201).json({
      registration_id: (registration as any).registrationId,
      ...registration,
    })
  }),
]

export const generateLabel = asyncHandler(async (req: Request, res: Response) => {
  const registrationId = req.query.registration_id as string | undefined
  if (!registrationId) {
    return res.status(400).json({ message: 'registration_id is required' })
  }

  const registration = await defaultDeps.repo.findByRegistrationId(registrationId)
  if (!registration) {
    return res.status(404).json({ message: 'Registration not found' })
  }

  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'attachment; filename="competition-label.pdf"')
  doc.pipe(res)

  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  doc.rect(left, 30, right - left, doc.page.height - 60).lineWidth(1).stroke()

  doc.fontSize(18).text('Competition Registration Label', left, 50, { align: 'center' })
  doc.moveDown(2)
  doc.fontSize(12)
  const rows: Array<[string, string]> = [
    ['Registration ID', (registration as any).registrationId],
    ['Name', (registration as any).fullName],
    ['Institute', (registration as any).institute],
    ['Category', (registration as any).category],
    ['Competition Type', (registration as any).competitionType],
  ]
  let y = 120
  for (const [label, value] of rows) {
    doc.font('Helvetica-Bold').text(`${label}:`, left + 20, y, { width: 140 })
    doc.font('Helvetica').text(value || '', left + 170, y, { width: right - left - 190 })
    y += 22
  }

  doc.end()
})
