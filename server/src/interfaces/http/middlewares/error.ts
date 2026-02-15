import type { ErrorRequestHandler } from 'express'
import { env } from '../../../infrastructure/config/env'

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isDev = env.nodeEnv === 'development'
  const status = (err.statusCode as number) || 500
  const message = err.message || 'Internal Server Error'

  // Log error server-side (never expose to client in production)
  const errorLog = {
    timestamp: new Date().toISOString(),
    status,
    message,
    path: req.path,
    method: req.method,
    ip: req.ip || req.socket.remoteAddress,
    userId: (req as any).user?._id,
    ...(isDev && { stack: err.stack }),
  }

  // eslint-disable-next-line no-console
  console.error('API Error:', errorLog)

  // Generic error response for production
  const response: any = {
    message: isDev ? message : 'An error occurred',
  }

  // Only expose stack trace in development
  if (isDev) {
    response.debug = {
      message,
      stack: err.stack,
      error: err,
    }
  }

  res.status(status).json(response)
}
