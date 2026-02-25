import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../../../infrastructure/config/env'
import type { UserRepository } from '../../../domain/repositories/accounts'
import { userRepositoryMongo } from '../../../infrastructure/database/repositories/accounts'

export type AuthServiceDeps = {
  userRepo: UserRepository
}

const defaultDeps: AuthServiceDeps = {
  userRepo: userRepositoryMongo,
}

type Pbkdf2Hash = {
  algorithm: string
  iterations: number
  salt: string
  hash: string
}

function parsePbkdf2Hash(value: string): Pbkdf2Hash | null {
  const parts = value.split('$')
  if (parts.length !== 4) return null
  const [algorithm, iterationsStr, salt, hash] = parts
  const iterations = Number(iterationsStr)
  if (!algorithm || !salt || !hash || !Number.isFinite(iterations)) return null
  return { algorithm, iterations, salt, hash }
}

function verifyPbkdf2Sha256(password: string, encoded: string): boolean {
  const parsed = parsePbkdf2Hash(encoded)
  if (!parsed || parsed.algorithm !== 'pbkdf2_sha256') return false
  const derived = crypto.pbkdf2Sync(password, parsed.salt, parsed.iterations, 32, 'sha256')
  const derivedB64 = derived.toString('base64')
  const a = Buffer.from(derivedB64)
  const b = Buffer.from(parsed.hash)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function isBcryptHash(value: string) {
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$')
}

export async function createUser(
  params: { username: string; password: string; firstName?: string; lastName?: string },
  deps: AuthServiceDeps = defaultDeps
): Promise<string> {
  const passwordHash = await bcrypt.hash(params.password, 10)
  const user = await deps.userRepo.create({
    username: params.username,
    passwordHash,
    firstName: params.firstName,
    lastName: params.lastName,
    groups: ['APPLICANT'],
    isActive: true,
  })
  return String(user.id)
}

export async function validatePassword(user: { passwordHash: string }, password: string): Promise<boolean> {
  const hash = user.passwordHash
  if (hash.startsWith('pbkdf2_sha256$')) {
    return verifyPbkdf2Sha256(password, hash)
  }
  if (isBcryptHash(hash)) {
    return bcrypt.compare(password, hash)
  }
  return false
}

export function signTokens(userId: string) {
  const access = jwt.sign({ userId, type: 'access' }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions)
  const refresh = jwt.sign({ userId, type: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  } as jwt.SignOptions)
  return { access, refresh }
}
