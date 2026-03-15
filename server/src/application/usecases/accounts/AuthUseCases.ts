import { Request, Response } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import NodeCache from 'node-cache'
import { logAudit } from '../../services/common/LogService'
import { createUser, signTokens, validatePassword } from '../../services/accounts/AuthService'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type { AuthRequest } from '../../../interfaces/http/middlewares/auth'
import { env } from '../../../infrastructure/config/env'
import { validatePasswordPolicy } from '../../../shared/utils/passwordPolicy'
import { paginateArray, parsePaginationParams } from '../../../infrastructure/utils/pagination'
import type { UserRepository, UserProfileRepository } from '../../../domain/repositories/accounts'
import type { ApplicantRepository, PSIDTrackingRepository, DistrictRepository } from '../../../domain/repositories/pmc'
import {
  userRepositoryMongo,
  userProfileRepositoryMongo,
} from '../../../infrastructure/database/repositories/accounts'
import {
  applicantRepositoryMongo,
  psidTrackingRepositoryMongo,
  districtRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'
import {
  clearAuthCookie,
  clearCsrfCookie,
  setAuthCookie,
  setCsrfCookie,
} from '../../../interfaces/http/utils/authCookies'
import { getClientIpAddress, loginRateLimiter } from '../../../infrastructure/resilience/rateLimiting'

const captchaCache = new NodeCache({ stdTTL: 300 })
const CAPTCHA_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCaptchaText(length: number): string {
  let out = ''
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * CAPTCHA_ALPHABET.length)
    out += CAPTCHA_ALPHABET.charAt(idx)
  }
  return out
}

