// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import TrackApplication from '../../client/src/views/TrackApplication'
import AxiosBase from '../../client/src/services/axios/AxiosBase'

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}))
vi.mock('@/components/ui/Alert', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

describe('TrackApplication', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should render tracking page heading and action button', () => {
    render(<TrackApplication />)

    expect(screen.getByText('Track Your Application')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Track' })).toBeTruthy()
  })

  it('should format tracking number input into AAA-BBB-### format', () => {
    render(<TrackApplication />)

    const input = screen.getByPlaceholderText('e.g., LHR-PRO-001') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'lhrpro001' } })

    expect(input.value).toBe('LHR-PRO-001')
  })

  it('should show validation message when tracking number is empty', async () => {
    render(<TrackApplication />)

    fireEvent.click(screen.getByRole('button', { name: 'Track' }))

    expect(await screen.findByText('Please enter a valid tracking number.')).toBeTruthy()
  })

  it('should render tracking details on successful API response', async () => {
    const getSpy = vi.spyOn(AxiosBase, 'get').mockResolvedValue({
      data: { message: 'Application is under review' },
    } as never)

    render(<TrackApplication />)

    const input = screen.getByPlaceholderText('e.g., LHR-PRO-001')
    fireEvent.change(input, { target: { value: 'LHRPRO001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Track' }))

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('/pmc/track-application/', {
        headers: { 'Content-Type': 'application/json' },
        params: { tracking_number: 'LHR-PRO-001' },
      })
    })

    expect(await screen.findByText('Tracking Details:')).toBeTruthy()
    expect(screen.getByText('Application is under review')).toBeTruthy()
  })

  it('should show backend error message for failed API response', async () => {
    const apiError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: { data: { message: 'Tracking number not found' } },
    })

    vi.spyOn(AxiosBase, 'get').mockRejectedValue(apiError)

    render(<TrackApplication />)

    fireEvent.change(screen.getByPlaceholderText('e.g., LHR-PRO-001'), {
      target: { value: 'LHR-PRO-999' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Track' }))

    expect(await screen.findByText('Tracking number not found')).toBeTruthy()
    expect(screen.queryByText('Tracking Details:')).toBeNull()
  })
})
