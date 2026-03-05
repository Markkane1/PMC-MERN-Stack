import type { ErrorRequestHandler } from 'express'
import { env } from '../../../infrastructure/config/env'

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isDev = env.nodeEnv === 'development'
  const anyErr = err as any
  const rawMessage = err.message || 'Internal Server Error'
  const errorName = anyErr?.name || ''
  const isBodyParserSyntaxError = err instanceof SyntaxError && anyErr?.status === 400 && 'body' in anyErr
  const uploadValidationError =
    rawMessage.startsWith('File type not allowed') ||
    rawMessage.startsWith('File extension not allowed') ||
    rawMessage.startsWith('File content validation failed')
  const isPayloadTooLarge =
    anyErr?.code === 'LIMIT_FILE_SIZE' || anyErr?.type === 'entity.too.large' || rawMessage === 'File too large'
  const isDbClientInputError =
    errorName === 'ValidationError' ||
    errorName === 'CastError' ||
    errorName === 'BSONTypeError'
  const isRuntimeInputTypeError =
    err instanceof TypeError ||
    rawMessage.includes('Cannot read properties of undefined') ||
    rawMessage.includes('Cannot destructure property') ||
    rawMessage.includes('is not iterable')

  const status =
    (anyErr?.statusCode as number) ||
    (anyErr?.status as number) ||
    (isPayloadTooLarge ? 413
      : uploadValidationError || isBodyParserSyntaxError || isDbClientInputError || isRuntimeInputTypeError ? 400 : 500)
  const message = rawMessage

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