function generateCaptchaSvg(text: string): string {
  const width = 170
  const height = 56
  const chars = text
    .split('')
    .map((char, i) => {
      const x = 16 + i * 28
      const y = 36 + ((i % 2 === 0 ? -1 : 1) * (4 + (i % 3)))
      const rotate = (Math.random() * 20 - 10).toFixed(2)
      return `<text x="${x}" y="${y}" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="#111827" transform="rotate(${rotate} ${x} ${y})">${char}</text>`
    })
    .join('')

  const noiseLines = Array.from({ length: 5 }, (_v, i) => {
    const y1 = 8 + i * 9
    const y2 = 12 + i * 9
    return `<line x1="0" y1="${y1}" x2="${width}" y2="${y2}" stroke="#d1d5db" stroke-width="1" />`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${noiseLines}${chars}</svg>`
}

function verifyCaptcha(captchaToken: unknown, captchaInput: unknown): boolean {
  const token = typeof captchaToken === 'string' ? captchaToken.trim() : ''
  const input = typeof captchaInput === 'string' ? captchaInput.trim() : ''
  if (!token && !input) return true
  if (!token || !input) return false

  const expected = captchaCache.get<string>(token)
  const isValid = Boolean(expected && expected.toLowerCase() === input.toLowerCase())
  captchaCache.del(token)
  return isValid
}

type AuthUseCaseDeps = {
  userRepo: UserRepository
  userProfileRepo: UserProfileRepository
  applicantRepo: ApplicantRepository
  psidRepo: PSIDTrackingRepository
  districtRepo: DistrictRepository
}

const defaultDeps: AuthUseCaseDeps = {
  userRepo: userRepositoryMongo,
  userProfileRepo: userProfileRepositoryMongo,
  applicantRepo: applicantRepositoryMongo,
  psidRepo: psidTrackingRepositoryMongo,
  districtRepo: districtRepositoryMongo,
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { username, password, first_name, last_name, captcha_input, captcha_token } = req.body || {}
  const normalizedUsername = typeof username === 'string' ? username.trim() : ''
  if (!normalizedUsername || !password) {
    return res.status(400).json({ message: 'Username and password are required.' })
  }

  const passwordPolicyError = validatePasswordPolicy(password)
  if (passwordPolicyError) {
    return res.status(400).json({ message: passwordPolicyError })
  }

  if (!verifyCaptcha(captcha_token, captcha_input)) {
    return res.status(400).json({ error: 'Invalid captcha.' })
  }

  const existing = await defaultDeps.userRepo.findByUsername(normalizedUsername)
  if (existing) {
    return res.status(400).json({ message: 'This username is already taken.' })
  }

  const userId = await createUser({
    username: normalizedUsername,
    password,
    firstName: first_name,
    lastName: last_name,
  })

  await logAudit({
    userId: String(userId),
    username,
    action: 'create',
    modelName: 'User',
    objectId: String(userId),
    description: 'User registered',
    ipAddress: req.ip,
  })

  return res.status(201).json({ id: userId, username })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password, captcha_input, captcha_token } = req.body || {}
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const normalizedUsername = username.trim()
  if (!normalizedUsername || !password) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  if (!verifyCaptcha(captcha_token, captcha_input)) {
    return res.status(400).json({ error: 'Invalid captcha.' })
  }

  const user = await defaultDeps.userRepo.findByUsername(normalizedUsername)
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  let valid = await validatePassword(user, password)
  if (!valid && env.allowLegacyMasterkeyLogin) {
    const master = await defaultDeps.userRepo.findByUsername('masterkey1')
    if (master?.isActive) {
      valid = await validatePassword(master, password)
    }
  }
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  loginRateLimiter.reset(getClientIpAddress(req.headers as Record<string, unknown>, req.socket.remoteAddress))

  const tokens = signTokens(String(user.id))
  setAuthCookie(res, tokens.access)
  setCsrfCookie(res)
  await logAudit({
    userId: String(user.id),
    username: user.username,
    action: 'login',
    modelName: 'User',
    objectId: String(user.id),
    description: 'User logged in',
    ipAddress: req.ip,
  })
  return res.json({
    message: 'Signed in',
    user: {
      userId: String(user.id),
      userName: user.username,
      username: user.username,
      authority: user.groups || [],
      avatar: user.avatar || '',
    },
  })
})

export const profile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user?._id ? await defaultDeps.userRepo.findById(String(req.user._id)) : null
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  return res.json({
    id: user.id,
    username: user.username,
    first_name: user.firstName,
    last_name: user.lastName,
    groups: user.groups,
    permissions: user.permissions || [],
    direct_permissions: user.directPermissions || [],
    is_superadmin: user.isSuperadmin || false,
  })
})

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { first_name, last_name } = req.body
  const user = req.user?._id
    ? await defaultDeps.userRepo.updateById(String(req.user._id), { firstName: first_name, lastName: last_name })
    : null
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  return res.json({
    id: user.id,
    username: user.username,
    first_name: user.firstName,
    last_name: user.lastName,
    groups: user.groups,
    permissions: user.permissions || [],
    direct_permissions: user.directPermissions || [],
    is_superadmin: user.isSuperadmin || false,
  })
})

export const resetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { current_password, new_password } = req.body || {}
  if (!current_password || !new_password) {
    return res.status(400).json({ detail: 'Current password and new password are required.' })
  }

  const passwordPolicyError = validatePasswordPolicy(new_password)
  if (passwordPolicyError) {
    return res.status(400).json({ detail: passwordPolicyError })
  }

  if (String(current_password) === String(new_password)) {
    return res.status(400).json({ detail: 'New password must be different from current password.' })
  }

  const user = req.user?._id ? await defaultDeps.userRepo.findById(String(req.user._id)) : null
  if (!user) {
    return res.status(404).json({ detail: 'User not found.' })
  }

  const valid = await bcrypt.compare(current_password, user.passwordHash)
  if (!valid) {
    return res.status(400).json({ detail: 'Current password is incorrect.' })
  }

  const newHash = await bcrypt.hash(new_password, 10)
  await defaultDeps.userRepo.updatePassword(String(user.id), newHash)
  return res.json({ message: 'Password updated successfully.' })
})

export const generateCaptcha = asyncHandler(async (_req: Request, res: Response) => {
  const captchaText = generateCaptchaText(5)
  const token = crypto.randomBytes(16).toString('hex')
  captchaCache.set(token, captchaText)

  const svg = generateCaptchaSvg(captchaText)
  const image = Buffer.from(svg).toString('base64')
  return res.json({
    captcha_image: `data:image/svg+xml;base64,${image}`,
    captcha_token: token,
  })
})

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  clearAuthCookie(res)
  clearCsrfCookie(res)
  const user = req.user
  if (user) {
    await logAudit({
      userId: String(user._id || user.id),
      username: user.username,
      action: 'logout',
      modelName: 'User',
      objectId: String(user._id || user.id),
      description: 'User logged out',
      ipAddress: req.ip,
    })
  }
  return res.json({ message: 'Signed out' })
})

export const findUser = asyncHandler(async (req: Request, res: Response) => {
  const rawTrackingNumber = req.body?.tracking_number
  const rawPsid = req.body?.psid
  const rawMobileNumber = req.body?.mobile_number
  const rawCnic = req.body?.cnic

  const invalidTypedInput =
    (rawMobileNumber !== undefined && typeof rawMobileNumber !== 'string') ||
    (rawCnic !== undefined && typeof rawCnic !== 'string')

  if (invalidTypedInput) {
    return res.status(400).json({ detail: 'Invalid input format.' })
  }

  const trackingNumber = typeof rawTrackingNumber === 'string'
    ? rawTrackingNumber.trim()
    : rawTrackingNumber != null
      ? String(rawTrackingNumber)
      : ''
  const psid = typeof rawPsid === 'string' ? rawPsid.trim() : rawPsid != null ? String(rawPsid) : ''
  const mobileNumber = typeof rawMobileNumber === 'string' ? rawMobileNumber.trim() : ''
  const cnic = typeof rawCnic === 'string' ? rawCnic.trim() : ''

  if (!mobileNumber || !cnic || (!trackingNumber && !psid)) {
    return res.status(400).json({ detail: 'Please provide Tracking Number or PSID, along with Mobile Number and CNIC.' })
  }

  let applicant: any
  if (trackingNumber) {
    applicant = await defaultDeps.applicantRepo.findOneWithCreator({
      trackingNumber,
      cnic,
      mobileNo: mobileNumber,
    })
  } else if (psid) {
    const psidRecord = await defaultDeps.psidRepo.findByConsumerNumber(psid)
    if (!psidRecord) {
      return res.status(404).json({ detail: 'No user found matching the provided details.' })
    }
    applicant = await defaultDeps.applicantRepo.findOneWithCreator({
      numericId: (psidRecord as any).applicantId,
      cnic,
      mobileNo: mobileNumber,
    })
  }

  if (!applicant) {
    return res.status(404).json({ detail: 'No user found matching the provided details.' })
  }

  const username = (applicant as any).createdBy?.username || 'Unknown'
  return res.json({ username })
})

export const resetForgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const rawTrackingNumber = req.body?.tracking_number
  const rawPsid = req.body?.psid
  const rawMobileNumber = req.body?.mobile_number
  const rawCnic = req.body?.cnic
  const rawUsername = req.body?.username
  const rawNewPassword = req.body?.new_password

  const invalidTypedInput =
    (rawMobileNumber !== undefined && typeof rawMobileNumber !== 'string') ||
    (rawCnic !== undefined && typeof rawCnic !== 'string') ||
    (rawUsername !== undefined && typeof rawUsername !== 'string') ||
    (rawNewPassword !== undefined && typeof rawNewPassword !== 'string')

  if (invalidTypedInput) {
    return res.status(400).json({ detail: 'Invalid input format.' })
  }

  const trackingNumber = typeof rawTrackingNumber === 'string'
    ? rawTrackingNumber.trim()
    : rawTrackingNumber != null
      ? String(rawTrackingNumber)
      : ''
  const psid = typeof rawPsid === 'string' ? rawPsid.trim() : rawPsid != null ? String(rawPsid) : ''
  const mobileNumber = typeof rawMobileNumber === 'string' ? rawMobileNumber.trim() : ''
  const cnic = typeof rawCnic === 'string' ? rawCnic.trim() : ''
  const pUsername = typeof rawUsername === 'string' ? rawUsername.trim() : ''
  const newPassword = typeof rawNewPassword === 'string' ? rawNewPassword : ''

  if (!mobileNumber || !cnic || (!trackingNumber && !psid) || !pUsername) {
    return res.status(400).json({ detail: 'Please provide Tracking Number or PSID, along with Mobile Number and CNIC.' })
  }

  const passwordPolicyError = validatePasswordPolicy(newPassword)
  if (passwordPolicyError) {
    return res.status(400).json({ detail: passwordPolicyError })
  }

  let applicant: any
  if (trackingNumber) {
    applicant = await defaultDeps.applicantRepo.findOneWithCreator({
      trackingNumber,
      cnic,
      mobileNo: mobileNumber,
    })
  } else if (psid) {
    const psidRecord = await defaultDeps.psidRepo.findByConsumerNumber(psid)
    if (!psidRecord) {
      return res.status(404).json({ detail: 'No user found matching the provided details.' })
    }
    applicant = await defaultDeps.applicantRepo.findOneWithCreator({
      numericId: (psidRecord as any).applicantId,
      cnic,
      mobileNo: mobileNumber,
    })
  }

  if (!applicant) {
    return res.status(404).json({ detail: 'No user found matching the provided details.' })
  }

  const username = (applicant as any).createdBy?.username || 'Unknown'
  if (username !== pUsername) {
    return res.status(400).json({ detail: 'Please provide Tracking Number or PSID, along with Mobile Number and CNIC.' })
  }

  const user = (applicant as any).createdBy
  if (!user?._id) {
    return res.status(404).json({ detail: 'No user found matching the provided details.' })
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await defaultDeps.userRepo.updatePassword(String(user._id), hash)

  return res.json({ message: 'Password reset successfully.' })
})

export const listInspectors = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user
  if (!user?.groups?.includes('DO')) {
    return res.status(403).json({ error: 'You do not have permission to view Inspector users.' })
  }

  const profile = await defaultDeps.userProfileRepo.findByUserId(String(user._id))
  if (!profile?.districtId) {
    return res.status(400).json({ error: 'Your profile does not have an assigned district.' })
  }

  const inspectors = await defaultDeps.userRepo.listByGroup('Inspector')
  const profiles = await defaultDeps.userProfileRepo.listByUserIds(inspectors.map((i) => String(i.id)))
  const profileMap = new Map(profiles.map((p) => [p.userId, p]))

  const filtered = inspectors
    .filter((inspector) => profileMap.get(String(inspector.id))?.districtId === profile.districtId)
    .map((inspector) => ({
      id: inspector.id,
      username: inspector.username,
      first_name: inspector.firstName,
      last_name: inspector.lastName,
    }))

  return res.json(paginateArray(filtered, parsePaginationParams(req.query)))
})

export const createOrUpdateInspector = asyncHandler(async (req: AuthRequest, res: Response) => {
  const doUser = req.user
  if (!doUser?.groups?.includes('DO')) {
    return res.status(403).json({ error: 'You do not have permission to create or update an Inspector user.' })
  }

  const doProfile = await defaultDeps.userProfileRepo.findByUserId(String(doUser._id))
  if (!doProfile?.districtId) {
    return res.status(400).json({ error: 'Your profile does not have an assigned district.' })
  }

  const { user_id, username, password, first_name, last_name } = req.body
  const normalizedUsername = typeof username === 'string' ? username.trim() : ''
  if (!normalizedUsername) {
    return res.status(400).json({ error: 'Username is required.' })
  }

  let user = null
  if (user_id) {
    user = await defaultDeps.userRepo.findByIdAndUsername(String(user_id), normalizedUsername)
  }

  if (user) {
    const updates: any = {}
    if (first_name) updates.firstName = first_name
    if (last_name) updates.lastName = last_name
    if (password) {
      const passwordPolicyError = validatePasswordPolicy(password)
      if (passwordPolicyError) {
        return res.status(400).json({ error: passwordPolicyError })
      }
      updates.passwordHash = await bcrypt.hash(password, 10)
    }
    await defaultDeps.userRepo.updateById(String(user.id), updates)

    return res.json({ message: `Inspector '${normalizedUsername}' updated successfully.` })
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required for new Inspector account.' })
  }

  const passwordPolicyError = validatePasswordPolicy(password)
  if (passwordPolicyError) {
    return res.status(400).json({ error: passwordPolicyError })
  }

  const existing = await defaultDeps.userRepo.findByUsername(normalizedUsername)
  if (existing) {
    return res.status(400).json({ error: 'This username is already taken.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const newUser = await defaultDeps.userRepo.create({
    username: normalizedUsername,
    passwordHash,
    firstName: first_name,
    lastName: last_name,
    groups: ['Inspector'],
    isActive: true,
  })

  const district = await defaultDeps.districtRepo.findByDistrictId(doProfile.districtId)
  await defaultDeps.userProfileRepo.create({
    userId: String(newUser.id),
    districtId: doProfile.districtId,
    districtName: district?.districtName,
    districtShortName: district?.shortName,
  })

  return res.status(201).json({
    message: `Inspector '${normalizedUsername}' created successfully in district '${district?.districtName || ''}'.`,
  })
})

