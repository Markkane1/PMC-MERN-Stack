# Performance Optimization Roadmap

**Objective:** Systematically optimize the PMC MERN application to run 3-5x faster.

**Timeline:** 3 weeks (flexible based on team size)  
**Expected Outcome:** 3-5x performance improvement across all metrics

---

## Executive Summary

| Phase | Duration | Impact | Effort |
|-------|----------|--------|--------|
| **Quick Wins** | 2 hours | 2-3x faster | Low |
| **Phase 1** | 2-3 days | 3x faster queries | Medium |
| **Phase 2** | 3-5 days | 2x faster APIs | Medium |
| **Phase 3** | 3-5 days | 2x faster UI | Medium-High |
| **Monitoring** | Ongoing | Maintain gains | Low |

**Total Time Investment:** 1-3 weeks  
**Team Needed:** 1-2 engineers

---

## Week 1: Quick Wins (2 hours - Start Today!)

**Goal:** Get immediate performance boost with minimal effort.

### Day 1 Morning (2 hours)

#### Task 1.1: Create Database Indexes (45 min)
```bash
# 1. Create the indexes file
cat > server/src/scripts/createIndexes.ts << 'EOF'
# (see OPTIMIZATION_IMPLEMENTATION_GUIDE.md for full code)
EOF

# 2. Add to package.json
npm pkg set scripts.db:index="ts-node src/scripts/createIndexes.ts"

# 3. Run it
npm run db:index
```

**Verify:**
```bash
mongosh
> use pmis
> db.applicants.getIndexes()
# Should show: numericId_1, email_1, status_1_createdAt_-1, etc.
```

**Impact:** ✅ 10x faster user lookups, applicant searches  
**Time to Value:** Immediate

---

#### Task 1.2: Add `.lean()` to Hot Queries (45 min)

**Find these queries:**
```bash
grep -r "find(" server/src --include="*.ts" | grep -v ".lean()"
```

**Quick patches to make:**
```typescript
// File: server/src/infrastructure/database/repositories/pmc/index.ts

// Search for these functions and add .lean()
- ApplicantModel.find(...)          → ApplicantModel.find(...).lean()
- UserModel.findById(...)           → UserModel.findById(...).lean()
- PermissionModel.find(...)         → PermissionModel.find(...).lean()
- DocumentModel.find(...)           → DocumentModel.find(...).lean()
```

**Check:**
```bash
# After editing, verify compilation
npm run build --prefix server
```

**Impact:** ✅ 2-3x faster read queries  
**Time to Value:** Immediate

---

#### Task 1.3: Add Response Caching (30 min)

**Create cache middleware:**
```bash
cp server/src/interfaces/http/middlewares/error.ts \
   server/src/interfaces/http/middlewares/cache.ts
# Then edit cache.ts (see OPTIMIZATION_IMPLEMENTATION_GUIDE.md)
```

**Apply to hot endpoints:**
```typescript
// File: server/src/interfaces/http/routes/pmc.routes.ts

import { cacheMiddleware } from '../middlewares/cache'

// Add to GET endpoints (read-only)
pmcRouter.get('/districts/', cacheMiddleware(3600), getDistricts)
pmcRouter.get('/applicants/stats', cacheMiddleware(1800), getStats)
```

**Impact:** ✅ Cached endpoints 100x faster (no DB query)  
**Time to Value:** Immediate

---

### Week 1 Results

**Expected Performance Gains:**
- Database queries: **200ms → 30ms** (6-7x faster) 🔥
- API response: **800ms → 250ms** (3x faster) 🔥
- First user interaction: **2s → 600ms** (3x faster) 🔥

**Verification:**
```bash
# Test a query before and after
curl -w "Time: %{time_total}s\n" http://localhost:4000/api/applicants

# Should see significant speedup
```

---

## Week 2: Database & Backend Optimization

**Goal:** Optimize data queries and API performance.

### Day 1: Query Optimization (4 hours)

#### Task 2.1: Implement Pagination (2 hours)

**Find all list endpoints:**
```bash
grep -r "\.find(" server/src/interfaces/http/controllers --include="*.ts" | head -20
```

**Update each one:**
```typescript
// Before
export async function listApplicants(req: Request, res: Response) {
  const applicants = await ApplicantModel.find().lean()
  res.json(applicants)
}

// After
export async function listApplicants(req: Request, res: Response) {
  const page = Number(req.query.page) || 1
  const pageSize = 20
  
  const [data, total] = await Promise.all([
    ApplicantModel.find()
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    ApplicantModel.countDocuments()
  ])
  
  res.json({
    data,
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) }
  })
}
```

