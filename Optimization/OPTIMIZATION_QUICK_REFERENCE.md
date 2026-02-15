# ⚡ OPTIMIZATION QUICK REFERENCE

**Goal:** Make the app faster with practical, implementable optimizations.

---

## The Big Wins (Do These First)

### ✅ Database Indexes (2 hours - 10x faster queries)
```bash
npm run db:index
```
**Affected:** All database lookups  
**Expected Speedup:** User searches, applicant lists, filtering

### ✅ Query Optimization (4 hours - 3x faster queries)
Add `.lean()` + projection to all read-only queries:
```typescript
// Before: ApplicantModel.find({ status: 'pending' })
// After:
ApplicantModel.find({ status: 'pending' })
  .select('id numericId status email -password')
  .lean()
```

### ✅ Pagination (2 hours - Handles 10K+ records)
```typescript
// Instead of returning all 10,000 records, return 20 per page
const page = req.query.page || 1
const pageSize = 20
skip: (page - 1) * pageSize, limit: pageSize
```

### ✅ Parallel Queries (1 hour - 3-4x faster)
```typescript
// Instead of: const a = await A; const b = await B
// Do: const [a, b] = await Promise.all([A, B])
```

---

## Performance Targets

| What | Target | How to Check |
|------|--------|---|
| API response | **< 200ms** | `curl -w '@timer.txt' http://localhost:4000/api/applicants` |
| Database query | **< 50ms** | `mongoose.set('debug', true)` |
| Page load | **< 1.5s** | Browser DevTools Network tab |
| Bundle size | **< 500KB** | Run `npm run build` in client |

---

## High-Impact Optimizations (Priority Order)

### 1. Database Indexes 🔥 (CRITICAL)
**Time:** 2 hours | **Impact:** 10x faster  
**What:** Make frequent queries instant
```bash
npm run db:index
```
**Check:** Query logs show "index: true"

### 2. Query Optimization 🔥 (HIGH)
**Time:** 4 hours | **Impact:** 3x faster  
**What:** Return only what you need
```typescript
.lean()  // Plain JS objects (not Mongoose docs)
.select('field1 field2 -password')  // Only needed fields
.skip((page-1)*20).limit(20)  // Paginate
```

### 3. Response Caching (HIGH)
**Time:** 2 hours | **Impact:** 10-100x faster for cached calls
```typescript
app.get('/api/districts', cacheMiddleware(3600), handler)
// Caches for 1 hour
```

### 4. Code Splitting (MEDIUM)
**Time:** 2 hours | **Impact:** 2x faster initial page load
```typescript
const ReviewForm = lazy(() => import('@/views/ReviewForm'))
// Only load when needed
```

### 5. Parallel Processing (MEDIUM)
**Time:** 1 hour | **Impact:** 3x faster for complex requests
```typescript
const [user, perms, docs] = await Promise.all([A, B, C])
```

---

## Quick Implementation Checklist

### Database (4 hours)
- [ ] Run `npm run db:index` to create indexes
- [ ] Add `.lean()` to all read-only queries
- [ ] Add pagination (skip/limit) to list queries
- [ ] Test query times with `mongoose.set('debug', true)`

### Backend API (2 hours)
- [ ] Reduce JSON body limit: `express.json({ limit: '1mb' })`
- [ ] Add response caching for static endpoints
- [ ] Implement parallel queries with `Promise.all()`
- [ ] Add response time logging middleware

### Frontend (2 hours)
- [ ] Split large routes with `lazy()`
- [ ] Implement SWR caching: `useSWR(url, fetcher)`
- [ ] Add debouncing to search: `useDebouncedCallback()`
- [ ] Memoize expensive components: `memo(Component)`

---

## Copy-Paste Solutions

### Add Indexes
```bash
npm run db:index
```

### Add Pagination
```typescript
export async function list(req: Request, res: Response) {
  const page = Number(req.query.page) || 1
  const limit = 20
  
  const [data, total] = await Promise.all([
    Model.find().skip((page - 1) * limit).limit(limit).lean(),
    Model.countDocuments()
  ])
  
  res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}
```

