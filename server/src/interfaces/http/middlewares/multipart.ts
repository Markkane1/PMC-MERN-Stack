import multer from 'multer'

export const parseMultipart = multer({
  limits: {
    files: 0,
    fields: 200,
    fieldSize: 1024 * 1024,
  },
}).none()

const qrImageMimeTypes = new Set(['image/png', 'image/jpeg', 'image/jpg'])

export const parseMultipartQrImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fields: 50,
    fileSize: 5 * 1024 * 1024,
    fieldSize: 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    cb(null, qrImageMimeTypes.has(file.mimetype))
  },
}).single('file')