**Test:**
```bash
curl "http://localhost:4000/api/applicants?page=1"
# Should return max 20 items + pagination info
```

#### Task 2.2: Convert Complex Queries to Aggregation (2 hours)

**Find complex queries** (multiple filters, calculations):
```bash
grep -r "filter(" server/src --include="*.ts" | head -10
# These are Java-style operations that should be aggregation
```

**Example conversion:**
```typescript
// ❌ BAD: Load all, then filter in code
export async function getStats(districtId: string) {
  const applicants = await ApplicantModel.find({ districtId })
  const approved = applicants.filter(a => a.status === 'approved').length
  return { approved, pending: applicants.length - approved }
}

// ✅ GOOD: Single database query
export async function getStats(districtId: string) {
  const [result] = await ApplicantModel.aggregate([
    { $match: { districtId } },
    {
      $facet: {
        approved: [{ $match: { status: 'approved' } }, { $count: 'count' }],
        total: [{ $count: 'count' }]
      }
    }
  ])
  return {
    approved: result.approved[0]?.count || 0,
    total: result.total[0]?.count || 0
  }
}
```

### Day 2: Async & Concurrency (3 hours)

#### Task 2.3: Parallelize Multi-Query Requests (2 hours)

**Find places with sequential queries:**
```bash
grep -rn "await.*Model.find" server/src/interfaces/http/controllers --include="*.ts" \
  | grep -A 2 "await.*Model"
# Lines with multiple sequential awaits
```

**Convert to parallel:**
```typescript
// ❌ BEFORE: 4 serial queries = slow
export async function getDashboard(userId: string) {
  const user = await User.findById(userId)
  const perms = await Permission.find({ userId })
  const docs = await Document.find({ userId })
  const stats = await Applicant.aggregate([...])
  return { user, perms, docs, stats }
}

// ✅ AFTER: 4 parallel queries = 4x faster
export async function getDashboard(userId: string) {
  const [user, perms, docs, stats] = await Promise.all([
    User.findById(userId).lean(),
    Permission.find({ userId }).lean(),
    Document.find({ userId }).limit(10).lean(),
    Applicant.aggregate([...])
  ])
  return { user, perms, docs, stats }
}
```

#### Task 2.4: Add Query Timing Logs (1 hour)

**Create timing middleware:**
```bash
cat > server/src/interfaces/http/middlewares/timing.ts << 'EOF'
# (see OPTIMIZATION_IMPLEMENTATION_GUIDE.md)
EOF
```

**Add to app.ts:**
```typescript
import { responseTimeMiddleware } from './interfaces/http/middlewares/timing'

app.use(responseTimeMiddleware)
```

**Monitor:**
```bash
npm run dev --prefix server
# Watch logs for slow endpoints (marked with ⚠️)
```

### Day 3: Caching & Batching (3 hours)

#### Task 2.5: Batch Database Operations (1.5 hours)

**Find loops with individual inserts:**
```bash
grep -rn "create(" server/src --include="*.ts" | grep "for\|forEach"
```

**Convert to batch:**
```typescript
// ❌ BAD: 1000 database calls
for (const record of records) {
  await Model.create(record)
}

// ✅ GOOD: 1 database call
await Model.insertMany(records, { ordered: false })
```

#### Task 2.6: Implement Redis Caching (1.5 hours)

**Install Redis:**
```bash
# Choose one installation method

# Method 1: Homebrew (Mac)
brew install redis
redis-server

# Method 2: Docker
docker run -d -p 6379:6379 redis:latest

# Method 3: Windows/WSL
wsl
sudo apt-get install redis-server
redis-server
```

**Verify it's running:**
```bash
redis-cli ping
# Should output: PONG
```

**Create Redis service:**
```bash
cp server/src/infrastructure/cache/redis.ts server/src/infrastructure/cache/redis.ts.new
# Then edit .new file with code from OPTIMIZATION_IMPLEMENTATION_GUIDE.md
```

**Apply to endpoints:**
```typescript
import { getCache, setCache } from '../infrastructure/cache/redis'

// Cache districts for 1 hour
export async function getDistricts(req, res) {
  let districts = await getCache('districts:all')
  if (!districts) {
    districts = await District.find().lean()
    await setCache('districts:all', districts, 3600)
  }
  res.json(districts)
}
```

### Day 4: Testing & Optimization (2 hours)

