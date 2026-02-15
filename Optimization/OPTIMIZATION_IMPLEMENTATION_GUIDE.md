# Performance Optimization Implementation Guide

**Purpose:** Step-by-step guide to implement optimizations from the checklist.

**Duration:** 1-3 weeks depending on scope  
**Difficulty:** Intermediate to Advanced

---

## Quick Start (Do First - 2 hours)

### 1. Add MongoDB Indexes

**File:** Create `server/src/scripts/createIndexes.ts`

```typescript
import mongoose from 'mongoose'
import { env } from '../infrastructure/config/env'

async function createIndexes() {
  await mongoose.connect(env.mongoUri)
  const db = mongoose.connection.db

  console.log('Creating indexes...')

  // Applicants
  await db?.collection('applicants').createIndex({ numericId: 1 })
  await db?.collection('applicants').createIndex({ email: 1 })
  await db?.collection('applicants').createIndex({ status: 1, createdAt: -1 })
  await db?.collection('applicants').createIndex({ districtId: 1 })

  // Users
  await db?.collection('users').createIndex({ username: 1 }, { unique: true })
  await db?.collection('users').createIndex({ email: 1 })
  await db?.collection('users').createIndex({ isActive: 1 })

  // Permissions
  await db?.collection('permissions').createIndex({ codename: 1 }, { unique: true })

  // Documents
  await db?.collection('applicantdocuments').createIndex({ applicantId: 1 })
  await db?.collection('applicantdocuments').createIndex({ applicantId: 1, createdAt: -1 })

  // Audit logs
  await db?.collection('auditlogs').createIndex({ userId: 1, createdAt: -1 })
  await db?.collection('auditlogs').createIndex({ createdAt: -1 })

  console.log('✅ Indexes created')
  await mongoose.connection.close()
}

createIndexes().catch((err) => {
  console.error('Error creating indexes:', err)
  process.exit(1)
})
```

**Add to package.json:**
```json
{
  "scripts": {
    "db:index": "ts-node src/scripts/createIndexes.ts"
  }
}
```

**Run once:**
```bash
npm run db:index
```

---

### 2. Optimize Mongoose Queries

**File:** `server/src/infrastructure/database/repositories/pmc/index.ts`

**Change 1: Add `.lean()` to read-only queries**

```typescript
// ❌ BEFORE
export async function listApplicants(filters: any) {
  return ApplicantModel.find(filters)
}

// ✅ AFTER
export async function listApplicants(filters: any) {
  return ApplicantModel.find(filters).lean()
    .select('-password -internalNotes')  // Exclude heavy fields
}
```

**Change 2: Implement pagination**

```typescript
// ❌ BEFORE
export async function getApplicantsByStatus(status: string) {
  return ApplicantModel.find({ status })
}

// ✅ AFTER
export async function getApplicantsByStatus(
  status: string,
  page: number = 1,
  pageSize: number = 20
) {
  const skip = (page - 1) * pageSize
  const applicants = await ApplicantModel
    .find({ status })
    .skip(skip)
    .limit(pageSize)
    .lean()
  
  const total = await ApplicantModel.countDocuments({ status })
  
  return {
    data: applicants,
    pagination: {
      page,
      pageSize,
      total,
      pages: Math.ceil(total / pageSize)
    }
  }
}
```

**Change 3: Use aggregation for complex queries**

```typescript
// ❌ BEFORE - Multiple queries
export async function getApplicantStats(districtId: string) {
  const applicants = await ApplicantModel.find({ districtId })
  const approved = applicants.filter(a => a.status === 'approved').length
  const pending = applicants.filter(a => a.status === 'pending').length
  const rejected = applicants.filter(a => a.status === 'rejected').length
  
  return { approved, pending, rejected }
}

// ✅ AFTER - Single aggregation query
export async function getApplicantStats(districtId: string) {
  return ApplicantModel.aggregate([
    { $match: { districtId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        approved: {
          $sum: { $cond: [{ $eq: ['$_id', 'approved'] }, '$count', 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$_id', 'pending'] }, '$count', 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$_id', 'rejected'] }, '$count', 0] }
        }
      }
    }
  ])
}
```

