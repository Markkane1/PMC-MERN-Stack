import path from 'path'
import fs from 'fs'
import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import { createUploader } from '../../../interfaces/http/middlewares/upload'
import { env } from '../../../infrastructure/config/env'
import type { ApplicantDocumentRepository, DistrictPlasticCommitteeDocumentRepository, DistrictRepository } from '../../../domain/repositories/pmc'
import type { UserRepository } from '../../../domain/repositories/accounts'
import {
  applicantDocumentRepositoryMongo,
  districtPlasticCommitteeDocumentRepositoryMongo,
  districtRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'
import { userRepositoryMongo } from '../../../infrastructure/database/repositories/accounts'

type AuthRequest = Request & { user?: any; file?: Express.Multer.File }

type DocumentsDeps = {
  applicantDocRepo: ApplicantDocumentRepository
  districtDocRepo: DistrictPlasticCommitteeDocumentRepository
  districtRepo: DistrictRepository
  userRepo: UserRepository
}

const defaultDeps: DocumentsDeps = {
  applicantDocRepo: applicantDocumentRepositoryMongo,
  districtDocRepo: districtPlasticCommitteeDocumentRepositoryMongo,
  districtRepo: districtRepositoryMongo,
  userRepo: userRepositoryMongo,
}

const applicantUploader = createUploader('media/documents')
const districtUploader = createUploader('media/plastic_committee')

function toDocumentUrl(docPath?: string) {
  if (!docPath) return docPath
  if (docPath.startsWith('/api/pmc/media')) return docPath
  if (docPath.startsWith('media/')) {
    return `/api/pmc/media/${docPath.replace('media/', '')}`
  }
  return `/api/pmc/media/${docPath}`
}

export const uploadApplicantDocument = [
  applicantUploader.single('document'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: 'document is required' })
    }

    const applicantId = Number(req.body.applicant || req.body.applicant_id)
    const documentDescription = req.body.document_description || req.body.documentDescription
    const documentPath = `media/documents/${req.file.filename}`

    const doc = await defaultDeps.applicantDocRepo.create({
      applicantId,
      documentPath,
      documentDescription,
      createdBy: req.user?._id,
    })

    return res.status(201).json({
      id: (doc as any).numericId,
      applicant: (doc as any).applicantId,
      document_description: (doc as any).documentDescription,
      created_at: (doc as any).createdAt,
      document: toDocumentUrl((doc as any).documentPath),
    })
  }),
]

export const listApplicantDocuments = asyncHandler(async (_req: Request, res: Response) => {
  const docs = await defaultDeps.applicantDocRepo.list()
  const data = docs.map((doc: any) => ({
    id: (doc as any).numericId,
    applicant: (doc as any).applicantId,
    document_description: (doc as any).documentDescription,
    created_at: (doc as any).createdAt,
    document: toDocumentUrl((doc as any).documentPath),
  }))
  return res.json(data)
})

export const uploadDistrictDocument = [
  districtUploader.single('document'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: 'document is required' })
    }

    const districtId = Number(req.body.district || req.body.district_id)
    const documentType = req.body.document_type || req.body.documentType
    const title = req.body.title
    const documentDate = req.body.document_date ? new Date(req.body.document_date) : undefined
    const documentPath = `media/plastic_committee/${req.file.filename}`

    const doc = await defaultDeps.districtDocRepo.create({
      districtId,
      documentType,
      title,
      documentDate,
      documentPath,
      uploadedBy: req.user?._id,
    })

    const district = await defaultDeps.districtRepo.findByDistrictId(districtId)
    const uploader = req.user?._id ? await defaultDeps.userRepo.findById(String(req.user._id)) : null

    return res.status(201).json({
      id: (doc as any).numericId,
      district: (doc as any).districtId,
      district_name: district?.districtName || null,
      document_type: (doc as any).documentType,
      title: (doc as any).title,
      document_date: (doc as any).documentDate,
      uploaded_at: (doc as any).createdAt,
      uploaded_by_name: uploader ? `${uploader.firstName || ''} ${uploader.lastName || ''}`.trim() : null,
      document: toDocumentUrl((doc as any).documentPath),
    })
  }),
]

export const listDistrictDocuments = asyncHandler(async (_req: Request, res: Response) => {
  const docs = await defaultDeps.districtDocRepo.list()
  const districts = await defaultDeps.districtRepo.list()
  const users = await defaultDeps.userRepo.listByIds(docs.map((d: any) => String((d as any).uploadedBy)).filter(Boolean))
  const districtMap = new Map(districts.map((d: any) => [(d as any).districtId, (d as any).districtName]))
  const userMap = new Map(users.map((u) => [String(u.id), u]))
  const data = docs.map((doc: any) => ({
    id: (doc as any).numericId,
    district: (doc as any).districtId,
    district_name: districtMap.get((doc as any).districtId) || null,
    document_type: (doc as any).documentType,
    title: (doc as any).title,
    document_date: (doc as any).documentDate,
    uploaded_at: (doc as any).createdAt,
    uploaded_by_name: (doc as any).uploadedBy
      ? `${userMap.get(String((doc as any).uploadedBy))?.firstName || ''} ${userMap.get(String((doc as any).uploadedBy))?.lastName || ''}`.trim()
      : null,
    document: toDocumentUrl((doc as any).documentPath),
  }))
  return res.json(data)
})

export const downloadMedia = asyncHandler(async (req: Request, res: Response) => {
  const { folder_name, folder_name2, file_name } = req.params
  const parts = [folder_name, folder_name2, file_name].filter(Boolean) as string[]
  const filePath = path.join(env.uploadDir, ...parts)
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' })
  }
  return res.sendFile(path.resolve(filePath))
})
