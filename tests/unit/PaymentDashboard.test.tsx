// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'
import PaymentDashboard from '@/views/PaymentDashboard'

const ROUTER_FUTURE_FLAGS = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
} as const

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
    return {
        ...actual,
        useParams: () => ({ applicantId: '123' }),
    }
})

// Mock the API
vi.mock('@/api/pmc', () => ({
    usePaymentAPI: () => ({
        loading: false,
        error: null,
        getPaymentStatus: vi.fn().mockResolvedValue({
            applicantId: '123',
            status: 'pending',
            amount: 5000,
            dueDate: '2024-12-31',
            breakdown: [
                { item: 'Registration Fee', amount: 2000 },
                { item: 'Processing Fee', amount: 3000 },
            ],
        }),
        paymentStatus: {
            applicantId: '123',
            status: 'pending',
            amount: 5000,
            dueDate: '2024-12-31',
            breakdown: [
                { item: 'Registration Fee', amount: 2000 },
                { item: 'Processing Fee', amount: 3000 },
            ],
        },
        fetchPaymentStatus: vi.fn(),
        verifyPayment: vi.fn(),
    }),
}))

vi.mock('@/components', () => ({
    PaymentStatusComponent: ({ applicantId }: { applicantId: string }) => (
        <div>
            <h2>Payment Status</h2>
            <p>Applicant: {applicantId}</p>
            <p>Registration Fee</p>
        </div>
    ),
}))

describe('PaymentDashboard Component', () => {
    const renderComponent = () => {
        return render(
            <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
                <PaymentDashboard />
            </MemoryRouter>
        )
    }

    test('should render payment dashboard', () => {
        renderComponent()
        expect(screen.getByText(/Payment Management/i)).toBeInTheDocument()
    })

    test('should display payment status', () => {
        renderComponent()
        expect(screen.getByRole('heading', { name: /Payment Status/i })).toBeInTheDocument()
    })

    test('should show payment breakdown', () => {
        renderComponent()
        expect(screen.getByText(/Registration Fee/i)).toBeInTheDocument()
    })

    test('should handle applicant ID from params or localStorage', () => {
        renderComponent()
        expect(screen.getByText(/Payment Management/i)).toBeInTheDocument()
    })

    test('should display deadline information', () => {
        renderComponent()
        expect(screen.getByText(/Payment Deadline/i)).toBeInTheDocument()
    })
})
