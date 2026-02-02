import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
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
  app.use(compression())
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(morgan('dev'))

  app.use('/api', apiRouter)

  app.use(errorHandler)

  return app
}