### Add Caching
```typescript
const cache = new Map()

export async function getCachedData(key: string) {
  if (cache.has(key)) return cache.get(key)
  
  const data = await expensiveWork()
  cache.set(key, data)
  setTimeout(() => cache.delete(key), 3600000)  // Clear after 1 hour
  return data
}
```

### Optimize Query
```typescript
// Before
const user = await User.findById(id)

// After
const user = await User.findById(id)
  .select('id name email -password -internalNotes')
  .lean()
```

### Parallel Requests
```typescript
// Before (slow)
const user = await User.findById(id)
const permissions = await Permission.find({ userId: id })

// After (fast)
const [user, permissions] = await Promise.all([
  User.findById(id),
  Permission.find({ userId: id })
])
```

---

## Performance Monitoring

### Check API Speed
```bash
curl -w "Time: %{time_total}s\n" http://localhost:4000/api/applicants
```

### Check Database Speed
```typescript
// In code
const start = Date.now()
const result = await Model.find(...)
console.log(`Query took ${Date.now() - start}ms`)
```

### Check Frontend Size
```bash
cd client
npm run build
# Look at dist/ size - should be < 500KB gzipped
```

### Check Memory Usage
```bash
node --inspect dist/server.js
# Open chrome://inspect to profile
```

---

## Common Bottlenecks & Fixes

| Problem | Symptom | Fix |
|---------|---------|-----|
| Missing indexes | Slow queries (>100ms) | `npm run db:index` |
| Loading all data | Memory spike | Add `.lean()` + pagination |
| Sequential queries | Slow API (>500ms) | Use `Promise.all()` |
| Large JSON | Slow network | Add `.select()` to exclude fields |
| Repeated computations | High CPU | Add memoization/caching |
| Large bundle | Slow page load | Use `lazy()` + code splitting |

---

## Monitoring Commands

```bash
# Check database indexes
mongosh
> db.applicants.getIndexes()

# Check slow queries (MongoDB)
> db.setProfilingLevel(1, { slowms: 100 })
> db.system.profile.find({ millis: { $gt: 100 } }).limit(5)

# Check Node memory
node
> const v8 = require('v8')
> const heapSnapshot = v8.createHeapSnapshot()

# Load test API
npm install -g autocannon
autocannon -c 100 -d 10 http://localhost:4000/api/applicants
```

---

## Quick Install

```bash
# Backend optimizations
cd server
npm install ioredis node-cache

# Frontend optimizations
cd ../client
npm install swr use-debounce
npm install --save-dev rollup-plugin-visualizer
```

---

## Next Steps

1. **Today (2 hours):** 
   - [ ] Create indexes: `npm run db:index`
   - [ ] Add `.lean()` to queries
   - [ ] Test response times

2. **This Week (4 hours):**
   - [ ] Add caching to slow endpoints
   - [ ] Paginate list endpoints
   - [ ] Parallelize multi-query requests

3. **Next Week (4 hours):**
   - [ ] Code splitting on frontend
   - [ ] Implement SWR caching
   - [ ] Add response time monitoring

4. **Monthly:**
   - [ ] Run performance tests
   - [ ] Review slow queries
   - [ ] Profile memory usage

---

## Documentation

📖 **Full Guide:** `OPTIMIZATION_CHECKLIST.md`  
💻 **Code Examples:** `OPTIMIZATION_IMPLEMENTATION_GUIDE.md`

---

## Expected Results

After implementing all optimizations:

| Metric | Before | After |
|--------|--------|-------|
| API response | 500ms | 100ms |
| Database query | 200ms | 30ms |
| Page load | 3s | 0.8s |
| Bundle size | 1.5MB | 400KB |
| Memory usage | 300MB | 150MB |
| Concurrent users | 100 | 500+ |

**Result:** App runs **3-5x faster** ⚡

---

**Status:** ⏳ Ready to implement  
**Effort:** 1-3 weeks  
**ROI:** 3-5x performance improvement

