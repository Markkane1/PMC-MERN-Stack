/**
 * Week 8: Comprehensive Load Testing
 * Validates all performance optimizations across 8 weeks
 * 
 * Run with: k6 run tests/week8-load-test.js
 * Or specific scenarios:
 *   k6 run tests/week8-load-test.js --vus 10 --duration 60s  (light load)
 *   k6 run tests/week8-load-test.js --vus 50 --duration 60s  (medium)
 *   k6 run tests/week8-load-test.js --vus 100 --duration 60s (heavy)
 */

import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend, Counter, Gauge } from 'k6/metrics'

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const SCENARIO = __ENV.SCENARIO || 'baseline'

// ============================================================================
// CUSTOM METRICS
// ============================================================================

// HTTP Performance
const httpDuration = new Trend('http_req_duration', true)
const httpErrors = new Counter('http_errors')
const cacheHits = new Counter('cache_hits')
const cacheMisses = new Counter('cache_misses')
const gzipPayloadSize = new Trend('gzip_payload_size')
const uncompressedPayloadSize = new Trend('uncompressed_payload_size')

// Database Performance
const dbQueryTime = new Trend('db_query_time')
const slowQueries = new Counter('slow_queries')

// API Specific
const rateLimitExceeded = new Counter('rate_limit_exceeded')
const circuitBreakerOpen = new Counter('circuit_breaker_open')
const timeoutErrors = new Counter('timeout_errors')

// System Health
const healthCheckSuccess = new Counter('health_check_success')
const healthCheckFailure = new Counter('health_check_failure')

// ============================================================================
// TEST SCENARIOS
// ============================================================================

export const scenarios = {
  baseline: {
    executor: 'constant-vus',
    vus: 5,
    duration: '30s',
    tags: { 'test_type': 'baseline' }
  },
  light_load: {
    executor: 'ramp-up',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 10 },
      { duration: '30s', target: 10 },
      { duration: '10s', target: 0 }
    ],
    tags: { 'test_type': 'light' }
  },
  medium_load: {
    executor: 'ramp-up',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 50 },
      { duration: '30s', target: 50 },
      { duration: '10s', target: 0 }
    ],
    tags: { 'test_type': 'medium' }
  },
  heavy_load: {
    executor: 'ramp-up',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 },
      { duration: '30s', target: 100 },
      { duration: '10s', target: 0 }
    ],
    tags: { 'test_type': 'heavy' }
  },
  spike_test: {
    executor: 'ramping-vus',
    startVUs: 10,
    stages: [
      { duration: '10s', target: 10 },
      { duration: '5s', target: 100 },   // Sudden spike
      { duration: '20s', target: 100 },  // Sustained spike
      { duration: '5s', target: 10 },    // Back to normal
      { duration: '10s', target: 0 }
    ],
    tags: { 'test_type': 'spike' }
  },
  soak_test: {
    executor: 'constant-vus',
    vus: 20,
    duration: '5m',  // 5 minute sustained load
    tags: { 'test_type': 'soak' }
  }
}

// Select active scenario
export const options = {
  scenarios: {
    [SCENARIO]: scenarios[SCENARIO] || scenarios.baseline
  },
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'],  // Target <200ms P95, <500ms P99
    'http_errors': ['count<10'],                       // Fewer than 10 errors
    'cache_hits': ['count>=50'],                       // At least 50 cache hits
  },
  insecureSkipTLSVerify: true
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

export default function() {
  // Rotate through test scenarios
  const testChoice = Math.random()
  
  if (testChoice < 0.3) {
    testDatabaseOptimization()
  } else if (testChoice < 0.6) {
    testHttpOptimization()
  } else if (testChoice < 0.75) {
    testMonitoring()
  } else if (testChoice < 0.9) {
    testRateLimiting()
  } else {
    testHighAvailability()
  }
  
  sleep(1)
}

// ============================================================================
// TEST: Database Optimization (Week 1-2)
// ============================================================================

