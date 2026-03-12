import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { CounterModel } from '../../../server/src/infrastructure/database/models/pmc/Counter'
import { ApplicantDetailModel } from '../../../server/src/infrastructure/database/models/pmc/ApplicantDetail'
import {
  ApplicantDocumentModel,
  DocumentStatus,
  DocumentType,
} from '../../../server/src/infrastructure/database/models/pmc/ApplicantDocument'
import {
  BusinessProfileModel,
  BusinessStatus,
  EntityType,
} from '../../../server/src/infrastructure/database/models/pmc/BusinessProfile'
import { ExternalServiceTokenModel } from '../../../server/src/infrastructure/database/models/common/ExternalServiceToken'

describe('Mongoose model behavior: hooks, virtuals, and methods', () => {
  let mongoServer: MongoMemoryServer
  const mongooseBase = ApplicantDetailModel.db.base
  const { Types } = mongooseBase

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongooseBase.connect(mongoServer.getUri())
  }, 60_000)

  beforeEach(async () => {
    await ApplicantDetailModel.deleteMany({})
    await ApplicantDocumentModel.deleteMany({})
    await BusinessProfileModel.deleteMany({})
    await ExternalServiceTokenModel.deleteMany({})
    await CounterModel.deleteMany({})
  })

  afterAll(async () => {
    await mongooseBase.connection.dropDatabase()
    await mongooseBase.disconnect()
    await mongoServer.stop()
  }, 60_000)

  it('should run ApplicantDetail pre-save hook and assign incremental numericId', async () => {
    const first = await ApplicantDetailModel.create({ firstName: 'Alice' })
    const second = await ApplicantDetailModel.create({ firstName: 'Bob' })

    expect(first.numericId).toBe(1)
    expect(second.numericId).toBe(2)
  })

  it('should not increment ApplicantDetail counter on findByIdAndUpdate', async () => {
    const created = await ApplicantDetailModel.create({ firstName: 'Initial' })
    const counterBefore = await CounterModel.findOne({ name: 'ApplicantDetail' }).lean()

    await ApplicantDetailModel.findByIdAndUpdate(created._id, { firstName: 'Updated' }, { new: true })

    const counterAfter = await CounterModel.findOne({ name: 'ApplicantDetail' }).lean()
    expect(counterAfter?.seq).toBe(counterBefore?.seq)
  })

  it('should compute ExternalServiceToken.isExpired correctly for past and future expiry', () => {
    const expired = new ExternalServiceTokenModel({
      serviceName: 'sandbox',
      accessToken: 'tok-expired',
      expiresAt: new Date(Date.now() - 60_000),
    })

    const active = new ExternalServiceTokenModel({
      serviceName: 'sandbox',
      accessToken: 'tok-active',
      expiresAt: new Date(Date.now() + 60_000),
    })

    expect(expired.isExpired()).toBe(true)
    expect(active.isExpired()).toBe(false)
  })

  it('should apply ApplicantDocument verify and markAsExpired methods and virtuals', async () => {
    const verifierId = new Types.ObjectId()
    const expiringSoon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)

    const doc = await ApplicantDocumentModel.create({
      applicantId: 101,
      documentType: DocumentType.CNIC,
      fileUrl: 'https://example.com/doc-101.pdf',
      fileName: 'doc-101.pdf',
      fileSize: 2048,
      mimeType: 'application/pdf',
      expiryDate: expiringSoon,
    })

    expect(doc.numericId).toBe(1)
    expect((doc as unknown as { isExpired: boolean }).isExpired).toBe(false)
    expect((doc as unknown as { isExpiringSoon: boolean }).isExpiringSoon).toBe(true)

    await doc.verify(verifierId, false)
    expect(doc.status).toBe(DocumentStatus.VERIFIED)
    expect(doc.verifiedBy?.toString()).toBe(verifierId.toString())
    expect(doc.verificationDate).toBeInstanceOf(Date)

    await doc.markAsExpired()
    expect(doc.status).toBe(DocumentStatus.EXPIRED)
  })

  it('should set ApplicantDocument as rejected when verify is called with rejected flag', async () => {
    const verifierId = new Types.ObjectId()

    const doc = await ApplicantDocumentModel.create({
      applicantId: 202,
      documentType: DocumentType.PASSPORT,
      fileUrl: 'https://example.com/passport.pdf',
      fileName: 'passport.pdf',
      fileSize: 4096,
      mimeType: 'application/pdf',
    })

    await doc.verify(verifierId, true, 'Unreadable document')

    expect(doc.status).toBe(DocumentStatus.REJECTED)
    expect(doc.rejectionReason).toBe('Unreadable document')
  })

  it('should apply BusinessProfile methods verify, activate, and suspend', async () => {
    const verifierId = new Types.ObjectId()

    const profile = await BusinessProfileModel.create({
      applicantId: 301,
      businessName: 'Eco Plastics',
      entityType: EntityType.PRODUCER,
      registration: {
        licenseExpiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      },
    })

    expect(profile.numericId).toBe(1)
    expect((profile as unknown as { licenseExpiringWithin30Days: boolean }).licenseExpiringWithin30Days).toBe(true)
    expect((profile as unknown as { licenseExpired: boolean }).licenseExpired).toBe(false)

    await profile.verify(verifierId, false)
    expect(profile.status).toBe(BusinessStatus.VERIFIED)
    expect(profile.verifiedBy?.toString()).toBe(verifierId.toString())

    await profile.activate()
    expect(profile.status).toBe(BusinessStatus.ACTIVE)
    expect(profile.isActive).toBe(true)

    await profile.suspend('Compliance review')
    expect(profile.status).toBe(BusinessStatus.SUSPENDED)
    expect(profile.remarks).toBe('Compliance review')
  })

  it('should set BusinessProfile as rejected with reason when verify is called in rejected mode', async () => {
    const verifierId = new Types.ObjectId()

    const profile = await BusinessProfileModel.create({
      applicantId: 302,
      businessName: 'Reuse Partners',
    })

    await profile.verify(verifierId, true, 'Missing regulatory docs')

    expect(profile.status).toBe(BusinessStatus.REJECTED)
    expect(profile.rejectionReason).toBe('Missing regulatory docs')
  })

  it('should evaluate BusinessProfile licenseExpired virtual for past license date', async () => {
    const profile = await BusinessProfileModel.create({
      applicantId: 303,
      businessName: 'Legacy Corp',
      registration: {
        licenseExpiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    })

    expect((profile as unknown as { licenseExpired: boolean }).licenseExpired).toBe(true)
    expect((profile as unknown as { licenseExpiringWithin30Days: boolean }).licenseExpiringWithin30Days).toBe(false)
  })
})
