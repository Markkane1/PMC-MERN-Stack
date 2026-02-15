import multer from 'multer'

export const parseMultipart = multer({
  limits: {
    files: 0,
    fields: 200,
    fieldSize: 1024 * 1024,
  },
}).none()