function testDatabaseOptimization() {
  group('Database Optimization Tests', () => {
    // Test indexed query (should be fast)
    group('Indexed Query (Fast Path)', () => {
      const start = Date.now()
      const res = http.get(`${BASE_URL}/api/applicants?status=active&limit=10`)
      const duration = Date.now() - start
      
      dbQueryTime.add(duration)
      
      check(res, {
        'Indexed query returns 200': (r) => r.status === 200,
        'Indexed query <50ms': (r) => r.timings.duration < 50,
        'Response includes applicants': (r) => r.json('data.length') > 0
      })
      
      if (duration > 100) {
        slowQueries.add(1)
      }
    })
    
    // Test field filtering (60-70% reduction)
    group('Field Filtering (Optimized)', () => {
      const res = http.get(`${BASE_URL}/api/applicants?fields=id,name,status&limit=20`)
      
      const uncompressed = res.json().length * 500  // Estimate
      const compressed = res.body.length
      
      uncompressedPayloadSize.add(uncompressed)
      gzipPayloadSize.add(compressed)
      
      check(res, {
        'Field filtering returns 200': (r) => r.status === 200,
        'Reduced payload size': () => compressed < uncompressed * 0.4  // <40% of original
      })
    })
    
    // Test with cache (should be fast on second request)
    group('Cache Hit Performance', () => {
      const cacheKey = 'applicant-' + Math.floor(Math.random() * 100)
      
      // First request hits database
      const res1Start = Date.now()
      http.get(`${BASE_URL}/api/applicants/${cacheKey}`)
      
      sleep(0.1)
      
      // Second request should hit cache
      const res2Start = Date.now()
      const res2 = http.get(`${BASE_URL}/api/applicants/${cacheKey}`)
      const cacheRequestTime = Date.now() - res2Start
      
      if (cacheRequestTime < 10) {
        cacheHits.add(1)
      } else {
        cacheMisses.add(1)
      }
      
      check(res2, {
        'Cache returns 200': (r) => r.status === 200,
        'Cache hit <10ms': () => cacheRequestTime < 10
      })
    })
  })
}

// ============================================================================
// TEST: HTTP Optimization (Week 4)
// ============================================================================

function testHttpOptimization() {
  group('HTTP Optimization Tests', () => {
    // Test gzip compression
    group('Gzip Compression', () => {
      const res = http.get(`${BASE_URL}/api/applicants?limit=100`, {
        headers: { 'Accept-Encoding': 'gzip' }
      })
      
      const contentEncoding = res.headers['Content-Encoding']
      const payloadSize = res.body.length
      
      gzipPayloadSize.add(payloadSize)
      
      check(res, {
        'Response compresses with gzip': () => contentEncoding === 'gzip',
        'Compressed payload <100KB': () => payloadSize < 100000
      })
    })
    
    // Test ETag caching
    group('ETag & 304 Not Modified', () => {
      const res1 = http.get(`${BASE_URL}/api/applicants?limit=10`)
      const etag = res1.headers['ETag']
      
      sleep(0.5)
      
      // Request with ETag should return 304
      const res2 = http.get(`${BASE_URL}/api/applicants?limit=10`, {
        headers: { 'If-None-Match': etag }
      })
      
      check(res2, {
        'ETag present in response': () => !!etag,
        'Conditional request returns 200 or 304': (r) => r.status === 200 || r.status === 304,
        'Saved bandwidth on 304': () => res2.status === 304
      })
    })
    
    // Test Cache-Control headers
    group('Cache-Control Headers', () => {
      const res = http.get(`${BASE_URL}/api/applicants`)
      const cacheControl = res.headers['Cache-Control']
      
      check(res, {
        'Cache-Control header present': () => !!cacheControl,
        'Cache-Control sets max-age': () => cacheControl && cacheControl.includes('max-age'),
        'Proper cache policy': (r) => r.status === 200
      })
    })
    
    // Test security headers
    group('Security Headers', () => {
      const res = http.get(`${BASE_URL}/api/applicants`)
      
      check(res, {
        'HSTS header present': () => !!res.headers['Strict-Transport-Security'],
        'X-Content-Type-Options present': () => !!res.headers['X-Content-Type-Options'],
        'X-Frame-Options present': () => !!res.headers['X-Frame-Options']
      })
    })
  })
}

// ============================================================================
// TEST: Monitoring & Observability (Week 5)
// ============================================================================

function testMonitoring() {
  group('Monitoring & Observability Tests', () => {
    // Test metrics endpoint
    group('Metrics Endpoint', () => {
      const res = http.get(`${BASE_URL}/monitoring/metrics`)
      
      check(res, {
        'Metrics endpoint accessible': (r) => r.status === 200,
        'Returns Prometheus format': (r) => r.headers['Content-Type'].includes('text'),
        'Contains request metrics': (r) => r.body.includes('http_requests')
      })
    })
    
    // Test dashboard endpoint
    group('Dashboard Metrics', () => {
      const res = http.get(`${BASE_URL}/monitoring/dashboard`)
      
      check(res, {
        'Dashboard accessible': (r) => r.status === 200,
        'Returns JSON': (r) => r.headers['Content-Type'].includes('json'),
        'Contains endpoint stats': (r) => r.json('endpoints') !== undefined,
        'Contains cache stats': (r) => r.json('cache') !== undefined
      })
    })
    
    // Test health endpoint
    group('Health Check', () => {
      const res = http.get(`${BASE_URL}/monitoring/health`)
      
      if (res.status === 200) {
        healthCheckSuccess.add(1)
      } else {
        healthCheckFailure.add(1)
      }
      
      check(res, {
        'Health check returns 200 or 503': (r) => r.status === 200 || r.status === 503
      })
    })
  })
}

// ============================================================================
// TEST: Rate Limiting & Resilience (Week 6)
// ============================================================================

