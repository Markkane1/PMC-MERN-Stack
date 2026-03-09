// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PaymentStatusComponent } from '../../client/src/components/payment/PaymentStatusComponent'

const {
  mockGetPaymentStatus,
  mockGenerateChalan,
  mockVerifyPayment,
  paymentApiState,
} = vi.hoisted(() => ({
  mockGetPaymentStatus: vi.fn(),
  mockGenerateChalan: vi.fn(),
  mockVerifyPayment: vi.fn(),
  paymentApiState: { loading: false, error: null as string | null },
}))

vi.mock('../../client/src/api/pmc', () => ({
  usePaymentAPI: () => ({
    getPaymentStatus: mockGetPaymentStatus,
    generateChalan: mockGenerateChalan,
    verifyPayment: mockVerifyPayment,
    loading: paymentApiState.loading,
    error: paymentApiState.error,
  }),
}))

describe('PaymentStatusComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    paymentApiState.loading = false
    paymentApiState.error = null
  })

  it('should render loading state while payment API is loading', () => {
    paymentApiState.loading = true

    render(<PaymentStatusComponent applicantId="101" />)

    expect(screen.getByText('Loading payment status...')).toBeTruthy()
  })

  it('should render error state when payment API returns error', () => {
    paymentApiState.error = 'Failed to fetch payment'

    render(<PaymentStatusComponent applicantId="101" />)

    expect(screen.getByText('Error: Failed to fetch payment')).toBeTruthy()
  })

  it('should render empty state when no payment data is available', async () => {
    mockGetPaymentStatus.mockResolvedValue(null)

    render(<PaymentStatusComponent applicantId="101" />)

    expect(await screen.findByText('No payment data available')).toBeTruthy()
  })

  it('should render payment summary and progress for unpaid applicant', async () => {
    mockGetPaymentStatus.mockResolvedValue({
      applicantId: '101',
      totalDue: 10000,
      totalPaid: 2500,
      remainingBalance: 7500,
      status: 'PARTIAL',
    })

    render(<PaymentStatusComponent applicantId="101" />)

    expect(await screen.findByText('Payment Status')).toBeTruthy()
    expect(screen.getByText('Rs 10,000')).toBeTruthy()
    expect(screen.getByText('Rs 2,500')).toBeTruthy()
    expect(screen.getByText('Rs 7,500')).toBeTruthy()
    expect(screen.getByText(/Status: PARTIAL/i)).toBeTruthy()
  })

  it('should call generateChalan when user clicks generate button', async () => {
    mockGetPaymentStatus.mockResolvedValue({
      applicantId: '202',
      totalDue: 5000,
      totalPaid: 0,
      remainingBalance: 5000,
      status: 'PENDING',
      nextDueDate: '2026-03-20T00:00:00.000Z',
    })
    mockGenerateChalan.mockResolvedValue(new Blob(['pdf-content'], { type: 'application/pdf' }))

    const createObjectURL = vi.fn(() => 'blob:mocked')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    })

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<PaymentStatusComponent applicantId="202" />)

    await screen.findByText('Generate and Download Chalan')
    fireEvent.click(screen.getByText('Generate and Download Chalan'))

    await waitFor(() => {
      expect(mockGenerateChalan).toHaveBeenCalledWith(202, {
        amountDue: 5000,
        dueDate: '2026-03-20T00:00:00.000Z',
      })
    })

    expect(createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()
  })

  it('should submit verify form and call verifyPayment with parsed values', async () => {
    mockGetPaymentStatus.mockResolvedValue({
      applicantId: '303',
      totalDue: 9000,
      totalPaid: 1000,
      remainingBalance: 8000,
      status: 'PARTIAL',
    })
    mockVerifyPayment.mockResolvedValue({ success: true })

    render(<PaymentStatusComponent applicantId="303" />)

    await screen.findByText('Verify Payment')
    fireEvent.click(screen.getByText('Verify Payment'))

    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '1500' },
    })
    fireEvent.change(screen.getByPlaceholderText('Transaction ID or cheque number'), {
      target: { value: 'TXN-12345' },
    })

    const verifyButtons = screen.getAllByRole('button', { name: 'Verify Payment' })
    fireEvent.click(verifyButtons[1])

    await waitFor(() => {
      expect(mockVerifyPayment).toHaveBeenCalledWith(303, 1500, 'TXN-12345')
    })
  })
})
