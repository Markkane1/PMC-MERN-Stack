import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import multer, { type FileFilterCallback } from 'multer'
import { env } from '../../../infrastructure/config/env'

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const DOCUMENT_MIMETYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

export const DOCUMENT_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
])

export const IMAGE_PDF_MIMETYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

export const IMAGE_PDF_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
])

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

export function ensureUploadSubDir(subDir: string): string {
  const normalizedParts = subDir
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)

  if (!normalizedParts.length || normalizedParts.some((part) => part === '.' || part === '..')) {
    throw new Error('Invalid upload directory')
  }

  const uploadRoot = path.resolve(env.uploadDir)
  const resolved = path.resolve(uploadRoot, ...normalizedParts)
  if (resolved !== uploadRoot && !resolved.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error('Invalid upload path')
  }

  ensureDir(resolved)
  return resolved
}

export function secureRandomFilename(originalName: string): string {
  const ext = path.extname(originalName || '').toLowerCase()
  const randomName = crypto.randomBytes(16).toString('hex')
  return `${Date.now()}_${randomName}${ext}`
}

export function createFileFilter(
  allowedMimetypes: Set<string>,
  allowedExtensions: Set<string>
) {
  return (_req: unknown, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!allowedMimetypes.has(file.mimetype)) {
      return cb(
        new Error(
          'File type not allowed. Supported types: PDF, Images (JPEG, PNG, GIF, WebP), Office Documents (Word, Excel, PowerPoint), CSV'
        )
      )
    }

    const ext = path.extname(file.originalname).toLowerCase()
    if (!allowedExtensions.has(ext)) {
      return cb(new Error(`File extension not allowed: ${ext || '(none)'}`))
    }

    cb(null, true)
  }
}

export function createUploader(subDir: string) {
  const uploadPath = ensureUploadSubDir(subDir)

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadPath)
    },
    filename: (_req, file, cb) => {
      cb(null, secureRandomFilename(file.originalname))
    },
  })

  return multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
      fields: 50,
      fieldSize: 1024 * 1024,
    },
    fileFilter: createFileFilter(DOCUMENT_MIMETYPES, DOCUMENT_EXTENSIONS),
  })
}