#### Task 2.7: Load Testing

**Install load testing tool:**
```bash
npm install -g autocannon
```

**Test before and after:**
```bash
# Before optimizations
autocannon -c 50 -d 10 http://localhost:4000/api/applicants

# After optimizations
autocannon -c 50 -d 10 http://localhost:4000/api/applicants

# Compare results
# Expected: 2-3x improvement in:
# - Average latency
# - P99 latency
# - Throughput (reqs/sec)
```

#### Task 2.8: Database Profiling

**Check slow queries:**
```bash
mongosh
> use pmis
> db.setProfilingLevel(1, { slowms: 100 })
> // Run your application
> db.system.profile.find({ millis: { $gt: 100 } }).pretty()
```

### Week 2 Results

**Expected Performance Gains:**
- Database performance: **3-5x faster** ✅
- Pagination handling: **Supports 10K+ records** ✅
- Concurrent user capacity: **2-3x increase** ✅
- Memory usage: **30% reduction** ✅

---

## Week 3: Frontend Optimization

**Goal:** Speed up frontend load and interactions.

### Day 1: Code Splitting (3 hours)

#### Task 3.1: Implement Lazy Loading

**Update route definitions:**
```typescript
// File: client/src/config/routes.tsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('@/views/Dashboard'))
const ReviewApplications = lazy(() => import('@/views/ReviewApplications'))
const AnalyticsView = lazy(() => import('@/views/AnalyticsView'))

export const routes = [
  {
    path: 'dashboard',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <Dashboard />
      </Suspense>
    )
  },
  // ... more routes
]
```

**Verify bundle is split:**
```bash
npm run build
# Check dist/ folder - should see multiple chunk files
```

#### Task 3.2: Configure Vite Optimization

**Update vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['@tanstack/react-table'],
          'charts': ['r react-apexcharts']
        }
      }
    }
  }
})
```

### Day 2: Client-Side Caching (3 hours)

#### Task 3.3: Implement SWR

**Install SWR:**
```bash
npm install swr --prefix client
```

**Create API hooks:**
```typescript
// File: client/src/api/useApplicants.ts
import useSWR from 'swr'