---

### 3. Add Response Caching

**File:** `server/src/interfaces/http/middlewares/cache.ts`

```typescript
import type { Request, Response, NextFunction } from 'express'
import NodeCache from 'node-cache'

// Cache configuration
// stdTTL: standard time to live in seconds (1 hour)
// checkperiod: period in seconds for automatic delete-check (10 minutes)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 })

export function cacheMiddleware(ttl: number = 3600) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next()
    }

    // Create cache key from path and query
    const cacheKey = `${req.path}:${JSON.stringify(req.query)}`

    // Check cache
    const cached = cache.get(cacheKey)
    if (cached) {
      res.set('X-Cache', 'HIT')
      return res.json(cached)
    }

    // Store original res.json
    const originalJson = res.json.bind(res)

    // Override res.json to cache the response
    res.json = function (data: any) {
      // Don't cache error responses
      if (res.statusCode < 300) {
        cache.set(cacheKey, data, ttl)
        res.set('X-Cache', 'MISS')
      }
      return originalJson(data)
    } as any

    next()
  }
}

export function invalidateCache(pattern: string) {
  const keys = cache.keys()
  keys.forEach((key) => {
    if (key.includes(pattern)) {
      cache.del(key)
    }
  })
}
```

**Add to routes:**

```typescript
// In server/src/interfaces/http/routes/pmc.routes.ts
import { cacheMiddleware, invalidateCache } from '../middlewares/cache'

// Cache district list for 1 hour
pmcRouter.get('/districts/', cacheMiddleware(3600), getDistricts)

// Cache applicant stats for 30 minutes
pmcRouter.get('/applicants/stats/', cacheMiddleware(1800), getApplicantStats)

// Clear cache when applicant is updated
pmcRouter.put('/applicants/:id', authenticate, requirePermission(['pmc_api.change_applicantdetail']), (req, res, next) => {
  invalidateCache('/applicants')  // Clear cached applicants
  invalidateCache('/stats')  // Clear cached stats
  next()
}, updateApplicant)
```

---

### 4. Enable Parallel Queries

**File:** `server/src/infrastructure/database/repositories/pmc/index.ts`

```typescript
// ❌ BEFORE: Sequential execution (slow)
export async function getUserDashboard(userId: string) {
  const user = await UserModel.findById(userId)
  const permissions = await PermissionModel.find({ userId })
  const applicants = await ApplicantModel.find({ userId })
  const recentDocuments = await DocumentModel.find({ userId }).limit(10)
  
  return { user, permissions, applicants, recentDocuments }
}

// ✅ AFTER: Parallel execution (3x faster)
export async function getUserDashboard(userId: string) {
  const [user, permissions, applicants, recentDocuments] = await Promise.all([
    UserModel.findById(userId).lean(),
    PermissionModel.find({ userId }).lean(),
    ApplicantModel.find({ userId }).lean(),
    DocumentModel.find({ userId }).limit(10).lean()
  ])
  
  return { user, permissions, applicants, recentDocuments }
}
```

---

## Phase 2: Redis Caching Setup (1 day)

### 1. Install Redis

```bash
# Mac/Linux
brew install redis

# Or use Docker
docker run -d -p 6379:6379 redis:latest

# Windows - Install via WSL
wsl
sudo apt-get install redis-server

# Then start
redis-server
```

### 2. Create Redis Cache Service

**File:** `server/src/infrastructure/cache/redis.ts`

```typescript
import Redis from 'ioredis'
import { env } from '../config/env'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableReadyCheck: false,
  enableOfflineQueue: false,
})

redis.on('error', (err) => {
  console.error('Redis error:', err)
})

redis.on('connect', () => {
  console.log('Redis connected')
})

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached) : null
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

export async function setCache<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value))
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

export async function deleteCache(pattern: string): Promise<number> {
  try {
    if (pattern.includes('*')) {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        return redis.del(...keys)
      }
      return 0
    } else {
      return redis.del(pattern)
    }
  } catch (error) {
    console.error('Cache delete error:', error)
    return 0
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    await redis.flushdb()
  } catch (error) {
    console.error('Cache clear error:', error)
  }
}

export default redis
```

