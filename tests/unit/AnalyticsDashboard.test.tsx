import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'

describe('AnalyticsDashboard Component', () => {
    const mockData = [
        { month: 'Jan', inspections: 145, violations: 12, complaints: 5, resolved: 8 },
        { month: 'Feb', inspections: 178, violations: 15, complaints: 8, resolved: 12 },
    ]

    const mockMetrics = [
        { name: 'Total Inspections', value: 323, percentage: 12 },
        { name: 'Violations Found', value: 27, percentage: 8 },
        { name: 'Complaints', value: 13, percentage: 5 },
        { name: 'Resolution Rate', value: 89, percentage: 3 },
    ]

    const renderComponent = (props = {}) => {
        return render(
            <BrowserRouter>
                <AnalyticsDashboard data={mockData} metrics={mockMetrics} {...props} />
            </BrowserRouter>
        )
    }

    test('should render analytics dashboard title', () => {
        renderComponent()
        expect(screen.getByText(/Analytics Overview/i)).toBeInTheDocument()
    })

    test('should display all metric cards', () => {
        renderComponent()
        expect(screen.getByText('Total Inspections')).toBeInTheDocument()
        expect(screen.getByText('Violations Found')).toBeInTheDocument()
        expect(screen.getByText('Complaints')).toBeInTheDocument()
        expect(screen.getByText('Resolution Rate')).toBeInTheDocument()
    })

    test('should display metric values', () => {
        renderComponent()
        expect(screen.getByText('323')).toBeInTheDocument()
        expect(screen.getByText('27')).toBeInTheDocument()
    })

    test('should show percentage changes', () => {
        renderComponent()
        expect(screen.getByText('+12%')).toBeInTheDocument()
        expect(screen.getByText('+8%')).toBeInTheDocument()
    })

    test('should render export button', () => {
        renderComponent()
        expect(screen.getByText(/Export/i)).toBeInTheDocument()
    })

    test('should display date range inputs', () => {
        renderComponent()
        const dateInputs = screen.getAllByRole('textbox')
        expect(dateInputs.length).toBeGreaterThan(0)
    })

    test('should handle date range change', () => {
        const handleDateChange = vi.fn()
        renderComponent({ onDateRangeChange: handleDateChange })
        
        const dateInputs = screen.getAllByRole('textbox')
        if (dateInputs.length > 0) {
            fireEvent.change(dateInputs[0], { target: { value: '2024-06-01' } })
            expect(handleDateChange).toHaveBeenCalled()
        }
    })

    test('should handle export button click', () => {
        const handleExport = vi.fn()
        renderComponent({ onExport: handleExport })
        
        const exportButton = screen.getByText(/Export/i)
        fireEvent.click(exportButton)
        expect(handleExport).toHaveBeenCalled()
    })

    test('should display loading state', () => {
        renderComponent({ loading: true })
        expect(screen.getByRole('progressbar', { hidden: true })).toBeDefined()
    })
})
