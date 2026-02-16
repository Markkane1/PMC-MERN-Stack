import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
        return []
    }
    unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
} as any

// Setup localStorage mock
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Setup sessionStorage mock
const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
}
global.sessionStorage = sessionStorageMock as any

// Mock fetch globally
global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    })
) as any

// Setup common test environment
beforeAll(() => {
    // Suppress console errors in tests
    vi.spyOn(console, 'error').mockImplementation(() => null)
})

beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
})

afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks()
})

afterAll(() => {
    vi.clearAllMocks()
})