export function useApplicants(page = 1, status = null) {
  const params = new URLSearchParams({ page, ...(status && { status }) })
  
  const { data, error, mutate } = useSWR(
    `/api/applicants?${params}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000  // Don't fetch same data twice in 1min
    }
  )
  
  return { applicants: data?.data, pagination: data?.pagination, error, mutate }
}
```

**Use in components:**
```typescript
// File: client/src/views/ApplicantList.tsx
import { useApplicants } from '@/api/useApplicants'

export function ApplicantList() {
  const { applicants, pagination, error } = useApplicants(1, 'pending')
  
  if (!applicants) return <LoadingSpinner />
  if (error) return <Error message={error.message} />
  
  return (
    <div>
      {applicants.map(a => <ApplicantRow key={a.id} {...a} />)}
      <Pagination {...pagination} />
    </div>
  )
}
```

#### Task 3.4: Add Debounced Search

**Install debounce library:**
```bash
npm install use-debounce --prefix client
```

**Create search component:**
```typescript
// File: client/src/components/SearchApplicants.tsx
import { useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import useSWR from 'swr'

export function SearchApplicants() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  
  const debouncedSearch = useDebouncedCallback((q) => {
    setDebouncedQuery(q)
  }, 500)  // Wait 500ms after typing stops
  
  const { data: results } = useSWR(
    debouncedQuery ? `/api/applicants/search?q=${debouncedQuery}` : null,
    fetcher
  )
  
  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          debouncedSearch(e.target.value)
        }}
        placeholder="Search..."
      />
      {results && <ResultsList results={results} />}
    </div>
  )
}
```

### Day 3: Component Optimization (3 hours)

#### Task 3.5: Memoize Components

**Identify slow components:**
```bash
# Components that render frequently
grep -r "function.*\|const.*=" client/src/components --include="*.tsx" | head -20
```

**Add memo:**
```typescript
// Before
export function ApplicantRow({ applicant }) {
  return <tr><td>{applicant.name}</td></tr>
}

// After
import { memo } from 'react'

export const ApplicantRow = memo(({ applicant }) => {
  return <tr><td>{applicant.name}</td></tr>
})
```

#### Task 3.6: Use Virtualization for Large Lists

**Install react-window:**
```bash
npm install react-window --prefix client
npm install --save-dev @types/react-window --prefix client
```

**Use for large lists:**
```typescript
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

### Day 4: Testing & Monitoring (2 hours)

#### Task 3.7: Check Performance

```bash
npm run build --prefix client

# Check bundle size
ls -lh client/dist/assets/ | grep .js

# Should each be < 100KB for a chunk
```

#### Task 3.8: Browser Performance

```bash
# Open http://localhost:5173 in Chrome
# DevTools > Lighthouse > Run audit
# Target score: > 90
```

### Week 3 Results

**Expected Performance Gains:**
- Page load time: **3s → 0.8s** (3.75x faster) 🔥
- Bundle size: **1.5MB → 400KB** (3.75x smaller) 🔥
- Time to Interactive: **5s → 1s** (5x faster) 🔥
- Lighthouse Score: **60 → 92** (Excellent) 🔥

---

## Monitoring & Ongoing Optimization

### Monthly Maintenance

```
Week 1: Check performance trends
Week 2: Review slow logs and optimize
Week 3: Update dependencies with npm audit
Week 4: Performance profiling and tuning
```

### Metrics to Track

```bash
# Create: server/src/infrastructure/monitoring/metrics.ts

1. API response times (by endpoint)
2. Database query times
3. Cache hit rate
4. Error rates
5. Memory usage
6. CPU usage
7. Active user count
```

### Performance Dashboard

Create at `/api/admin/metrics` endpoint:
```typescript
GET /api/admin/metrics → {
  avgResponseTime: 120ms,
  p99ResponseTime: 250ms,
  cacheHitRate: 72%,
  errorRate: 0.02%,
  memoryUsage: 180MB
}
```

---

## Success Metrics

### Before Optimization
| Metric | Value |
|--------|-------|
| API response (p95) | 800ms |
| Database query | 200ms |
| Page load | 3.2s |
| Bundle size | 1.5MB |
| Memory per instance | 300MB |
| Concurrent users | 100 |

### Target (After Optimization)
| Metric | Target | Improvement |
|--------|--------|------------|
| API response (p95) | < 200ms | 4x faster |
| Database query | < 50ms | 4x faster |
| Page load | < 1s | 3x faster |
| Bundle size | < 400KB | 3.75x smaller |
| Memory per instance | < 150MB | 50% reduction |
| Concurrent users | 500 | 5x capacity |

---

## Rollback Plan

If any optimization causes issues:

```bash
# Revert to previous version
git checkout server/src/<changed-file>

# Redeploy
npm run build
pm2 restart pmc-api

# Investigate and try again
```

---

## Communication Plan

### Week 1
- Announce optimization sprint
- Share expected improvements
- Set performance targets

### Week 2
- Daily standup on progress
- Share preliminary results
- Gather feedback

### Week 3
- Final testing phase
- Prepare deployment
- Communication plan for launch

### Post-Launch
- Monitor metrics
- Gather user feedback
- Document lessons learned

---

## Dependencies to Install

```bash
# Backend optimizations
npm install --prefix server ioredis node-cache

# Frontend optimizations
npm install --prefix client swr use-debounce react-window
npm install --save-dev --prefix client rollup-plugin-visualizer @types/react-window

# Monitoring
npm install --prefix server autocannon
```

---

## Documentation

- **OPTIMIZATION_CHECKLIST.md** - Complete checklist (reference)
- **OPTIMIZATION_IMPLEMENTATION_GUIDE.md** - Code examples (implementation)
- **OPTIMIZATION_QUICK_REFERENCE.md** - Quick lookup (daily use)
- **This file** - Project roadmap (planning)

---

## Timeline Summary

| Week | Focus | Time | Impact |
|------|-------|------|--------|
| **1** | Quick wins | 2 hrs | 2-3x faster |
| **2** | DB & APIs | 20 hrs | 3-5x faster |
| **3** | Frontend | 15 hrs | 3x faster page load |
| **Ongoing** | Monitoring | 2 hrs/month | Maintain gains |

**Total:** 1-3 weeks, 1-2 engineers  
**Result:** **3-5x performance improvement** 🚀

---

## Next Steps

1. **Today:** Read OPTIMIZATION_QUICK_REFERENCE.md
2. **Tomorrow:** Implement Week 1 quick wins
3. **Next Week:** Follow Week 2 tasks
4. **Final Week:** Complete Week 3 optimizations
5. **Ongoing:** Monitor and maintain

---

**Status:** ⏳ Ready to launch  
**Complexity:** Intermediate  
**ROI:** High (3-5x performance)

