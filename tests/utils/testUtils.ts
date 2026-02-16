import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

/**
 * Custom render function that wraps components with necessary providers
 */
export const renderWithProviders = (
    ui: ReactElement,
    options: Omit<RenderOptions, 'wrapper'> = {}
) => {
    const Wrapper = ({ children }: { children: ReactElement }) => (
        <BrowserRouter>{children}</BrowserRouter>
    )

    return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * Setup mock fetch with default interceptors
 */
export const setupMockFetch = () => {
    global.fetch = vi.fn((url: string) => {
        if (url.includes('/api/payment')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: { applicantId: '123', status: 'pending' },
                }),
            })
        }

        if (url.includes('/api/alerts')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: [],
                }),
            })
        }

        if (url.includes('/api/analytics')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    data: [],
                }),
            })
        }

        return Promise.reject(new Error(`Unhandled request to ${url}`))
    })
}

/**
 * Wait for async operations
 */
export const waitFor = (callback: () => void, options = { timeout: 1000 }) => {
    return new Promise((resolve, reject) => {
        const start = Date.now()
        const interval = setInterval(() => {
            try {
                callback()
                clearInterval(interval)
                resolve(null)
            } catch (error) {
                if (Date.now() - start > options.timeout) {
                    clearInterval(interval)
                    reject(error)
                }
            }
        }, 50)
    })
}

/**
 * Create mock user context
 */
export const createMockUser = (overrides = {}) => {
    return {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        authority: ['User'],
        ...overrides,
    }
}

/**
 * Setup local storage mock
 */
export const setupLocalStorageMock = () => {
    const store: Record<string, string> = {}

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString()
        },
        removeItem: (key: string) => {
            delete store[key]
        },
        clear: () => {
            Object.keys(store).forEach((key) => {
                delete store[key]
            })
        },
    }
}

/**
 * Setup session storage mock
 */
export const setupSessionStorageMock = () => {
    return setupLocalStorageMock()
}

/**
 * Generate test IDs for components
 */
export const testSelectors = {
    // Payment Dashboard
    paymentStatus: '[data-testid=payment-status]',
    paymentAmount: '[data-testid=payment-amount]',
    paymentBreakdown: '[data-testid=payment-breakdown]',
    generateChalanBtn: '[data-testid=generate-chalan-btn]',
    supportSection: '[data-testid=support-section]',

    // Application Form
    formSteps: '[data-testid=form-steps]',
    nextBtn: '[data-testid=next-btn]',
    backBtn: '[data-testid=back-btn]',
    submitBtn: '[data-testid=submit-btn]',
    errorMessage: '[data-testid=error-message]',

    // Notifications
    notificationCenter: '[data-testid=notification-center]',
    notificationList: '[data-testid=notification-list]',
    markReadBtn: '[data-testid=mark-read-btn]',
    deleteBtn: '[data-testid=delete-btn]',

    // Settings
    tabNotifications: '[data-testid=tab-notifications]',
    tabProfile: '[data-testid=tab-profile]',
    tabSecurity: '[data-testid=tab-security]',
    saveBtn: '[data-testid=save-btn]',

    // GIS
    gisMap: '[data-testid=gis-map]',
    mapMarker: '[data-testid=map-marker]',
    filterType: '[data-testid=filter-type]',
    markerDetails: '[data-testid=marker-details]',

    // Analytics
    analyticsTitle: '[data-testid=analytics-title]',
    metricCard: '[data-testid=metric-card]',
    trendChart: '[data-testid=trend-chart]',
    exportBtn: '[data-testid=export-btn]',
}

/**
 * Common test data generators
 */
export const generateTestData = {
    applicant: () => ({
        id: `APP-${Date.now()}`,
        name: 'Test Applicant',
        email: 'applicant@example.com',
        phone: '+92-300-1234567',
        district: 'Lahore',
    }),

    payment: () => ({
        applicantId: `APP-${Date.now()}`,
        amount: 5000,
        status: 'pending',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }),

    notification: () => ({
        id: `notif-${Date.now()}`,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium',
        read: false,
    }),

    location: () => ({
        id: `loc-${Date.now()}`,
        lat: 31.5497 + Math.random() * 0.01,
        lon: 74.3436 + Math.random() * 0.01,
        name: 'Test Location',
        type: 'facility' as const,
    }),
}
