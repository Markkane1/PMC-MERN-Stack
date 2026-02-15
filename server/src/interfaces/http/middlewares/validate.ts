import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'
import { env } from '../../../infrastructure/config/env'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    })

    if (!result.success) {
      // In production, hide schema details to prevent API introspection
      if (env.nodeEnv === 'production') {
        return res.status(400).json({
          message: 'Invalid request',
        })
      }

      // In development, provide detailed validation errors
      return res.status(400).json({
        message: 'Validation error',
        errors: result.error.flatten(),
      })
    }
    return next()
  }
}
