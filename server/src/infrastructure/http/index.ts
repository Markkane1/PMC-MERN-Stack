/**
 * Week 4: HTTP Optimization Module
 * Exports all HTTP performance optimization utilities
 */

export {
  compressionMiddleware,
  compressData,
} from './compression'

export {
  generateETag,
  etagMiddleware,
  lastModifiedMiddleware,
  validateConditionalRequest,
  buildCacheKey,
} from './etag'

export {
  parseFieldsParam,
  filterFields,
  filterFieldsArray,
  fieldFilteringMiddleware,
  getRequestFields,
  calculatePayloadReduction,
  validateRequestedFields,
} from './fieldFiltering'

export {
  buildCacheControl,
  setCacheControl,
  CACHE_PRESETS,
  cacheControlMiddleware,
  setVaryHeader,
  setSecurityHeaders,
  httpOptimizationMiddleware,
  streamResponse,
  type CacheConfig,
} from './headers'
