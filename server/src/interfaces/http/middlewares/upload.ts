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

const SUSPICIOUS_CONTENT_PATTERN = /<script|javascript:|onerror=|onload=/i

function pathExists(filePath: string) {
  return fs.existsSync(filePath)
}

function createDirectory(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function removeFile(filePath: string) {
  fs.unlinkSync(filePath)
}

function readFileBuffer(filePath: string) {
  return fs.readFileSync(filePath)
}

function writeFileBuffer(filePath: string, content: Buffer) {
  fs.writeFileSync(filePath, content)
}

function ensureDir(dirPath: string) {
  if (!pathExists(dirPath)) {
    createDirectory(dirPath)
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
      return cb(null, false)
    }

    const ext = path.extname(file.originalname).toLowerCase()
    if (!allowedExtensions.has(ext)) {
      return cb(null, false)
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

function matchesSignature(buffer: Buffer, ext: string): boolean {
  if (ext === '.pdf') {
    return buffer.length >= 5 && buffer.subarray(0, 5).toString('utf8') === '%PDF-'
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (ext === '.png') {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    )
  }
  if (ext === '.gif') {
    const sig = buffer.subarray(0, 6).toString('ascii')
    return sig === 'GIF87a' || sig === 'GIF89a'
  }
  if (ext === '.webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    )
  }
  return true
}

function throwUploadValidationError(message: string, statusCode = 400): never {
  const err = new Error(message) as Error & { statusCode?: number }
  err.statusCode = statusCode
  throw err
}

function cleanupInvalidUpload(filePath: string) {
  try {
    if (pathExists(filePath)) {
      removeFile(filePath)
    }
  } catch {
    // Best-effort cleanup for rejected uploads.
  }
}

function sanitizeImagePayload(content: Buffer): Buffer {
  const sanitizedBinary = content
    .toString('binary')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onload=/gi, '')
  return Buffer.from(sanitizedBinary, 'binary')
}

export function validateAndSanitizeUploadedFile(
  filePath: string,
  originalName: string,
  mimeType: string
) {
  const ext = path.extname(originalName || '').toLowerCase()
  const content = readFileBuffer(filePath)

  if (!matchesSignature(content, ext)) {
    cleanupInvalidUpload(filePath)
    throwUploadValidationError('File content validation failed')
  }

  const containsSuspiciousContent = SUSPICIOUS_CONTENT_PATTERN.test(content.toString('utf8'))
  if (containsSuspiciousContent) {
    if (mimeType.startsWith('image/')) {
      const sanitized = sanitizeImagePayload(content)
      writeFileBuffer(filePath, sanitized)
      return
    }

    cleanupInvalidUpload(filePath)
    throwUploadValidationError('File content validation failed')
  }
}
