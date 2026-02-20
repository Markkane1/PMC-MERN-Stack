import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiLoader } from 'react-icons/fi'

interface OAuthCallbackProps {
  provider: 'google' | 'github'
}

export const OAuthCallback = ({ provider }: OAuthCallbackProps) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')

        if (!code) {
          throw new Error('Missing authorization code')
        }

        // Verify state matches what we stored
        const storedState = sessionStorage.getItem('oauth_state')
        if (!state || state !== storedState) {
          throw new Error('State mismatch - possible CSRF attack')
        }

        // Determine which endpoint to call
        const endpoint =
          provider === 'google'
            ? '/api/accounts/oauth/google/callback/'
            : '/api/accounts/oauth/github/callback/'

        // Exchange code for token
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'OAuth callback failed')
        }

        // Store token if provided
        if (data.token) {
          localStorage.setItem('token', data.token)
        }

        // Store user info if provided
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user))
        }

        // Clear stored state
        sessionStorage.removeItem('oauth_state')

        // Redirect to dashboard or home
        navigate('/dashboard', { replace: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'OAuth callback failed'
        setError(message)
        setIsLoading(false)
      }
    }

    handleCallback()
  }, [searchParams, provider, navigate])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <FiLoader className="animate-spin" size={40} />
        <p className="text-gray-600">Processing {provider} sign-in...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Sign-in Failed</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => navigate('/signin', { replace: true })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  return null
}
