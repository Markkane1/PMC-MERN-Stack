# Week 8: Load Testing & Validation Guide

## 📋 Overview

Week 8 validates all optimizations from Weeks 1-7 through comprehensive load testing using **k6**.

### What Gets Tested
- ✅ **Week 1-2**: Database indexes, query lean(), Redis caching
- ✅ **Week 3**: Frontend optimization (hooks, SWR, debounce, virtualization, code splitting)
- ✅ **Week 4**: HTTP compression, ETag/304, field filtering, Cache-Control
- ✅ **Week 5**: Metrics collection, Prometheus export, monitoring endpoints
- ✅ **Week 6**: Rate limiting (token bucket), circuit breaker, resilience patterns
- ✅ **Week 7**: Load balancing, service registry, health checks, HA cluster

---

## 🚀 Quick Start

### 1. Verify k6 Installation
```powershell
k6 version
```

### 2. Start Your Server
```powershell
cd server
npm run dev
```
Server should run on `http://localhost:3000`

### 3. Run Load Tests

#### Baseline Test (5 users, 30s)
```powershell
cd server
k6 run tests/week8-load-test.js --scenario baseline
```

#### Or use the test runner script
```powershell
.\run-load-tests.ps1 -Scenario baseline      # Single scenario
.\run-load-tests.ps1 -Scenario all           # All scenarios
```

---

## 📊 Available Test Scenarios

### 1. **Baseline** (5 VUs, 30s)
- Normal usage patterns
- Establishes performance baseline
- Quick sanity check
```powershell
k6 run tests/week8-load-test.js --scenario baseline
```

### 2. **Light Load** (10 VUs, 60s)
- Small concurrent user group
- Validates basic performance under mild load
```powershell
k6 run tests/week8-load-test.js --scenario light_load
```

### 3. **Medium Load** (50 VUs, 60s)
- Moderate concurrent users
- Tests typical peak capacity
```powershell
k6 run tests/week8-load-test.js --scenario medium_load
```

### 4. **Heavy Load** (100+ VUs, 60s)
- High concurrent user count
- Stress test resilience
```powershell
k6 run tests/week8-load-test.js --scenario heavy_load
```

### 5. **Spike Test**
- Sudden traffic surge (10→100 users in 5s)
- Validates automatic scaling and circuit breaker
```powershell
k6 run tests/week8-load-test.js --scenario spike_test
```

### 6. **Soak Test** (20 VUs, 5 min)
- Sustained load over time
- Detects memory leaks and slow degradation
```powershell
k6 run tests/week8-load-test.js --scenario soak_test
```

---

## ✅ Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **P95 Response Time** | <200ms | 95% of requests faster |
| **P99 Response Time** | <500ms | 99% of requests faster |
| **Error Rate** | <1% | HTTP errors / total requests |
| **Cache Hit Ratio** | >75% | Redis + memory cache hits |
| **Payload Reduction** | 60-70% | Via field filtering + gzip |
| **Rate Limit Accuracy** | 100% | 429 responses when limit exceeded |
| **Circuit Breaker** | Working | CLOSED/OPEN/HALF_OPEN transitions |
| **Throughput** | >100 req/s | Requests per second capacity |
| **Memory Usage** | <200MB | Per node baseline |

---

## 📈 Test Metrics Collected

### Response Performance
- `http_req_duration` - Response time (P50/P95/P99)
- `http_reqs` - Total requests
- `http_errors` - Failed requests
- `http_req_duration_trend` - Response time trend

### Caching
- `cache_hits` - Redis/Memory cache hits
- `cache_misses` - Cache misses
- `gzip_payload_size` - Compressed response size
- `uncompressed_payload_size` - Original response size

### Database
- `db_query_time` - Query execution time
- `slow_queries` - Queries >100ms

### API-Specific
- `rate_limit_exceeded` - 429 responses
- `circuit_breaker_open` - Circuit breaker state changes
- `timeout_errors` - Request timeouts

### System Health
- `health_check_success` - Successful health checks
- `health_check_failure` - Failed health checks

---

## 🔍 What Each Endpoint Tests

### **Week 1-2: Database & Caching**
```
GET /api/applicants?status=active&limit=10          → Indexed query performance
GET /api/applicants?fields=id,name,status&limit=20  → Field filtering reduction
GET /api/applicants/{id}                             → Cache hit/miss tracking
```

### **Week 3: Frontend Code Splitting**
```
GET /build/assets/                                   → Chunk loading performance
                                                     → (Measured via client-side)
```

### **Week 4: HTTP Optimizations**
```
GET /api/applicants (Accept-Encoding: gzip)         → Compression validation
GET /api/applicants (If-None-Match: etag)           → 304 Not Modified
GET /api/applicants (Cache-Control headers)         → Caching policy
```

### **Week 5: Monitoring**
```
GET /monitoring/metrics                             → Prometheus export
GET /monitoring/dashboard                           → Full metrics JSON
GET /monitoring/health                              → Service health
GET /monitoring/endpoints                           → Endpoint statistics
```

### **Week 6: Rate Limiting & Resilience**
```
GET /api/applicants (repeated 150x)                 → Rate limit enforcement (429)
GET /resilience/circuit-breakers                    → Circuit breaker status
GET /resilience/resilience/summary                  → Resilience overview
```