### 3. Update Routes to Use Redis

```typescript
// In routes that get called frequently
import { getCache, setCache, deleteCache } from '../infrastructure/cache/redis'

export async function getDistricts(req: Request, res: Response) {
  const cacheKey = 'districts:all'
  
  // Try cache first
  let districts = await getCache(cacheKey)
  if (!districts) {
    // Query database
    districts = await DistrictModel.find().lean()
    // Cache for 1 hour
    await setCache(cacheKey, districts, 3600)
  }
  
  res.json(districts)
}

// When updating districts, invalidate cache
export async function updateDistrict(req: Request, res: Response) {
  const district = await DistrictModel.findByIdAndUpdate(req.params.id, req.body)
  
  // Invalidate related caches
  await deleteCache('districts:*')
  
  res.json(district)
}
```

### 4. Add to .env

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

---

## Phase 3: Frontend Optimization (1 day)

### 1. Code Splitting

**File:** `client/src/config/routes.tsx`

```typescript
import { lazy, Suspense } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'

// ✅ Lazy load heavy pages
const Dashboard = lazy(() => import('@/views/Dashboard'))
const ReviewApplications = lazy(() => import('@/views/ReviewApplications'))
const AnalyticsView = lazy(() => import('@/views/AnalyticsView'))
const DocumentsView = lazy(() => import('@/views/DocumentsView'))

export const appRoutes = [
  {
    path: '/dashboard',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <Dashboard />
      </Suspense>
    ),
  },
  {
    path: '/review',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <ReviewApplications />
      </Suspense>
    ),
  },
  // ... more routes
]
```

### 2. Update Vite Config

**File:** `client/vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [react(), visualizer()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@tanstack/react-table'],
          'charts': ['react-apexcharts', 'recharts'],
        }
      }
    },
    // Treeshake unused code
    rollupOptions: {
      output: {
        format: 'es',
      }
    }
  }
})
```

### 3. Implement SWR Caching

**File:** `client/src/api/useApplicants.ts`

```typescript
import useSWR from 'swr'
import { fetcher } from './client'

export interface UseApplicantsOptions {
  page?: number
  limit?: number
  status?: string
  skip?: boolean
}

export function useApplicants(options: UseApplicantsOptions = {}) {
  const { page = 1, limit = 20, status, skip = false } = options
  
  const params = new URLSearchParams()
  params.append('page', page.toString())
  params.append('limit', limit.toString())
  if (status) params.append('status', status)
  
  const { data, error, isLoading, mutate } = useSWR(
    skip ? null : `/api/applicants?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60 * 1000,  // 1 minute - don't fetch same URL twice in 1min
      focusThrottleInterval: 5 * 60 * 1000,  // 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  )
  
  return {
    applicants: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate  // Use to refresh data
  }
}
```

### 4. Implement Debounced Search

**File:** `client/src/components/ApplicantSearch.tsx`

```typescript
import { useState, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import useSWR from 'swr'

export function ApplicantSearch() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  
  // Debounce search query - wait 500ms after user stops typing
  const debouncedSearch = useDebouncedCallback((newQuery: string) => {
    setDebouncedQuery(newQuery)
  }, 500)
  
  const { data: results } = useSWR(
    debouncedQuery ? `/api/applicants/search?q=${debouncedQuery}` : null,
    fetcher
  )
  
  const handleSearchChange = (value: string) => {
    setQuery(value)
    debouncedSearch(value)
  }
  
  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Search applicants..."
      />
      {results && <ResultsList results={results} />}
    </div>
  )
}
```

---

## Phase 4: Monitoring Setup (1 day)

### 1. Add Response Time Tracking

**File:** `server/src/interfaces/http/middlewares/timing.ts`

```typescript
import type { Request, Response, NextFunction } from 'express'

const SLOW_THRESHOLD = 1000  // 1 second

