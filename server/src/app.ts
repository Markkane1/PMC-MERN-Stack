import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import hpp from 'hpp'
import mongoSanitize from 'express-mongo-sanitize'
import { env } from './infrastructure/config/env'
import { errorHandler } from './interfaces/http/middlewares/error'
import { apiRouter } from './interfaces/http/routes'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
      exposedHeaders: ['X-Total-Count'],
    })
  )
  app.use(helmet())
  app.use(hpp())
  app.use(mongoSanitize())
  app.use(compression())
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(morgan('dev'))

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  })

  app.use('/api', apiLimiter)
  app.use('/api/accounts/login', authLimiter)
  app.use('/api/accounts/register', authLimiter)

  app.use('/api', apiRouter)

  app.use(errorHandler)

  return app
}
