# Performance & Optimization Checklist

**Goal:** Make the PMC MERN application run faster, more efficiently, and with better resource utilization.

**Status:** Ready for implementation  
**Date Created:** February 14, 2026

---

## 📊 Table of Contents

1. [Database Optimization](#database-optimization)
2. [Backend Performance](#backend-performance)
3. [Frontend Performance](#frontend-performance)
4. [Caching Strategy](#caching-strategy)
5. [Monitoring & Profiling](#monitoring--profiling)
6. [Infrastructure Optimization](#infrastructure-optimization)

---

## Database Optimization

### Indexing Strategy

- [ ] **Create indexes on frequently queried fields**
  ```javascript
  // In MongoDB, add these indexes to speed up queries
  
  // Applicants collection
  db.applicants.createIndex({ numericId: 1 })          // Login queries
  db.applicants.createIndex({ email: 1 })              // Email lookups
  db.applicants.createIndex({ status: 1, createdAt: -1 }) // Status + time queries
  db.applicants.createIndex({ districtId: 1 })         // District filtering
  db.applicants.createIndex({ applicantId: 1 })        // Application lookups
  
  // Users collection
  db.users.createIndex({ username: 1 }, { unique: true })  // Unique constraint
  db.users.createIndex({ email: 1 })                        // Email lookups
  db.users.createIndex({ isActive: 1 })                     // Active user queries
  
  // Permissions collection
  db.permissions.createIndex({ codename: 1 }, { unique: true }) // Permission lookups
  db.permissions.createIndex({ name: 1 })                        // Name search
  
  // Documents collection
  db.applicantdocuments.createIndex({ applicantId: 1 })      // Document by applicant
  db.applicantdocuments.createIndex({ createdAt: -1 })       // Recent documents
  db.applicantdocuments.createIndex({ applicantId: 1, createdAt: -1 }) // Compound index
  
  // Inspections collection
  db.inspections.createIndex({ applicantId: 1 })             // Inspection by applicant
  db.inspections.createIndex({ status: 1, createdAt: -1 })   // Status + time
  db.inspections.createIndex({ districtId: 1 })              // District filtering
  
  // Audit logs collection
  db.auditlogs.createIndex({ userId: 1, createdAt: -1 })     // User activity
  db.auditlogs.createIndex({ action: 1, createdAt: -1 })     // Action tracking
  db.auditlogs.createIndex({ createdAt: -1 })                // Time-based cleanup
  ```
  **Why:** Indexes speed up queries 10-100x. Essential for filtering, sorting, and lookups.

- [ ] **Remove unused indexes**
  ```javascript
  // Check index usage
  db.collection.aggregate([{ $indexStats: {} }])
  
  // Remove unused indexes
  db.applicants.dropIndex("oldIndexName")
  ```

- [ ] **Optimize compound indexes**
  ```javascript
  // For queries like: db.find({ status: 'active', createdAt: { $gt: date } }).sort({ createdAt: -1 })
  // Create compound index: status ascending, createdAt descending
  db.applicants.createIndex({ status: 1, createdAt: -1 })
  ```

### Query Optimization

- [ ] **Use projection to limit fields returned**
  ```typescript
  // ❌ BAD: Returns all fields
  const user = await UserModel.findById(userId)
  
  // ✅ GOOD: Returns only needed fields
  const user = await UserModel.findById(userId).select('id username email permissions')
  
  // ✅ EVEN BETTER: Exclude heavy fields
  const user = await UserModel.findById(userId).select('-password -auditLogs')
  ```

- [ ] **Use `.lean()` for read-only queries**
  ```typescript
  // ❌ BAD: Returns Mongoose documents (slower, uses memory)
  const applicants = await ApplicantModel.find({ status: 'approved' })
  
  // ✅ GOOD: Returns plain JavaScript objects (faster, less memory)
  const applicants = await ApplicantModel.find({ status: 'approved' }).lean()
  ```

- [ ] **Implement pagination for large result sets**
  ```typescript
  // ❌ BAD: Returns all 100,000 records
  const allApplicants = await ApplicantModel.find({})
  
  // ✅ GOOD: Returns 20 per page
  const page = req.query.page || 1
  const pageSize = 20
  const applicants = await ApplicantModel
    .find({})
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean()
  
  const total = await ApplicantModel.countDocuments({})
  res.json({ 
    data: applicants, 
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } 
  })
  ```

- [ ] **Use aggregation pipeline for complex queries**
  ```typescript
  // ❌ BAD: Multiple database calls
  const districts = await DistrictModel.find({})
  const applicantsByDistrict = await Promise.all(
    districts.map(d => ApplicantModel.find({ districtId: d.id }))
  )
  
  // ✅ GOOD: Single aggregation query
  const result = await ApplicantModel.aggregate([
    {
      $group: {
        _id: '$districtId',
        count: { $sum: 1 },
        avgScore: { $avg: '$score' },
      }
    },
    {
      $lookup: {
        from: 'districts',
        localField: '_id',
        foreignField: 'districtId',
        as: 'district'
      }
    },
    {
      $match: { 'district.0': { $exists: true } }
    }
  ])
  ```

- [ ] **Batch operations instead of individual inserts**
  ```typescript
  // ❌ BAD: 1000 database queries for 1000 records
  for (const record of records) {
    await Model.create(record)
  }
  
  // ✅ GOOD: Single database query
  await Model.insertMany(records, { ordered: false })
  ```

- [ ] **Use updateMany/deleteMany instead of loops**
  ```typescript
  // ❌ BAD: 100 database queries
  const users = await UserModel.find({ inactive: true })
  for (const user of users) {
    await user.deleteOne()
  }
  
  // ✅ GOOD: Single database query
  await UserModel.deleteMany({ inactive: true })
  ```

### Connection & Pooling

- [ ] **Enable MongoDB connection pooling**
  ```typescript
  // In MongoDB connection config
  const mongoOptions = {
    maxPoolSize: 10,        // Adjust based on concurrent connections
    minPoolSize: 2,         // Keep minimum connections open
    maxIdleTimeMS: 45000,   // Close idle connections
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }
  
  await mongoose.connect(mongoUri, mongoOptions)
  ```

- [ ] **Implement connection health checks**
  ```typescript
  // Monitor connection status
  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected')
  })
  
  mongoose.connection.on('disconnected', () => {
    console.error('MongoDB disconnected - attempting reconnect')
  })
  
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err)
  })
  ```

---

## Backend Performance

### Code Optimization

- [ ] **Implement memoization for expensive computations**
  ```typescript
  import NodeCache from 'node-cache'
  
  const cache = new NodeCache({ stdTTL: 3600 })  // 1 hour TTL
  
  export async function getDistrictStats(districtId: string) {
    // Check cache first
    const cached = cache.get(`district_stats_${districtId}`)
    if (cached) return cached
    
    // Expensive computation
    const stats = await ApplicantModel.aggregate([
      { $match: { districtId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgProcessingTime: { $avg: '$processingTime' }
        }
      }
    ])
    
    // Cache result
    cache.set(`district_stats_${districtId}`, stats)
    return stats
  }
  ```

- [ ] **Use async/await properly to avoid blocking**
  ```typescript
  // ❌ BAD: Sequential execution (slow)
  const user = await UserModel.findById(userId)
  const permissions = await PermissionModel.find({ userId })
  const documents = await DocumentModel.find({ userId })
  
  // ✅ GOOD: Parallel execution
  const [user, permissions, documents] = await Promise.all([
    UserModel.findById(userId),
    PermissionModel.find({ userId }),
    DocumentModel.find({ userId }),
  ])
  ```

- [ ] **Implement request timeout limits**
  ```typescript
  // In app.ts
  app.use((req, res, next) => {
    res.setTimeout(30000, () => {  // 30 second timeout
      res.status(408).json({ message: 'Request timeout' })
    })
    next()
  })
  ```

- [ ] **Use streaming for large file downloads**
  ```typescript
  // ❌ BAD: Loads entire file into memory
  app.get('/download/:id', async (req, res) => {
    const data = await fs.promises.readFile(path)
    res.send(data)
  })
  
  // ✅ GOOD: Streams file directly (minimal memory)
  app.get('/download/:id', async (req, res) => {
    const stream = fs.createReadStream(path)
    stream.pipe(res)
  })
  ```

### Memory Management

- [ ] **Implement garbage collection strategies**
  ```bash
  # Start Node with specific memory settings
  node --max-old-space-size=2048 dist/server.js  # 2GB heap
  ```

- [ ] **Monitor memory usage**
  ```typescript
  // Add memory monitoring
  setInterval(() => {
    const used = process.memoryUsage()
    console.log(`Memory: ${Math.round(used.heapUsed / 1024 / 1024)}MB / ${Math.round(used.heapTotal / 1024 / 1024)}MB`)
  }, 60000)  // Every minute
  ```

- [ ] **Clear caches periodically**
  ```typescript
  // Clear large caches every hour to prevent memory leaks
  setInterval(() => {
    cache.flushAll()
  }, 3600000)  // Every hour
  ```

### Async Processing

- [ ] **Move heavy operations to background jobs**
  ```typescript
  // For: report generation, email sending, analytics
  
  // Using Bull queue (install: npm install bull redis)
  import Queue from 'bull'
  
  const reportQueue = new Queue('reports', 'redis://localhost:6379')
  
  // Trigger job (returns immediately)
  export async function generateReport(userId: string) {
    await reportQueue.add(
      { userId },
      { delay: 5000, attempts: 3 }  // Retry 3 times
    )
    res.json({ message: 'Report generation started' })
  }
  
  // Process jobs in background
  reportQueue.process(async (job) => {
    const report = await createExpensiveReport(job.data.userId)
    await sendEmailWithReport(job.data.userId, report)
    return { success: true }
  })
  ```

- [ ] **Implement webhook instead of polling**
  ```typescript
  // ❌ BAD: Frontend polls every 5 seconds (100 requests/min)
  setInterval(() => {
    const status = await fetch('/api/application/status')
  }, 5000)
  
  // ✅ GOOD: Server pushes updates via webhook
  // Backend sends POST to frontend when status changes
  if (statusChanged) {
    await fetch(`${webhookUrl}`, {
      method: 'POST',
      body: JSON.stringify({ applicantId, newStatus })
    })
  }
  ```

---

## Frontend Performance

### Bundle Optimization

- [ ] **Enable code splitting for large components**
  ```typescript
  // src/components/routes.tsx
  import { lazy, Suspense } from 'react'
  import LoadingSpinner from '@/components/LoadingSpinner'
  
  // ❌ BAD: Everything in one bundle
  import ReviewApplicationForm from '@/views/ReviewApplicationForm'
  
  // ✅ GOOD: Split into separate chunks
  const ReviewApplicationForm = lazy(() => import('@/views/ReviewApplicationForm'))
  const AnalyticsView = lazy(() => import('@/views/AnalyticsView'))
  
  export const appRoutes = [
    {
      path: '/review',
      element: (
        <Suspense fallback={<LoadingSpinner />}>
          <ReviewApplicationForm />
        </Suspense>
      )
    }
  ]
  ```

- [ ] **Analyze bundle size**
  ```bash
  # Install bundle analyzer
  npm install --save-dev vite-plugin-visualizer
  
  # Run analysis
  npm run build
  # Opens visualization in browser
  ```

- [ ] **Tree-shake unused code**
  ```typescript
  // In vite.config.ts
  export default {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@tanstack/react-table', 'react-select'],
            'charts': ['react-apexcharts', 'recharts'],
          }
        }
      }
    }
  }
  ```

- [ ] **Lazy load images and components**
  ```typescript
  // Use native lazy loading
  <img src="..." loading="lazy" alt="..." />
  
  // Or use intersection observer for React
  import { useInView } from 'react-intersection-observer'
  
  export function LazyImage({ src }) {
    const { ref, inView } = useInView({ triggerOnce: true })
    return (
      <div ref={ref}>
        {inView && <img src={src} alt="" />}
      </div>
    )
  }
  ```

### API Optimization

- [ ] **Implement client-side caching (SWR)**
  ```typescript
  // src/api/useApplicants.ts
  import useSWR from 'swr'
  
  export function useApplicants(type: string) {
    // Auto caches, dedupes, refocuses on window
    const { data, error } = useSWR(
      `/api/applicants?type=${type}`,
      fetcher,
      {
        revalidateOnFocus: false,
        dedupingInterval: 60000,  // 1 minute
        focusThrottleInterval: 300000,  // 5 minutes
      }
    )
    
    return { data, error }
  }
  ```

- [ ] **Implement request debouncing**
  ```typescript
  // For search inputs
  import { useDebouncedCallback } from 'use-debounce'
  
  export function SearchApplicants() {
    const [search, setSearch] = useState('')
    
    const debouncedSearch = useDebouncedCallback(async (query) => {
      const results = await fetch(`/api/applicants/search?q=${query}`)
      setResults(results)
    }, 500)  // Wait 500ms after user stops typing
    
    return <input onChange={(e) => debouncedSearch(e.target.value)} />
  }
  ```

- [ ] **Paginate large lists**
  ```typescript
  // Show 20 per page instead of loading 10,000
  const [page, setPage] = useState(1)
  
  const { data: applicants } = useSWR(
    `/api/applicants?page=${page}&limit=20`,
    fetcher
  )
  ```

### Rendering Optimization

- [ ] **Memoize expensive components**
  ```typescript
  // ❌ BAD: Rerenders on every parent change
  export function ApplicantTable({ applicants }) {
    return (
      <div>
        {applicants.map(a => (
          <ApplicantRow key={a.id} applicant={a} />
        ))}
      </div>
    )
  }
  
  // ✅ GOOD: Only rerenders if applicants prop changes
  export const ApplicantTable = memo(({ applicants }) => {
    return (
      <div>
        {applicants.map(a => (
          <ApplicantRow key={a.id} applicant={a} />
        ))}
      </div>
    )
  })
  ```

- [ ] **Use useMemo for computed values**
  ```typescript
  // ❌ BAD: Recalculates stats on every render
  export function Dashboard({ applicants }) {
    const totalApplicants = applicants.length
    const approved = applicants.filter(a => a.status === 'approved').length
    const pendingRate = approved / totalApplicants
    
    return <div>{pendingRate}</div>
  }
  
  // ✅ GOOD: Only recalculates if applicants changes
  export function Dashboard({ applicants }) {
    const stats = useMemo(() => {
      const total = applicants.length
      const approved = applicants.filter(a => a.status === 'approved').length
      return { total, approved, approvalRate: approved / total }
    }, [applicants])
    
    return <div>{stats.approvalRate}</div>
  }
  ```

- [ ] **Virtualize long lists with react-window**
  ```typescript
  // For lists with 1000+ items
  import { FixedSizeList } from 'react-window'
  
  export function LargeApplicantList({ applicants }) {
    return (
      <FixedSizeList
        height={600}
        itemCount={applicants.length}
        itemSize={50}
      >
        {({ index, style }) => (
          <div style={style}>
            <ApplicantRow applicant={applicants[index]} />
          </div>
        )}
      </FixedSizeList>
    )
  }
  ```

---

## Caching Strategy

### API Response Caching

- [ ] **Implement Redis caching for frequently accessed data**
  ```typescript
  // Install: npm install redis ioredis
  
  import Redis from 'ioredis'
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  })
  
  // Cache middleware
  export function cacheMiddleware(ttl: number = 3600) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip cached for non-GET requests
      if (req.method !== 'GET') return next()
      
      const key = `${req.path}:${JSON.stringify(req.query)}`
      const cached = await redis.get(key)
      
      if (cached) {
        res.set('X-Cache', 'HIT')
        return res.json(JSON.parse(cached))
      }
      
      // Override res.json to cache responses
      const originalJson = res.json.bind(res)
      res.json = (data) => {
        redis.setex(key, ttl, JSON.stringify(data))
        res.set('X-Cache', 'MISS')
        return originalJson(data)
      }
      
      next()
    }
  }
  
  // Apply to routes
  app.get('/api/districts', cacheMiddleware(3600), getDistricts)
  ```

- [ ] **Cache invalidation strategy**
  ```typescript
  // When data is updated, invalidate related caches
  export async function updateApplicant(id: string, data: any) {
    await ApplicantModel.findByIdAndUpdate(id, data)
    
    // Invalidate caches
    await redis.del(`/api/applicants:*`)  // Clear applicant lists
    await redis.del(`/api/applicants/${id}`)  // Clear specific applicant
    await redis.del(`/api/statistics:*`)  // Clear stats
  }
  ```

### Client-Side Caching

- [ ] **Use browser cache headers**
  ```typescript
  // In server response headers
  app.get('/api/static-data', (req, res) => {
    res.set({
      'Cache-Control': 'public, max-age=86400',  // 24 hours
      'ETag': generateETag(data),
    })
    res.json(data)
  })
  
  // Dynamic data (short TTL)
  app.get('/api/applicants', (req, res) => {
    res.set({
      'Cache-Control': 'private, max-age=300',  // 5 minutes
    })
    res.json(applicants)
  })
  ```

- [ ] **Implement service worker caching**
  ```typescript
  // In public/service-worker.js
  const CACHE_NAME = 'pmc-v1'
  const urlsToCache = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/scripts/main.js',
  ]
  
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urlsToCache)
      })
    )
  })
  
  self.addEventListener('fetch', (event) => {
    if (event.request.method === 'GET') {
      event.respondWith(
        caches.match(event.request).then((response) => {
          return response || fetch(event.request)
        })
      )
    }
  })
  ```

---

## Monitoring & Profiling

### Performance Metrics

- [ ] **Track Core Web Vitals**
  ```typescript
  // src/utils/performanceMonitoring.ts
  import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'
  
  export function initPerformanceMonitoring() {
    getCLS((metric) => {
      console.log('CLS (Cumulative Layout Shift):', metric.value)
      // Send to analytics: sendToAnalytics('CLS', metric.value)
    })
    
    getFID((metric) => {
      console.log('FID (First Input Delay):', metric.value)
    })
    
    getLCP((metric) => {
      console.log('LCP (Largest Contentful Paint):', metric.value)
    })
    
    getTTFB((metric) => {
      console.log('TTFB (Time to First Byte):', metric.value)
    })
  }
  ```

- [ ] **Monitor API response times**
  ```typescript
  // middleware/timing.ts
  export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction) {
    const start = Date.now()
    
    res.on('finish', () => {
      const duration = Date.now() - start
      console.log(`${req.method} ${req.path} - ${duration}ms - ${res.statusCode}`)
      
      // Alert if slow
      if (duration > 1000) {
        console.warn(`⚠️  SLOW REQUEST: ${req.path} took ${duration}ms`)
      }
    })
    
    next()
  }
  ```

- [ ] **Track database query times**
  ```typescript
  // Mongoose query profiling
  mongoose.set('debug', true)  // Enable in development
  
  // In production, use more selective logging
  mongoose.set('debug', (collectionName, method, query, doc, options) => {
    const start = Date.now()
    // Log after query completes
    console.log(`DB: ${collectionName}.${method}() - ${Date.now() - start}ms`)
  })
  ```

### APM & Monitoring Tools

- [ ] **Add APM tool for production monitoring**
  ```bash
  # Option 1: New Relic
  npm install newrelic
  # Requires: NEW_RELIC_LICENSE_KEY environment variable
  
  # Option 2: Datadog
  npm install dd-trace
  # Requires: DD_API_KEY environment variable
  
  # Option 3: Sentry (error tracking)
  npm install @sentry/node
  ```

- [ ] **Set up performance alerts**
  ```typescript
  // Alert when metrics exceed thresholds
  const THRESHOLDS = {
    apiResponseTime: 500,      // ms
    databaseQueryTime: 100,    // ms
    errorRate: 0.01,           // 1%
    memoryUsage: 500,          // MB
  }
  
  export function checkPerformanceHealth() {
    if (metrics.apiResponseTime > THRESHOLDS.apiResponseTime) {
      sendAlert(`API response slow: ${metrics.apiResponseTime}ms`)
    }
  }
  ```

---

## Infrastructure Optimization

### Horizontal Scaling

- [ ] **Enable clustering for multi-core utilization**
  ```typescript
  // server/src/server.ts
  import cluster from 'cluster'
  import os from 'os'
  
  if (cluster.isMaster) {
    // Fork workers
    const numCPUs = os.cpus().length
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork()
    }
    
    cluster.on('exit', (worker) => {
      console.log(`Worker ${worker.process.pid} died`)
      cluster.fork()  // Respawn
    })
  } else {
    // Worker process
    createApp().listen(env.port)
  }
  ```

- [ ] **Use load balancer (Nginx)**
  ```nginx
  upstream pmc_app {
    server localhost:4001;
    server localhost:4002;
    server localhost:4003;
    server localhost:4004;
  }
  
  server {
    listen 80;
    server_name yourdomain.com;
    
    # Load balance across multiple Node instances
    location /api {
      proxy_pass http://pmc_app;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
    }
  }
  ```

- [ ] **Enable HTTP/2 and HTTP keep-alive**
  ```nginx
  server {
    listen 443 ssl http2;
    
    # Keep-alive connections
    keepalive_timeout 65;
    keepalive_requests 100;
  }
  ```

### CDN & Static Asset Delivery

- [ ] **Serve static assets from CDN**
  ```typescript
  // Update asset URLs to CDN
  const CDN_URL = process.env.CDN_URL || 'https://cdn.example.com'
  
  // In responses
  res.json({
    profile_image: `${CDN_URL}/images/profile-${id}.jpg`,
    documents: docs.map(d => ({
      ...d,
      url: `${CDN_URL}/docs/${d.filename}`
    }))
  })
  ```

- [ ] **Enable Gzip compression** (already in app.ts)
  ```typescript
  app.use(compression())  // ✅ Already configured
  ```

- [ ] **Minify and optimize images**
  ```bash
  # Use image optimization service
  npm install sharp
  
  # Or use CDN transformation
  # Instead of: image.jpg?w=500&h=300&q=80
  # CDN handles resizing automatically
  ```

### Database Optimization

- [ ] **Enable MongoDB transactions for consistency**
  ```typescript
  const session = await mongoose.startSession()
  session.startTransaction()
  
  try {
    await ApplicantModel.updateOne({ _id: id }, { status: 'approved' }, { session })
    await AuditLogModel.create([auditEntry], { session })
    await session.commitTransaction()
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
  ```

- [ ] **Enable replication & backup**
  ```bash
  # In MongoDB Atlas settings:
  # ✅ Enable automated backups
  # ✅ Configure backup window (off-peak hours)
  # ✅ Set retention period (30 days minimum)
  # ✅ Configure cross-region backup
  ```

---

## Performance Targets

Set these as your optimization goals:

| Metric | Target | Current |
|--------|--------|---------|
| API response time (p95) | < 200ms | TBD |
| Database query time | < 50ms | TBD |
| Page load time (First Paint) | < 1.5s | TBD |
| Time to Interactive | < 3.5s | TBD |
| Lighthouse Score | > 90 | TBD |
| Error rate | < 0.1% | TBD |
| Memory usage per instance | < 500MB | TBD |
| DB connections | < maxPoolSize | TBD |

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 days)
- [ ] Add database indexes
- [ ] Implement `.lean()` on read-only queries
- [ ] Add pagination
- [ ] Memoize expensive computations
- [ ] Enable compression (already done)
- [ ] Implement response caching headers

### Phase 2: Moderate Work (3-5 days)
- [ ] Implement Redis caching
- [ ] Set up monitoring/APM
- [ ] Optimize frontend with code splitting
- [ ] Batch database operations
- [ ] Add query timing logs
- [ ] Implement virtual scrolling for large lists

### Phase 3: Major Refactors (1-2 weeks)
- [ ] Enable clustering/multi-process
- [ ] Implement background job queue
- [ ] Set up CDN
- [ ] Refactor complex queries to aggregation pipeline
- [ ] Implement progressive image loading
- [ ] Set up A/B testing infrastructure

### Phase 4: Infrastructure (Ongoing)
- [ ] Load testing
- [ ] Performance profiling
- [ ] Database tuning
- [ ] Network optimization
- [ ] Cost optimization

---

## Testing Performance

### Load Testing

```bash
# Install Apache Bench or similar
npm install -g autocannon
autocannon -c 100 -d 10 http://localhost:4000/api/applicants
```

### Profiling

```bash
# CPU profiling
node --inspect dist/server.js
# Then open chrome://inspect

# Memory profiling
node --inspect-brk dist/server.js
```

---

## Monitoring Dashboard

Create a dashboard tracking:
- API response times (by endpoint)
- Database query times
- Error rates
- Memory/CPU usage
- Cache hit rate
- Active user count
- Failed requests

---

## Documentation

Document optimizations made:
- [ ] Which indexes created and why
- [ ] Caching strategy for each endpoint
- [ ] Rate limiting configuration
- [ ] Performance targets met/not met
- [ ] Known bottlenecks

---

## Checklist Completion

**Completed:** ___/50+ items  
**Performance Improvement:** ___% faster  
**Date Completed:** ______________

---

**Implementation Status:** ⏳ Ready for implementation  
**Last Updated:** February 14, 2026

