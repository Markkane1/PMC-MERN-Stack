import { Request, Response } from 'express'
<<<<<<< HEAD
import crypto from 'crypto'
=======
import { logApiCall } from '../../services/common/LogService'
>>>>>>> 154f65844a53b9b14ce69dd577a9f79de8b3c6e5
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type {
  ApplicantRepository,
  ApplicantFeeRepository,
  BusinessProfileRepository,
  DistrictRepository,
  PSIDTrackingRepository,
} from '../../../domain/repositories/pmc'
import {
  applicantFeeRepositoryMongo,
  applicantRepositoryMongo,
  businessProfileRepositoryMongo,
  districtRepositoryMongo,
  psidTrackingRepositoryMongo,
} from '../../../infrastructure/database/repositories/pmc'
import { ExternalServiceTokenModel } from '../../../infrastructure/database/models/common/ExternalServiceToken'
import { ServiceConfigurationModel } from '../../../infrastructure/database/models/common/ServiceConfiguration'

type AuthRequest = Request & { user?: any }

type PsidDeps = {
  applicantRepo: ApplicantRepository
  feeRepo: ApplicantFeeRepository
  businessProfileRepo: BusinessProfileRepository
  districtRepo: DistrictRepository
  psidRepo: PSIDTrackingRepository
}

const defaultDeps: PsidDeps = {
  applicantRepo: applicantRepositoryMongo,
  feeRepo: applicantFeeRepositoryMongo,
  businessProfileRepo: businessProfileRepositoryMongo,
  districtRepo: districtRepositoryMongo,
  psidRepo: psidTrackingRepositoryMongo,
}