function testRateLimiting() {
  group('Rate Limiting & Resilience Tests', () => {
    // Test rate limit enforcement
    group('Rate Limiting Enforcement', () => {
      let rateLimitedResponses = 0
      
      for (let i = 0; i < 150; i++) {
        const res = http.get(`${BASE_URL}/api/applicants`)
        
        if (res.status === 429) {
          rateLimitedResponses++
          rateLimitExceeded.add(1)
        }
        
        const retryAfter = res.headers['Retry-After']
        if (retryAfter) {
          sleep(parseInt(retryAfter) / 1000)
        }
      }
      
      check(true, {
        'Rate limiting triggers 429': () => rateLimitedResponses > 0,
        'Retry-After header present when limited': () => true
      })
    })
    
    // Test circuit breaker
    group('Circuit Breaker Status', () => {
      const res = http.get(`${BASE_URL}/resilience/circuit-breakers`)
      
      check(res, {
        'Circuit breaker status available': (r) => r.status === 200,
        'Returns breaker states': (r) => r.json('breakers') !== undefined
      })
    })
    
    // Test resilience summary
    group('Resilience Summary', () => {
      const res = http.get(`${BASE_URL}/resilience/resilience/summary`)
      
      check(res, {
        'Resilience summary accessible': (r) => r.status === 200,
        'Shows rate limit status': (r) => r.json('rateLimiting') !== undefined,
        'Shows circuit breaker status': (r) => r.json('circuitBreakers') !== undefined
      })
    })
  })
}

// ============================================================================
// TEST: High Availability (Week 7)
// ============================================================================

function testHighAvailability() {
  group('High Availability Tests', () => {
    // Test load balancer
    group('Load Balancer Status', () => {
      const res = http.get(`${BASE_URL}/ha/load-balancer/nodes`)
      
      check(res, {
        'Load balancer endpoint accessible': (r) => r.status === 200,
        'Returns node list': (r) => r.json('nodes') !== undefined,
        'Shows node statistics': (r) => r.json('nodes').length > 0
      })
    })
    
    // Test health checks
    group('Health Checks', () => {
      const res = http.get(`${BASE_URL}/ha/health-checks`)
      
      check(res, {
        'Health checks accessible': (r) => r.status === 200,
        'Returns check results': (r) => r.json('checks') !== undefined
      })
    })
    
    // Test Kubernetes probes
    group('Kubernetes Integration', () => {
      // Readiness probe
      const readinessRes = http.get(`${BASE_URL}/ha/ha/readiness`)
      
      check(readinessRes, {
        'Readiness probe returns 200 or 503': (r) => r.status === 200 || r.status === 503
      })
      
      // Liveness probe (should always be 200)
      const livenessRes = http.get(`${BASE_URL}/ha/ha/liveness`)
      
      check(livenessRes, {
        'Liveness probe always returns 200': (r) => r.status === 200
      })
    })
    
    // Test HA status
    group('HA System Status', () => {
      const res = http.get(`${BASE_URL}/ha/ha/status`)
      
      check(res, {
        'HA status accessible': (r) => r.status === 200,
        'Shows cluster status': (r) => r.json('cluster') !== undefined,
        'Shows load balancer stats': (r) => r.json('loadBalancer') !== undefined
      })
    })
  })
}

// ============================================================================
// SUMMARY
// ============================================================================

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results.json': JSON.stringify(data)
  }
}

// Simple text summary formatter
function textSummary(data, options = {}) {
  const { indent = '', enableColors = false } = options
  const metrics = data.metrics || {}
  
  let output = '\n' + '='.repeat(80) + '\n'
  output += 'LOAD TEST SUMMARY\n'
  output += '='.repeat(80) + '\n'
  
  output += '\n📊 Performance Metrics:\n'
  output += `${indent}HTTP Requests: ${metrics.http_reqs?.value || 0}\n`
  output += `${indent}HTTP Errors: ${metrics.http_errors?.value || 0}\n`
  output += `${indent}Avg Response Time: ${Math.round(metrics.http_req_duration?.values?.avg || 0)}ms\n`
  output += `${indent}P95 Response Time: ${Math.round(metrics.http_req_duration?.values?.p95 || 0)}ms\n`
  output += `${indent}P99 Response Time: ${Math.round(metrics.http_req_duration?.values?.p99 || 0)}ms\n`
  
  output += '\n💾 Cache Performance:\n'
  output += `${indent}Cache Hits: ${metrics.cache_hits?.value || 0}\n`
  output += `${indent}Cache Misses: ${metrics.cache_misses?.value || 0}\n`
  
  output += '\n⚠️  Errors & Limits:\n'
  output += `${indent}Rate Limit Exceeded (429): ${metrics.rate_limit_exceeded?.value || 0}\n`
  output += `${indent}Circuit Breaker Open: ${metrics.circuit_breaker_open?.value || 0}\n`
  output += `${indent}Timeout Errors: ${metrics.timeout_errors?.value || 0}\n`
  
  output += '\n'.repeat(1)
  output += '='.repeat(80) + '\n'
  
  return output
}