interface RouteMetrics {
  count: number
  totalTime: number
  slowRequests: number
  errors: number
}

const metrics = new Map<string, RouteMetrics>()

export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  const routePath = `${req.method} ${req.path}`
  
  res.on('finish', () => {
    const duration = Date.now() - start
    
    // Track metrics
    if (!metrics.has(routePath)) {
      metrics.set(routePath, { count: 0, totalTime: 0, slowRequests: 0, errors: 0 })
    }
    
    const metric = metrics.get(routePath)!
    metric.count++
    metric.totalTime += duration
    if (duration > SLOW_THRESHOLD) metric.slowRequests++
    if (res.statusCode >= 400) metric.errors++
    
    // Log slow requests
    if (duration > SLOW_THRESHOLD) {
      console.warn(`⚠️  SLOW: ${routePath} - ${duration}ms (${res.statusCode})`)
    }
  })
  
  next()
}

// Endpoint to view metrics
export function getMetrics() {
  const result: any = {}
  
  metrics.forEach((metric, route) => {
    const avgTime = metric.totalTime / metric.count
    const slowRate = ((metric.slowRequests / metric.count) * 100).toFixed(1)
    const errorRate = ((metric.errors / metric.count) * 100).toFixed(1)
    
    result[route] = {
      requests: metric.count,
      avgTime: Math.round(avgTime),
      slowRequests: metric.slowRequests,
      slowRate: `${slowRate}%`,
      errors: metric.errors,
      errorRate: `${errorRate}%`
    }
  })
  
  return result
}
```

**Add to app.ts:**

```typescript
import { responseTimeMiddleware } from './interfaces/http/middlewares/timing'

app.use(responseTimeMiddleware)

// Expose metrics endpoint (admin only)
app.get('/api/admin/metrics', authenticate, requirePermission(['admin']), (req, res) => {
  res.json(getMetrics())
})
```

### 2. Memory Monitoring

**File:** `server/src/infrastructure/monitoring/memory.ts`

```typescript
export function initMemoryMonitoring() {
  setInterval(() => {
    const used = process.memoryUsage()
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024)
    const externalMB = Math.round(used.external / 1024 / 1024)
    
    console.log(
      `Memory: ${heapUsedMB}MB / ${heapTotalMB}MB (heap) + ${externalMB}MB (external)`
    )
    
    // Alert if memory usage is high
    const heapPercent = used.heapUsed / used.heapTotal
    if (heapPercent > 0.9) {
      console.error(`⚠️  HIGH MEMORY: ${(heapPercent * 100).toFixed(1)}% heap used`)
    }
  }, 60000)  // Every minute
}
```

---

## Testing Performance

### 1. Load Testing

```bash
# Install autocannon
npm install -g autocannon

# Test API endpoint
autocannon -c 100 -d 10 http://localhost:4000/api/applicants

# Results show:
# - Throughput (requests/sec)
# - Latency (average, p99)
# - Error rate
```

### 2. Database Query Profiling

```typescript
// Enable in development
mongoose.set('debug', true)

// In production, check slow query log
// mongosh
// > db.setProfilingLevel(1, { slowms: 100 })  // Log queries > 100ms
// > db.system.profile.find({ millis: { $gt: 100 } })
```

---

## Performance Targets

Update as you implement:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| API response (p95) | < 200ms | TBD | ⏳ |
| DB query time | < 50ms | TBD | ⏳ |
| First Paint | < 1.5s | TBD | ⏳ |
| Time to Interactive | < 3.5s | TBD | ⏳ |
| Lighthouse Score | > 90 | TBD | ⏳ |
| Error rate | < 0.1% | TBD | ⏳ |

---

## Dependencies to Add

```bash
cd server
npm install ioredis
npm install node-cache

cd ../client
npm install swr
npm install use-debounce
npm install --save-dev rollup-plugin-visualizer
```

---

**Next Step:** Start with Quick Start section above (2 hours of work)  
**Total Implementation Time:** 1-3 weeks  
**Expected Improvement:** 2-5x faster app performance

