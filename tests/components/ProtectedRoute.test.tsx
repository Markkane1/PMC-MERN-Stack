// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const { mockUseAuth, mockUseLocation } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseLocation: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate-target">{to}</div>,
  Outlet: () => <div data-testid="protected-outlet">Protected Outlet</div>,
  useLocation: () => mockUseLocation(),
}))

vi.mock('../../client/src/auth', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('ProtectedRoute', () => {
  let ProtectedRoute: any

  beforeAll(async () => {
    const module = await import('../../client/src/components/route/ProtectedRoute')
    ProtectedRoute = module.default
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should redirect unauthenticated users to public entry path', () => {
    mockUseLocation.mockReturnValue({ pathname: '/secure' })
    mockUseAuth.mockReturnValue({ authenticated: false })

    render(<ProtectedRoute />)

    const target = screen.getByTestId('navigate-target')
    expect(target).toBeInTheDocument()
    expect(target.textContent?.startsWith('/pub')).toBe(true)
    expect(screen.queryByTestId('protected-outlet')).not.toBeInTheDocument()
  })

  it('should render nested protected content when user is authenticated', () => {
    mockUseLocation.mockReturnValue({ pathname: '/secure' })
    mockUseAuth.mockReturnValue({ authenticated: true })

    render(<ProtectedRoute />)

    expect(screen.getByTestId('protected-outlet')).toBeInTheDocument()
    expect(screen.queryByTestId('navigate-target')).not.toBeInTheDocument()
  })
})
