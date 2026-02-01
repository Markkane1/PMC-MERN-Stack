import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { env } from '../../../infrastructure/config/env'

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

  return multer({ storage })
}
