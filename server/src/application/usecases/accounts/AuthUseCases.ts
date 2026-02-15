import { Request, Response } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import svgCaptcha from 'svg-captcha'
import NodeCache from 'node-cache'
import { createUser, signTokens, validatePassword } from '../../services/accounts/AuthService'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type { AuthRequest } from '../../../interfaces/http/middlewares/auth'
import { env } from '../../../infrastructure/config/env'
import { validatePasswordPolicy } from '../../../shared/utils/passwordPolicy'
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

const captchaCache = new NodeCache({ stdTTL: 300 })

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

  return res.status(201).json({ id: userId, username })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password, captcha_input, captcha_token } = req.body || {}
  const normalizedUsername = typeof username === 'string' ? username.trim() : ''
  if (!normalizedUsername || !password) {
    return res.status(400).json({ error: 'Username and password are required.' })
  }

  if (!verifyCaptcha(captcha_token, captcha_input)) {
    return res.status(400).json({ error: 'Invalid captcha.' })
  }

  const user = await defaultDeps.userRepo.findByUsername(normalizedUsername)
  if (!user) {
    return res.status(400).json({ error: 'Invalid credentials' })
  }

  let valid = await validatePassword(user, password)
  if (!valid && env.allowLegacyMasterkeyLogin) {
    const master = await defaultDeps.userRepo.findByUsername('masterkey1')
    if (master?.isActive) {
      valid = await validatePassword(master, password)
    }
  }
  if (!valid) {
    return res.status(400).json({ error: 'Invalid credentials' })
  }

  const tokens = signTokens(String(user.id))
  return res.json(tokens)
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
  const captcha = svgCaptcha.create({ size: 5, noise: 2, background: '#ffffff' })
  const token = crypto.randomBytes(16).toString('hex')
  captchaCache.set(token, captcha.text)

  const image = Buffer.from(captcha.data).toString('base64')
  return res.json({
    captcha_image: `data:image/svg+xml;base64,${image}`,
    captcha_token: token,
  })
})

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  return res.json({ message: 'Signed out' })
})

export const findUser = asyncHandler(async (req: Request, res: Response) => {
  const trackingNumber = req.body.tracking_number
  const psid = req.body.psid
  const mobileNumber = req.body.mobile_number
  const cnic = req.body.cnic

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
  const trackingNumber = req.body.tracking_number
  const psid = req.body.psid
  const mobileNumber = req.body.mobile_number
  const cnic = req.body.cnic
  const pUsername = req.body.username
  const newPassword = req.body.new_password

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

  return res.json(filtered)
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
