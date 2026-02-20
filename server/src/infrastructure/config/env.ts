import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

function parseCorsOrigins(value: string | undefined): string[] {
  const raw = value || 'http://localhost:5173'
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean)
}

function isLikelyPlaceholderSecret(secret: string): boolean {
  const normalized = secret.trim().toLowerCase()
  const weakSamples = new Set([
    'replace_me',
    'changeme',
    'change-me',
    'secret',
    'test',
    'development',
    'your-very-long-random-secret-here-change-this',
  ])
  return weakSamples.has(normalized)
}

// Validate critical environment variables at startup
function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production'
  const jwtSecret = process.env.JWT_SECRET || ''
  const mongoUri = process.env.MONGO_URI || ''
  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN)
  const allowLegacyMasterkeyLogin = process.env.ALLOW_LEGACY_MASTERKEY_LOGIN === 'true'

  if (!jwtSecret || isLikelyPlaceholderSecret(jwtSecret) || jwtSecret.length < 32) {
    throw new Error(
      'CRITICAL: JWT_SECRET must be at least 32 characters and not a placeholder value.'
    )
  }

  if (!mongoUri) {
    throw new Error('CRITICAL: MONGO_URI must be set in environment')
  }

  if (!corsOrigins.length) {
    throw new Error('CRITICAL: CORS_ORIGIN must define at least one allowed origin')
  }

  const hasWildcard = corsOrigins.includes('*')
  if (isProd && hasWildcard) {
    throw new Error('CRITICAL: CORS_ORIGIN cannot be wildcard in production')
  }

  for (const origin of corsOrigins) {
    if (origin === '*') continue
    if (!/^https?:\/\/[^/]+$/i.test(origin)) {
      throw new Error(`CRITICAL: Invalid CORS origin format: ${origin}`)
    }
  }

  if (isProd && allowLegacyMasterkeyLogin) {
    throw new Error('CRITICAL: ALLOW_LEGACY_MASTERKEY_LOGIN must be disabled in production')
  }
}

validateEnv()

const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGIN)

export const env = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '30d',
  corsOrigin: corsOrigins[0] || 'http://localhost:5173',
  corsOrigins,
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowLegacyMasterkeyLogin: process.env.ALLOW_LEGACY_MASTERKEY_LOGIN === 'true',
  
  // OAuth Configuration
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/accounts/oauth/google/callback',
  
  githubClientId: process.env.GITHUB_CLIENT_ID || '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  githubRedirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:4000/api/accounts/oauth/github/callback',
  
  // Frontend URLs for OAuth redirects
  appUrl: process.env.APP_URL || 'http://localhost:5173',
}
