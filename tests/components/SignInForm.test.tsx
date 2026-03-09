// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import React from 'react'
import SignInForm from '../../client/src/views/auth/SignIn/components/SignInForm'
import AxiosBase from '../../client/src/services/axios/AxiosBase'

const { mockSignIn, mockSetUser } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockSetUser: vi.fn(),
}))

vi.mock('../../client/src/auth', () => ({
  useAuth: () => ({
    authenticated: false,
    user: {},
    signIn: mockSignIn,
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}))

vi.mock('../../client/src/store/authStore', () => ({
  useSessionUser: (selector: (state: { setUser: typeof mockSetUser }) => unknown) =>
    selector({ setUser: mockSetUser }),
}))

vi.mock('@/components/ui/Input', () => ({
  default: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    (props, ref) => <input ref={ref} {...props} />,
  ),
}))

vi.mock('@/components/shared/PasswordInput', () => ({
  default: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    (props, ref) => <input ref={ref} {...props} />,
  ),
}))

vi.mock('@/components/ui/Button', () => ({
  default: ({
    children,
    loading: _loading,
    block: _block,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; block?: boolean; variant?: string }) => {
    void _loading
    void _block
    void _variant
    return <button {...props}>{children}</button>
  },
}))

vi.mock('@/components/ui/Form', () => ({
  Form: (props: React.FormHTMLAttributes<HTMLFormElement>) => <form {...props}>{props.children}</form>,
  FormItem: ({
    children,
    errorMessage,
  }: {
    children: React.ReactNode
    errorMessage?: string
  }) => (
    <div>
      {children}
      {errorMessage ? <span>{errorMessage}</span> : null}
    </div>
  ),
}))

describe('SignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('should render sign-in fields and load captcha image on mount', async () => {
    const getSpy = vi.spyOn(AxiosBase, 'get').mockResolvedValue({
      data: { captcha_image: 'data:image/png;base64,abc', captcha_token: 'token-1' },
    } as never)

    render(<SignInForm setMessage={vi.fn()} />)

    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter CAPTCHA text')).toBeInTheDocument()

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('/accounts/generate-captcha/')
    })

    expect(screen.getByAltText('captcha')).toBeInTheDocument()
  })

  it('should show validation errors and prevent submit when required fields are missing', async () => {
    vi.spyOn(AxiosBase, 'get').mockResolvedValue({
      data: { captcha_image: 'data:image/png;base64,abc', captcha_token: 'token-2' },
    } as never)

    render(<SignInForm setMessage={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Please enter your email')).toBeInTheDocument()
    expect(screen.getByText('Please enter your password')).toBeInTheDocument()
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('should submit valid credentials and set session user on success', async () => {
    const getSpy = vi.spyOn(AxiosBase, 'get').mockResolvedValue({
      data: { captcha_image: 'data:image/png;base64,abc', captcha_token: 'captcha-ok' },
    } as never)
    mockSignIn.mockResolvedValue({ status: 'success', message: '' })

    render(<SignInForm setMessage={vi.fn()} />)

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('/accounts/generate-captcha/')
    })

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'john@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Secret123!' },
    })
    fireEvent.change(screen.getByPlaceholderText('Enter CAPTCHA text'), {
      target: { value: 'A1B2' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        username: 'john@example.com',
        password: 'Secret123!',
        captcha_input: 'A1B2',
        captcha_token: 'captcha-ok',
      })
    })

    expect(mockSetUser).toHaveBeenCalledWith({
      email: 'john@example.com',
      userName: 'john',
    })
  })

  it('should show CAPTCHA-specific message and refresh captcha when sign-in fails with CAPTCHA error', async () => {
    const setMessage = vi.fn()
    const getSpy = vi.spyOn(AxiosBase, 'get')
      .mockResolvedValueOnce({
        data: { captcha_image: 'data:image/png;base64,old', captcha_token: 'token-old' },
      } as never)
      .mockResolvedValueOnce({
        data: { captcha_image: 'data:image/png;base64,new', captcha_token: 'token-new' },
      } as never)

    mockSignIn.mockResolvedValue({
      status: 'failed',
      message: 'CAPTCHA validation failed',
    })

    render(<SignInForm setMessage={setMessage} />)

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(1)
    })

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'Secret123!' },
    })
    fireEvent.change(screen.getByPlaceholderText('Enter CAPTCHA text'), {
      target: { value: 'WRONG' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(setMessage).toHaveBeenCalledWith('Incorrect CAPTCHA, please try again.')
    })

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(2)
    })
  })
})