export const generatePsid = asyncHandler(async (req: AuthRequest, res: Response) => {
  const applicantId = req.query.applicant_id as string | undefined
  if (!applicantId) {
    return res.status(400).send(buildHtmlResponse('Error', '<p>Missing applicant_id</p>', 400))
  }

  const applicant = await defaultDeps.applicantRepo.findByNumericId(Number(applicantId))
  if (!applicant) {
    return res.status(404).send(buildHtmlResponse('Error', '<p>Applicant not found</p>', 404))
  }

<<<<<<< HEAD
  const psid = await defaultDeps.psidRepo.create({
    applicantId: (applicant as any).numericId,
    deptTransactionId: `TX-${Date.now()}`,
    dueDate: new Date(),
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    amountWithinDueDate: 0,
    consumerName: `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim(),
    mobileNo: (applicant as any).mobileNo,
    cnic: (applicant as any).cnic,
    districtId: null,
    amountBifurcation: {},
    consumerNumber: `PSID-${crypto.randomInt(100000, 1000000)}`,
    status: 'Generated',
    createdBy: req.user?._id,
=======
  if (req.user && !isSuperUser(req.user) && String((applicant as any).createdBy) !== String(req.user._id)) {
    return res.status(403).send(buildHtmlResponse('Forbidden', '<p>You do not have access to this applicant.</p>', 403))
  }

  if (!['Created', 'Fee Challan'].includes((applicant as any).applicationStatus || 'Created')) {
    return res.status(400).send(
      buildHtmlResponse('Error', '<p>Applicant is not eligible for PSID generation.</p>', 400)
    )
  }

  const latestPsid = await defaultDeps.psidRepo.findLatestByApplicantId(Number(applicantId))
  if (latestPsid?.consumerNumber && latestPsid.expiryDate && new Date(latestPsid.expiryDate) >= new Date()) {
    const html = buildPsidReceiptHtml(applicant, latestPsid)
    return res.status(200).send(html)
  }

  const fees = await defaultDeps.feeRepo.listByApplicantId(Number(applicantId))
  const lastFee = fees[0]
  if (!lastFee || !lastFee.feeAmount) {
    return res.status(400).send(
      buildHtmlResponse('Error', '<p>No fee record found for this applicant.</p>', 400)
    )
  }

  const businessProfile = await defaultDeps.businessProfileRepo.findByApplicantId(Number(applicantId))
  const districtIdVal = businessProfile?.districtId
  const district = districtIdVal ? await defaultDeps.districtRepo.findByDistrictId(districtIdVal) : null
  const pitbDistrictId = district?.pitbDistrictId || 0

  const config = await getServiceConfig('ePay')
  if (!config?.generatePsidEndpoint || !config?.authEndpoint || !config?.clientId || !config?.clientSecret) {
    return res.status(500).send(buildHtmlResponse('Error', '<p>ePay configuration is missing.</p>', 500))
  }

  const token = await getOrRefreshToken(config)

  const graceDays = 15
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + graceDays)
  const expiryDate = new Date(dueDate)
  expiryDate.setHours(23, 59, 59, 0)

  const consumerName = `${(applicant as any).firstName} ${(applicant as any).lastName || ''}`.trim()
  const mobileNo = (applicant as any).mobileNo ? `0${String((applicant as any).mobileNo).replace(/^0+/, '')}` : ''
  const cnic = ((applicant as any).cnic || '').replace(/-/g, '')
  const email = (applicant as any).email || `${cnic || 'unknown'}@cnic.pk`
  const deptTransactionId = String(Date.now())

  const amountWithinDueDate = Number(lastFee.feeAmount || 0)
  const payload = {
    deptTransactionId,
    dueDate: formatDate(dueDate),
    expiryDate: formatDateTime(expiryDate),
    amountWithinDueDate: String(amountWithinDueDate),
    amountAfterDueDate: '',
    consumerName,
    mobileNo,
    cnic,
    districtID: String(pitbDistrictId),
    email,
    amountBifurcation: [
      {
        accountHeadName: 'Initial Environmental Examination and Environmental Impact Assessment Review Fee',
        accountNumber: 'C03855',
        amountToTransfer: String(amountWithinDueDate),
      },
    ],
  }

  const response = await postJson(config.generatePsidEndpoint, payload, {
    Authorization: `Bearer ${token}`,
>>>>>>> 154f65844a53b9b14ce69dd577a9f79de8b3c6e5
  })

  await logApiCall({
    serviceName: config.serviceName,
    endpoint: config.generatePsidEndpoint,
    requestData: payload,
    responseData: response.data as any,
    statusCode: response.status,
  })

  if (response.status === 200 && response.data?.status === 'OK') {
    const consumerNumber = response.data?.content?.[0]?.consumerNumber || ''
    const psidRecord = await defaultDeps.psidRepo.create({
      applicantId: (applicant as any).numericId,
      deptTransactionId,
      dueDate,
      expiryDate,
      amountWithinDueDate,
      amountAfterDueDate: 0,
      consumerName,
      mobileNo,
      cnic,
      email,
      districtId: pitbDistrictId,
      amountBifurcation: payload.amountBifurcation,
      consumerNumber,
      status: 'OK',
      message: response.data?.message || 'PSID generated successfully',
      createdBy: req.user?._id,
    })

    await defaultDeps.applicantRepo.updateByNumericId((applicant as any).numericId, {
      applicationStatus: 'Fee Challan',
    })

    return res.status(200).send(buildPsidReceiptHtml(applicant, psidRecord))
  }

  return res.status(400).send(
    buildHtmlResponse(
      'PSID Generation Failed',
      `<p>ePay returned an error or invalid status.</p><pre>${escapeHtml(
        JSON.stringify(response.data || {}, null, 2)
      )}</pre>`,
      400
    )
  )
})

export const checkPsidStatus = asyncHandler(async (req: Request, res: Response) => {
  const applicantId = req.query.applicant_id as string | undefined
  if (!applicantId) {
    return res.status(400).send(buildHtmlResponse('Error', '<p>Missing applicant_id</p>', 400))
  }

  const psid = await defaultDeps.psidRepo.findLatestByApplicantId(Number(applicantId))
  if (!psid) {
    return res.status(404).send(buildHtmlResponse('Error', '<p>No PSID found for the applicant</p>', 404))
  }

  if (!psid.consumerNumber) {
    return res.status(404).send(buildHtmlResponse('Error', '<p>No PSID found for the applicant</p>', 404))
  }

  const config = await getServiceConfig('ePay')
  if (!config?.transactionStatusEndpoint || !config?.authEndpoint || !config?.clientId || !config?.clientSecret) {
    return res.status(500).send(buildHtmlResponse('Error', '<p>ePay configuration is missing.</p>', 500))
  }

  const token = await getOrRefreshToken(config)
  const payload = { consumerNumber: psid.consumerNumber }
  const response = await postJson(config.transactionStatusEndpoint, payload, {
    Authorization: `Bearer ${token}`,
  })

  await logApiCall({
    serviceName: config.serviceName,
    endpoint: config.transactionStatusEndpoint,
    requestData: payload,
    responseData: response.data as any,
    statusCode: response.status,
  })

  if (response.status === 200 && response.data?.status === 'OK') {
    const content = response.data?.content?.[0] || {}
    const psidStatus = content.psidStatus || 'UNPAID'
    const updates: Record<string, unknown> = {
      paymentStatus: psidStatus,
    }
    if (psidStatus === 'PAID') {
      updates.amountPaid = content.amountPaid
      updates.paidDate = content.paidDate ? new Date(content.paidDate) : undefined
      updates.paidTime = content.paidTime
      updates.bankCode = content.bankCode
    }
    await defaultDeps.psidRepo.updateById(String((psid as any)._id || (psid as any).id), updates)
    return res.status(200).send(buildPsidStatusHtml(psid.consumerNumber, psidStatus, content, response.data?.message))
  }

  return res.status(response.status || 500).send(
    buildHtmlResponse(
      'PSID Status Error',
      `<p>${escapeHtml(response.data?.message || 'Unable to fetch payment status')}</p>`,
      response.status || 500
    )
  )
})

export const paymentIntimation = asyncHandler(async (req: Request, res: Response) => {
  const data = (req as any).body || {}
  const requiredFields = [
    'consumerNumber',
    'psidStatus',
    'deptTransactionId',
    'amountPaid',
    'paidDate',
    'paidTime',
    'bankCode',
  ]

  for (const field of requiredFields) {
    if (!data[field]) {
      return logAndRespond(req, res, { status: 'Fail', message: `${field} is required and cannot be empty` }, 400)
    }
  }

  const consumerNumber = String(data.consumerNumber || '').trim()
  const deptTransactionId = String(data.deptTransactionId || '').trim()
  if (!consumerNumber) {
    return logAndRespond(req, res, { status: 'Fail', message: 'Consumer number cannot be empty or invalid' }, 400)
  }
  if (!deptTransactionId) {
    return logAndRespond(req, res, { status: 'Fail', message: 'Department transaction ID/Challan number cannot be empty' }, 400)
  }

  if (data.psidStatus !== 'PAID') {
    return logAndRespond(req, res, { status: 'Fail', message: "PSID status must be 'PAID'" }, 400)
  }

  const paidDate = parseDate(data.paidDate)
  if (!paidDate) {
    return logAndRespond(req, res, { status: 'Fail', message: 'Paid date must be in YYYY-MM-DD format' }, 400)
  }

  if (!isValidTime(data.paidTime)) {
    return logAndRespond(req, res, { status: 'Fail', message: 'Paid time must be in HH:MM:SS format' }, 400)
  }

  const amountPaid = Number(data.amountPaid)
  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    return logAndRespond(req, res, { status: 'Fail', message: 'Amount paid must be a positive number' }, 400)
  }

  const bankCode = String(data.bankCode || '')
  if (!/^[a-z0-9]+$/i.test(bankCode)) {
    return logAndRespond(req, res, { status: 'Fail', message: 'Bank code cannot contain special characters' }, 400)
  }

  const psidRecord = await defaultDeps.psidRepo.findByConsumerAndDept(consumerNumber, deptTransactionId)
  if (!psidRecord) {
    return logAndRespond(
      req,
      res,
      { status: 'Fail', message: 'No matching PSID record found for the provided consumer number and challan number' },
      400
    )
  }

  if (psidRecord.paymentStatus === 'PAID') {
    return logAndRespond(req, res, { status: 'OK', message: 'PSID is already marked as PAID' }, 200)
  }

  if (Number(psidRecord.amountWithinDueDate || 0) !== amountPaid) {
    return logAndRespond(req, res, { status: 'Fail', message: 'Amount paid does not match the expected amount' }, 400)
  }

  await defaultDeps.psidRepo.updateById(String((psidRecord as any)._id || (psidRecord as any).id), {
    paymentStatus: 'PAID',
    amountPaid,
    paidDate,
    paidTime: data.paidTime,
    bankCode,
    message: 'Payment intimated successfully',
  })

  if (psidRecord.applicantId) {
    await defaultDeps.applicantRepo.updateByNumericId(Number(psidRecord.applicantId), {
      applicationStatus: 'Submitted',
    })
  }

  return logAndRespond(req, res, { status: 'OK', message: 'Payment intimated successfully' }, 200)
})

export const plmisToken = asyncHandler(async (_req: Request, res: Response) => {
  const { clientId, clientSecretKey, grant_type } = (_req as any).body || {}
  const config = await getServiceConfig('ePay')
  if (!config?.authEndpoint) {
    return res.status(500).json({ error: 'Auth endpoint not configured.' })
  }
  const payload = {
    clientId,
    clientSecretKey,
    grant_type: grant_type || 'client_credentials',
  }

  const response = await postJson(config.authEndpoint, payload)
  const content = response.data?.content?.[0]
  const tokenInfo = content?.token || {}
  const expiresAt = content?.expiryDate
  const expiryDateStr = expiresAt ? new Date(expiresAt).toISOString() : new Date(Date.now() + 3600 * 1000).toISOString()

  const formatted = {
    status: response.data?.error ? 'Fail' : 'OK',
    message: '',
    content: [
      {
        clientId,
        token: {
          tokenType: tokenInfo.tokenType || '',
          accessToken: tokenInfo.accessToken || '',
        },
        expiryDate: expiryDateStr,
      },
    ],
  }

  await logApiCall({
    serviceName: config.serviceName,
    endpoint: config.authEndpoint,
    requestData: payload,
    responseData: formatted as any,
    statusCode: response.status,
  })

  return res.status(response.status || 200).json(formatted)
})

function serializePsid(psid: any) {
  if (!psid) return {}
  return {
    id: psid._id || psid.id,
    applicant_id: psid.applicantId,
    dept_transaction_id: psid.deptTransactionId,
    due_date: psid.dueDate ? psid.dueDate.toISOString().slice(0, 10) : null,
    expiry_date: psid.expiryDate,
    amount_within_due_date: psid.amountWithinDueDate,
    amount_after_due_date: psid.amountAfterDueDate,
    consumer_name: psid.consumerName,
    mobile_no: psid.mobileNo,
    cnic: psid.cnic,
    email: psid.email,
    district_id: psid.districtId,
    amount_bifurcation: psid.amountBifurcation,
    consumer_number: psid.consumerNumber,
    status: psid.status,
    message: psid.message,
    payment_status: psid.paymentStatus,
    amount_paid: psid.amountPaid,
    paid_date: psid.paidDate ? psid.paidDate.toISOString().slice(0, 10) : null,
    paid_time: psid.paidTime,
    bank_code: psid.bankCode,
    created_at: psid.createdAt,
  }
}

type ServiceConfig = {
  serviceName: string
  authEndpoint?: string
  generatePsidEndpoint?: string
  transactionStatusEndpoint?: string
  clientId?: string
  clientSecret?: string
}

async function getServiceConfig(serviceName: string): Promise<ServiceConfig | null> {
  const config = await ServiceConfigurationModel.findOne({ serviceName }).lean()
  if (config) {
    return {
      serviceName: config.serviceName,
      authEndpoint: config.authEndpoint,
      generatePsidEndpoint: config.generatePsidEndpoint,
      transactionStatusEndpoint: config.transactionStatusEndpoint,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    }
  }
  const legacy = await ServiceConfigurationModel.findOne({ service_name: serviceName } as any).lean()
  return legacy
    ? {
        serviceName: (legacy as any).serviceName || (legacy as any).service_name,
        authEndpoint: (legacy as any).authEndpoint || (legacy as any).auth_endpoint,
        generatePsidEndpoint: (legacy as any).generatePsidEndpoint || (legacy as any).generate_psid_endpoint,
        transactionStatusEndpoint:
          (legacy as any).transactionStatusEndpoint || (legacy as any).transaction_status_endpoint,
        clientId: (legacy as any).clientId || (legacy as any).client_id,
        clientSecret: (legacy as any).clientSecret || (legacy as any).client_secret,
      }
    : null
}

async function getOrRefreshToken(config: ServiceConfig) {
  const latest = await ExternalServiceTokenModel.findOne({ serviceName: config.serviceName })
    .sort({ createdAt: -1 })
    .lean()
  if (latest?.accessToken && latest.expiresAt && new Date(latest.expiresAt) > new Date()) {
    return latest.accessToken
  }

  const payload = {
    clientId: config.clientId,
    clientSecretKey: config.clientSecret,
  }

  const response = await postJson(config.authEndpoint || '', payload)
  await logApiCall({
    serviceName: config.serviceName,
    endpoint: config.authEndpoint || '',
    requestData: payload,
    responseData: response.data as any,
    statusCode: response.status,
  })

  const content = response.data?.content?.[0]
  const tokenInfo = content?.token || {}
  const accessToken = tokenInfo.accessToken || ''
  const expiryRaw =
    content?.expiryDate ??
    content?.expiry_date ??
    content?.expiresAt ??
    content?.expires_at ??
    null
  const parsedExpiry = parseExpiryValue(expiryRaw)
  const expiresAt = parsedExpiry || new Date(Date.now() + 3600 * 1000)

  const created = await ExternalServiceTokenModel.create({
    serviceName: config.serviceName,
    accessToken,
    expiresAt,
  })

  return created.accessToken
}

function parseExpiryValue(raw: any): Date | null {
  if (!raw) return null
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const ms = raw < 1e12 ? raw * 1000 : raw
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const asNum = Number(trimmed)
    if (Number.isFinite(asNum)) {
      const ms = asNum < 1e12 ? asNum * 1000 : asNum
      const d = new Date(ms)
      return Number.isNaN(d.getTime()) ? null : d
    }
    const d = new Date(trimmed)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

async function postJson(url: string, payload: Record<string, unknown>, headers: Record<string, string> = {}) {
  if (!url) {
    return { status: 500, data: { error: 'Missing endpoint URL' } }
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  })
  const text = await resp.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { error: 'Could not parse JSON from endpoint', body: text }
  }
  return { status: resp.status, data }
}

function formatDate(date: Date | string | undefined) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function formatDateTime(date: Date | string | undefined) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const iso = d.toISOString().replace('T', ' ')
  return iso.slice(0, 19)
}

function parseDate(value: string) {
  if (!value) return null
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value)
  return match ? new Date(value) : null
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}:\d{2}$/.test(String(value || ''))
}

function buildHtmlResponse(title: string, body: string, statusCode: number) {
  return `<!doctype html>
<html>
  <head><title>${escapeHtml(title)}</title></head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    ${body}
  </body>
</html>`
}

function buildPsidReceiptHtml(applicant: any, psid: any) {
  const name = `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim()
  return buildHtmlResponse(
    'PSID Receipt',
    `<p><strong>Consumer Number:</strong> ${escapeHtml(String(psid.consumerNumber || ''))}</p>
     <p><strong>Applicant:</strong> ${escapeHtml(name)}</p>
     <p><strong>Tracking Number:</strong> ${escapeHtml(String(applicant.trackingNumber || ''))}</p>
     <p><strong>Amount:</strong> ${escapeHtml(String(psid.amountWithinDueDate || ''))}</p>
     <p><strong>Due Date:</strong> ${escapeHtml(formatDate(new Date(psid.dueDate)))}</p>
     <p><strong>Expiry Date:</strong> ${escapeHtml(formatDateTime(new Date(psid.expiryDate)))}</p>`,
    200
  )
}

function buildPsidStatusHtml(consumerNumber: string, status: string, content: any, message?: string) {
  return buildHtmlResponse(
    'PSID Status',
    `<p><strong>Consumer Number:</strong> ${escapeHtml(String(consumerNumber))}</p>
     <p><strong>Status:</strong> ${escapeHtml(String(status))}</p>
     <p><strong>Amount Paid:</strong> ${escapeHtml(String(content?.amountPaid || ''))}</p>
     <p><strong>Paid Date:</strong> ${escapeHtml(String(content?.paidDate || ''))}</p>
     <p><strong>Paid Time:</strong> ${escapeHtml(String(content?.paidTime || ''))}</p>
     <p><strong>Bank Code:</strong> ${escapeHtml(String(content?.bankCode || ''))}</p>
     <p>${escapeHtml(message || '')}</p>`,
    200
  )
}

function logAndRespond(req: Request, res: Response, payload: Record<string, unknown>, statusCode: number) {
  logApiCall({
    serviceName: 'payment_intimation_exposed',
    endpoint: req.originalUrl || '/api/pmc/payment-intimation/',
    requestData: (req as any).body as any,
    responseData: payload as any,
    statusCode,
  })
  return res.status(statusCode).json(payload)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isSuperUser(user: any) {
  return Boolean(user?.isSuperadmin || user?.groups?.includes('Super'))
}




