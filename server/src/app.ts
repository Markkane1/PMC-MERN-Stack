import express, { type Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env } from './infrastructure/config/env'
import { errorHandler } from './interfaces/http/middlewares/error'
import { apiRouter } from './interfaces/http/routes'
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
  ipRateLimitingMiddleware,
  endpointRateLimitingMiddleware,
  userRateLimitingMiddleware,
  resilienceRouter,
} from './infrastructure/resilience'
import { haRouter, healthCheckAggregator } from './infrastructure/ha'

// Rate limiting for different endpoint types
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
})

// HTTPS redirect for production
function httpsRedirect(req: Request, res: Response, next: NextFunction) {
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
  
  const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", ...env.corsOrigins],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    ...(env.nodeEnv === 'production' ? { upgradeInsecureRequests: [] } : {}),
  }

  // Security: hide framework signature header
  app.disable('x-powered-by')

  if (env.nodeEnv === 'production') {
    // Needed when running behind reverse proxies for secure cookies/IP/rate limits.
    app.set('trust proxy', 1)
  }

  // HTTPS enforcement (production)
  app.use(httpsRedirect)

  // Security headers with comprehensive helmet configuration
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: cspDirectives,
      },
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  )

  // CORS with strict validation
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (env.corsOrigins.includes(origin)) return callback(null, true)
        return callback(new Error('Not allowed by CORS'))
      },
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400, // 24 hours
    })
  )

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
  // IP-based rate limiting (100 requests/min per IP)
  app.use(ipRateLimitingMiddleware)
  // Endpoint-based rate limiting (1000 requests/min per endpoint)
  app.use(endpointRateLimitingMiddleware)
  // User-based rate limiting (for authenticated requests)
  app.use(userRateLimitingMiddleware)

  // Reduced JSON and URL-encoded payload limits
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // Request logging
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))

  // Concurrency monitoring and pool protection
  app.use(requestTracker.middleware())
  app.use(connectionPoolMonitor.middleware())
  
  // Performance monitoring (tracks response times)
  app.use(responseTimeMonitor.middleware())

  // Apply general rate limiting to all API routes
  app.use('/api/', apiLimiter)

  // Apply strict rate limiting to auth endpoints
  app.post('/api/accounts/login', loginLimiter)
  app.post('/api/accounts/login/', loginLimiter)
  app.post('/api/accounts/register', loginLimiter)
  app.post('/api/accounts/register/', loginLimiter)
  app.post('/api/accounts/forgotten-password', loginLimiter)
  app.post('/api/accounts/forgotten-password/', loginLimiter)
  app.post('/api/accounts/find-user', loginLimiter)
  app.post('/api/accounts/find-user/', loginLimiter)
  app.post('/api/accounts/reset-forgot-password', loginLimiter)
  app.post('/api/accounts/reset-forgot-password/', loginLimiter)

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
