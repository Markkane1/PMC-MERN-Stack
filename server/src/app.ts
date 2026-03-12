import express, { type Request, Response, NextFunction } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import mongoSanitize from 'express-mongo-sanitize'
import { env } from './infrastructure/config/env'
import { errorHandler } from './interfaces/http/middlewares/error'
import { apiRouter } from './interfaces/http/routes'
import { normalizeQueryParameters, sanitizeRequestInput } from './interfaces/http/middlewares/securityInput'
import { RequestTracker, ConnectionPoolMonitor } from './interfaces/http/middlewares/concurrency'
import { ResponseTimeMonitor } from './interfaces/http/middlewares/performanceMonitor'
import { cacheHeadersMiddleware } from './interfaces/http/middleware/cacheHeaders'
import {
  etagMiddleware,
  fieldFilteringMiddleware,
  httpOptimizationMiddleware,
} from './infrastructure/http'
import { monitoringMiddleware, SystemMetricsCollector, monitoringRouter } from './infrastructure/monitoring'
import {
  generalApiRateLimitingMiddleware,
  loginRateLimitingMiddleware,
  captchaRateLimitingMiddleware,
  resilienceRouter,
} from './infrastructure/resilience'
import { haRouter, healthCheckAggregator } from './infrastructure/ha'

const shouldApplyRuntimeRateLimits =
  env.nodeEnv !== 'test' || env.enableRateLimitsInTest

function normalizeRequestPath(url: string): string {
  const pathname = url.split('?')[0] || '/'
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '')
}

function isCaptchaRequest(req: Request): boolean {
  return normalizeRequestPath(req.originalUrl) === '/api/accounts/generate-captcha'
}

function isLoginRequest(req: Request): boolean {
  return normalizeRequestPath(req.originalUrl) === '/api/accounts/login'
}

// HTTPS redirect for production
function httpsRedirect(req: Request, res: Response, next: NextFunction) {
  if (env.trustProxy) {
    return next()
  }

  if (env.nodeEnv === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    const host = req.get('host')
    if (!host) {
      return res.status(400).json({ message: 'Invalid host header' })
    }
    return res.redirect(301, `https://${host}${req.originalUrl}`)
  }
  next()
}

export function createApp() {
  const app = express()
  
  // Initialize concurrency monitoring
  const requestTracker = new RequestTracker()
  const connectionPoolMonitor = new ConnectionPoolMonitor()
  const responseTimeMonitor = new ResponseTimeMonitor({
    slowThreshold: 1000,
    groupByPath: true,
  })
  
  // Security: hide framework signature header
  app.disable('x-powered-by')

  if (env.trustProxy) {
    // Trust the reverse proxy when TLS terminates upstream (for cookies/IP handling).
    app.set('trust proxy', 1)
  }

  // HTTPS enforcement (production)
  app.use(httpsRedirect)

  // Security headers with strict defaults
  app.use(helmet())

  // CORS with strict validation
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (env.corsOrigins.includes(origin)) return callback(null, true)
        return callback(new Error('Not allowed by CORS'))
      },
      credentials: true,
      optionsSuccessStatus: 204,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400, // 24 hours
    })
  )

  // Parse cookies for httpOnly auth-token flow.
  app.use(cookieParser())

  // Harden unexpected HTTP verbs on API surface.
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase()

    if (method === 'TRACE' || method === 'HEAD') {
      return res.status(405).set('Allow', 'GET, POST, PUT, PATCH, DELETE, OPTIONS').json({
        message: 'Method Not Allowed',
      })
    }

    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method)) {
      return res.status(405).set('Allow', 'GET, POST, PUT, PATCH, DELETE, OPTIONS').json({
        message: 'Method Not Allowed',
      })
    }

    return next()
  })

  app.use(compression())

  // Week 4: HTTP Optimization Middleware Chain
  // ETag validation for 304 Not Modified responses
  app.use(etagMiddleware)
  
  // Field filtering support (?fields=id,name,status)
  app.use(fieldFilteringMiddleware)
  
  // Cache-Control headers, Vary, security headers
  app.use(httpOptimizationMiddleware)

  // Cache headers based on endpoint type
  app.use(cacheHeadersMiddleware)

  // Week 5: Monitoring & Observability
  // Track request/response metrics, performance stats
  app.use(monitoringMiddleware)

  // Week 6: Rate Limiting & Resilience
  // Keep disabled in test mode to avoid non-deterministic throttling in integration suites.
  if (shouldApplyRuntimeRateLimits) {
    app.use('/api/', (req: Request, res: Response, next: NextFunction) => {
      if (isCaptchaRequest(req) || isLoginRequest(req)) {
        return next()
      }
      return generalApiRateLimitingMiddleware(req, res, next)
    })

    ;['/api/accounts/login', '/api/accounts/login/'].forEach((route) => {
      app.use(route, loginRateLimitingMiddleware)
    })

    ;['/api/accounts/generate-captcha', '/api/accounts/generate-captcha/'].forEach((route) => {
      app.use(route, captchaRateLimitingMiddleware)
    })
  }

  // Enforce strict request body limits to reduce abuse risk.
  app.use(express.json({ limit: '10kb' }))
  app.use(express.urlencoded({ extended: true, limit: '10kb' }))
  app.use(mongoSanitize())
  app.use(sanitizeRequestInput)
  app.use(normalizeQueryParameters)

  // Request logging
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))

  // Concurrency monitoring and pool protection
  app.use(requestTracker.middleware())
  app.use(connectionPoolMonitor.middleware())
  
  // Performance monitoring (tracks response times)
  app.use(responseTimeMonitor.middleware())

  // API routes
  app.use('/api', apiRouter)

  // Week 5: Monitoring routes (metrics, dashboard, health, etc.)
  app.use('/monitoring', monitoringRouter)

  // Week 6: Resilience routes (rate limits, circuit breakers)
  app.use('/resilience', resilienceRouter)

  // Week 7: High Availability routes (load balancing, service registry, health checks)
  app.use('/ha', haRouter)

  // Global error handler (must be last)
  app.use(errorHandler)

  return app
}

