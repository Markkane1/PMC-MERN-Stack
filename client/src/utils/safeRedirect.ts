const DEFAULT_REDIRECT = '/'

export const sanitizeRedirectPath = (
    candidate: string | null | undefined,
    fallback = DEFAULT_REDIRECT,
): string => {
    const value = (candidate || '').trim()

    if (!value) {
        return fallback
    }

    // Allow only same-origin relative paths.
    if (!value.startsWith('/') || value.startsWith('//')) {
        return fallback
    }

    // Block CRLF/control chars in encoded or raw form.
    let decoded = value
    try {
        decoded = decodeURIComponent(value)
    } catch {
        return fallback
    }

    if (/[\r\n]/.test(decoded)) {
        return fallback
    }

    return value
}
