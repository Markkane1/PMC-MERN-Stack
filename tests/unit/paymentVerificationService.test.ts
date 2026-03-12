import { describe, expect, it, vi } from 'vitest'
import { PaymentVerificationService } from '../../server/src/application/services/pmc/PaymentVerificationService'

function createService() {
  const applicantRepo = {
    findByNumericId: vi.fn(),
    updateOne: vi.fn(),
    list: vi.fn(),
  } as any

  const feeRepo = {
    listByApplicantIds: vi.fn(),
    list: vi.fn(),
    listByApplicantId: vi.fn(),
    sumFeeByApplicantId: vi.fn(),
    countByApplicantId: vi.fn(),
    aggregateBySettlement: vi.fn(),
    findAll: vi.fn(),
  } as any

  const psidRepo = {
    list: vi.fn(),
    listPaidByApplicantId: vi.fn(),
    findByConsumerNumber: vi.fn(),
    findByConsumerAndDept: vi.fn(),
    countByApplicantId: vi.fn(),
    findLatestByApplicantId: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    findAll: vi.fn(),
  } as any

  const service = new PaymentVerificationService(applicantRepo, feeRepo, psidRepo)
  return { service, applicantRepo, feeRepo, psidRepo }
}

describe('PaymentVerificationService batching', () => {
  it('builds payment statuses for many applicants from batched fee and PSID queries', async () => {
    const { service, feeRepo, psidRepo } = createService()

    feeRepo.listByApplicantIds.mockResolvedValue([
      { applicantId: 101, feeAmount: 1000 },
      { applicantId: 101, feeAmount: 500 },
      { applicantId: 102, feeAmount: 750 },
    ])

    psidRepo.list.mockResolvedValue([
      { applicantId: 101, paymentStatus: 'PAID', amountPaid: 600, paidDate: '2026-03-01T00:00:00.000Z' },
      { applicantId: 101, paymentStatus: 'CONFIRMED', amountWithinDueDate: 400, paidDate: '2026-03-05T00:00:00.000Z' },
      { applicantId: 102, paymentStatus: 'FAILED', amountPaid: 999, paidDate: '2026-03-06T00:00:00.000Z' },
    ])

    const statuses = await service.getPaymentStatusesForApplicants([101, 102, 101])

    expect(feeRepo.listByApplicantIds).toHaveBeenCalledWith([101, 102])
    expect(psidRepo.list).toHaveBeenCalledTimes(1)
    expect(statuses.size).toBe(2)

    expect(statuses.get(101)).toMatchObject({
      applicantId: 101,
      totalDue: 1500,
      totalPaid: 1000,
      remainingBalance: 500,
      isPaid: false,
      isPartiallyPaid: true,
      status: 'PARTIAL',
      paymentPercentage: 67,
    })
    expect(statuses.get(101)?.lastPaymentDate?.toISOString()).toBe('2026-03-05T00:00:00.000Z')

    expect(statuses.get(102)).toMatchObject({
      applicantId: 102,
      totalDue: 750,
      totalPaid: 0,
      remainingBalance: 750,
      isPaid: false,
      isPartiallyPaid: false,
    })
  })

  it('uses the batched path for single-applicant status lookups', async () => {
    const { service, feeRepo, psidRepo } = createService()

    feeRepo.listByApplicantIds.mockResolvedValue([{ applicantId: 77, feeAmount: 250 }])
    psidRepo.list.mockResolvedValue([{ applicantId: 77, paymentStatus: 'PAID', amountPaid: 250 }])

    const status = await service.getPaymentStatus(77)

    expect(status).toMatchObject({
      applicantId: 77,
      totalDue: 250,
      totalPaid: 250,
      remainingBalance: 0,
      isPaid: true,
      status: 'PAID',
    })
    expect(feeRepo.sumFeeByApplicantId).not.toHaveBeenCalled()
    expect(psidRepo.listPaidByApplicantId).not.toHaveBeenCalled()
  })
})
