import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  // Recharts/OpenLayers require ResizeObserver in jsdom tests.
  ;(globalThis as any).ResizeObserver = ResizeObserverMock
}

afterEach(() => {
  cleanup()
})
