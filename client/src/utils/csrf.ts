const CSRF_COOKIE_NAME = 'pmc_csrf_token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function getCookieValue(name: string): string {
    if (typeof document === 'undefined') return ''

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = document.cookie.match(
        new RegExp(`(?:^|; )${escaped}=([^;]*)`),
    )
    return match ? decodeURIComponent(match[1]) : ''
}

export function getCsrfToken(): string {
    return getCookieValue(CSRF_COOKIE_NAME)
}

export function attachCsrfToken(
    method: string | undefined,
    headers: Headers | Record<string, unknown>,
) {
    const normalizedMethod = String(method || 'GET').toUpperCase()
    if (!MUTATING_METHODS.has(normalizedMethod)) return

    const token = getCsrfToken()
    if (!token) return

    if (headers instanceof Headers) {
        headers.set(CSRF_HEADER_NAME, token)
        return
    }

    headers[CSRF_HEADER_NAME] = token
}

function shouldAttachToRequest(url: URL, method: string): boolean {
    if (!MUTATING_METHODS.has(method)) return false
    if (url.origin !== window.location.origin) return false
    return url.pathname.startsWith('/api/')
}

export function initializeCsrfFetch() {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
        return
    }

    const globalWindow = window as typeof window & {
        __pmcCsrfFetchPatched?: boolean
    }

    if (globalWindow.__pmcCsrfFetchPatched) return

    const originalFetch = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const request =
            input instanceof Request
                ? new Request(input, init)
                : new Request(input, init)
        const method = request.method.toUpperCase()
        const url = new URL(request.url, window.location.origin)

        if (!shouldAttachToRequest(url, method)) {
            return originalFetch(request)
        }

        const headers = new Headers(request.headers)
        attachCsrfToken(method, headers)
        return originalFetch(new Request(request, { headers }))
    }

    globalWindow.__pmcCsrfFetchPatched = true
}
