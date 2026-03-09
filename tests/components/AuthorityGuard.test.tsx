// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const { mockUseAuthority } = vi.hoisted(() => ({
  mockUseAuthority: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate-target">{to}</div>,
}))

vi.mock('../../client/src/utils/hooks/useAuthority', () => ({
  default: (...args: unknown[]) => mockUseAuthority(...args),
}))

describe('AuthorityGuard', () => {
  let AuthorityGuard: any

  beforeAll(async () => {
    const module = await import('../../client/src/components/route/AuthorityGuard')
    AuthorityGuard = module.default
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children when authority check passes', () => {
    mockUseAuthority.mockReturnValue(true)

    render(
      <AuthorityGuard userAuthority={['Admin']} authority={['Admin']}>
        <div>Admin Dashboard</div>
      </AuthorityGuard>,
    )

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    expect(screen.queryByTestId('navigate-target')).not.toBeInTheDocument()
  })

  it('should redirect to /access-denied when authority check fails', () => {
    mockUseAuthority.mockReturnValue(false)

    render(
      <AuthorityGuard userAuthority={['User']} authority={['Admin']}>
        <div>Admin Dashboard</div>
      </AuthorityGuard>,
    )

    expect(screen.getByTestId('navigate-target')).toHaveTextContent('/access-denied')
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument()
  })
})
