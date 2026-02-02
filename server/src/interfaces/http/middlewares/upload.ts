import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { env } from '../../../infrastructure/config/env'

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
])

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

export function createUploader(subDir: string) {
  const uploadPath = path.join(env.uploadDir, subDir)
  ensureDir(uploadPath)

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadPath)
    },
    filename: (_req, file, cb) => {
      const timestamp = Date.now()
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      cb(null, `${timestamp}_${safeName}`)
    },
  })

  const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Unsupported file type'))
    }
    return cb(null, true)
  }

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: DEFAULT_MAX_FILE_SIZE },
  })
}
