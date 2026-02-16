import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PaymentDashboard from '@/views/PaymentDashboard'

// Mock the API
vi.mock('@/api/pmc', () => ({
    usePaymentAPI: () => ({
        loading: false,
        error: null,
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

describe('PaymentDashboard Component', () => {
    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <PaymentDashboard />
            </BrowserRouter>
        )
    }

    test('should render payment dashboard', () => {
        renderComponent()
        expect(screen.getByText(/Payment Management/i)).toBeInTheDocument()
    })

    test('should display payment status', async () => {
        renderComponent()
        await waitFor(() => {
            expect(screen.getByText(/Payment Status/i)).toBeInTheDocument()
        })
    })

    test('should show payment breakdown', async () => {
        renderComponent()
        await waitFor(() => {
            expect(screen.getByText(/Registration Fee/i)).toBeInTheDocument()
        })
    })

    test('should handle applicant ID from params or localStorage', () => {
        localStorage.setItem('applicantId', '456')
        renderComponent()
        expect(screen.getByText(/Payment Management/i)).toBeInTheDocument()
    })

    test('should display deadline information', async () => {
        renderComponent()
        await waitFor(() => {
            expect(screen.getByText(/Due Date/i)).toBeInTheDocument()
        })
    })
})
