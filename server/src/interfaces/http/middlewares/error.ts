import type { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = (err.statusCode as number) || 500
  const message = err.message || 'Internal Server Error'

  res.status(status).json({
    message,
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  })
}