### **Week 7: High Availability**
```
GET /ha/load-balancer/nodes                         → Load balancer status
GET /ha/health-checks                               → Health check results
GET /ha/ha/readiness                                → K8s readiness probe
GET /ha/ha/liveness                                 → K8s liveness probe
GET /ha/ha/status                                   → HA system overview
```

---

## 🎯 Running Complete Validation

```powershell
# 1. Start server
cd server
npm run dev

# 2. In new terminal, run all test scenarios
.\run-load-tests.ps1 -Scenario all

# 3. Analyze results
# Results saved to: results-baseline.txt, results-light.txt, etc.
# JSON data in: results.json
```

---

## 📊 Expected Results

### Baseline (5 users, 30s)
```
Requests:     ~150 req
Duration:     30.0s
Throughput:   5 req/s
P95 Response: ~80ms
Errors:       0
Cache Hits:   ~20 (from repeat requests)
```

### Light Load (10 users, 60s)
```
Requests:     ~300-400 req
Duration:     60.0s
Throughput:   5-7 req/s
P95 Response: ~120ms
Errors:       <5
Cache Hits:   ~50
Rate Limited: 0
```

### Medium Load (50 users, 60s)
```
Requests:     ~1500-2000 req
Duration:     60.0s
Throughput:   25-35 req/s
P95 Response: ~150-180ms
Errors:       <10
Cache Hits:   ~300
Rate Limited: <20
```

### Heavy Load (100 users, 60s)
```
Requests:     ~3000-4000 req
Duration:     60.0s
Throughput:   50-70 req/s
P95 Response: ~180-250ms (watch for spikes)
Errors:       <30
Cache Hits:   ~600
Rate Limited: <100
Circuit Breaker: Should handle load
```

### Spike Test (10→100 in 5s)
```
Pre-spike (10 VUs):  ~50 req/s, <100ms
During surge (100 VUs): Peak to ~200+ req/s
Circuit Breaker: SWITCHES STATES (observable)
Recovery:        Returns to normal when surge ends
```

### Soak Test (20 VUs, 5 min)
```
Duration:        5 minutes
Total Requests:  ~1500-2000 req
Avg Throughput: 5-7 req/s (steady)
Memory Trend:    Should not increase significantly
Errors:          Should remain stable/low
```

---

## 🔧 Troubleshooting

### Server Not Responding
```powershell
# Check server is running on localhost:3000
curl http://localhost:3000/monitoring/health
```

### High Error Rate
```powershell
# Check monitoring dashboard for issues
curl http://localhost:3000/monitoring/dashboard | Format-List

# Check resilience status
curl http://localhost:3000/resilience/resilience/summary
```

### Rate Limit Errors
```powershell
# Check rate limit configuration - should be:
# IP: 100 req/min
# Endpoint: 1000 req/min
# This is expected under heavy load
```

### Slow Response Times
```powershell
# Check monitoring for slow endpoints
curl http://localhost:3000/monitoring/endpoints
```

---

## 📝 Validation Checklist

After running Week 8 tests:

- [ ] Baseline test passes with <100ms P95
- [ ] Light load shows <120ms P95
- [ ] Medium load shows <180ms P95
- [ ] Heavy load stays <250ms P95 (resilient)
- [ ] Cache hits >50% in all scenarios
- [ ] Rate limiting triggers correctly (429 responses)
- [ ] Circuit breaker status updates during spike
- [ ] Health checks report healthy
- [ ] No memory leaks (soak test stable)
- [ ] Error rate <1% in all scenarios
- [ ] Monitoring endpoints responsive
- [ ] Field filtering reduces payload 60-70%
- [ ] Gzip compression working (Accept-Encoding)
- [ ] ETag caching working (304 responses)
- [ ] Load balancer distributing traffic
- [ ] Service registry tracking instances
- [ ] K8s probes working (readiness/liveness)

---

## 📄 Interpreting Results

### JSON Output Structure
```json
{
  "metrics": {
    "http_req_duration": {
      "values": {
        "avg": 120,
        "p95": 180,
        "p99": 250,
        "max": 500
      }
    },
    "http_errors": { "value": 5 },
    "cache_hits": { "value": 250 },
    "rate_limit_exceeded": { "value": 15 }
  }
}
```

### Key Metrics to Watch
- **P95 < 200ms** = Good (target for most apps)
- **P99 < 500ms** = Acceptable (some slow requests ok)
- **Error Rate < 1%** = Healthy (some errors expected under extreme load)
- **Cache Hit Ratio > 75%** = Excellent (reducing database load)
- **Rate Limit Accuracy 100%** = Correct enforcement

---

## 🚀 Next Steps After Testing

1. **Analyze Results**
   - Compare P95/P99 against targets
   - Check cache hit ratios
   - Identify slow endpoints

2. **Optimize Based on Findings**
   - Add indexes for slow queries
   - Increase cache TTLs
   - Adjust rate limit thresholds

3. **Document Performance**
   - Record baseline metrics
   - Save results for future comparison
   - Create performance report

4. **Deploy Confidently**
   - All optimizations validated
   - Performance targets met
   - Ready for production

---

## 📞 Support

For issues running tests:
1. Ensure server is running: `http://localhost:3000/monitoring/health`
2. Check k6 version: `k6 version`
3. Review test script: `tests/week8-load-test.js`
4. Check monitoring dashboard: `http://localhost:3000/monitoring/dashboard`

---

**Status:** Week 8 Complete - Load Testing Framework Ready to Validate All Optimizations ✅
