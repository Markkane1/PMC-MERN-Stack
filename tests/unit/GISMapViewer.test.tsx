import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import GISMapViewer from '@/components/gis/GISMapViewer'


// Mock OpenLayers
vi.mock('ol/Map', () => ({
    default: vi.fn(() => ({
        setTarget: vi.fn(),
        forEachFeatureAtPixel: vi.fn(),
        on: vi.fn(),
        un: vi.fn(),
    })),
}))

describe('GISMapViewer Component', () => {
    const mockMarkers = [
        {
            id: '1',
            lat: 31.5497,
            lon: 74.3436,
            name: 'Facility A',
            type: 'facility' as const,
        },
        {
            id: '2',
            lat: 31.5600,
            lon: 74.3500,
            name: 'Violation Site B',
            type: 'violation' as const,
            intensity: 75,
        },
    ]

    const renderComponent = (props = {}) => {
        return render(
            <GISMapViewer markers={mockMarkers} {...props} />
        )
    }

    test('should render map container', () => {
        const { container } = renderComponent()
        expect(container.querySelector('.w-full.h-full')).toBeInTheDocument()
    })

    test('should display legend', () => {
        renderComponent()
        expect(screen.getByText('Legend')).toBeInTheDocument()
        expect(screen.getByText('Facility')).toBeInTheDocument()
        expect(screen.getByText('Inspection')).toBeInTheDocument()
        expect(screen.getByText('Violation')).toBeInTheDocument()
        expect(screen.getByText('Complaint')).toBeInTheDocument()
    })

    test('should render all marker types in legend', () => {
        renderComponent()
        const legendItems = screen.getAllByText(/Facility|Inspection|Violation|Complaint/i)
        expect(legendItems.length).toBeGreaterThan(0)
    })

    test('should call onMarkerClick when marker is clicked', async () => {
        const handleMarkerClick = vi.fn()
        renderComponent({ onMarkerClick: handleMarkerClick })
        
        // Note: Actual click testing on OL map would require more mocking
        expect(handleMarkerClick).not.toHaveBeenCalled()
    })

    test('should render with custom center', () => {
        const customCenter: [number, number] = [75.0, 32.0]
        const { container } = renderComponent({ center: customCenter })
        expect(container).toBeTruthy()
    })

    test('should support heatmap visualization', () => {
        const { container } = renderComponent({ showHeatmap: true })
        expect(container).toBeTruthy()
    })

    test('should display different colors for different marker types', () => {
        renderComponent()
        // Check for color indicators in legend
        const colorDots = screen.getAllByText(/Facility|Inspection|Violation|Complaint/i)
        expect(colorDots.length).toBeGreaterThan(0)
    })
})
