const readApiEnv = (): string =>
    (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
    ''

export const getApiBaseUrl = (): string => {
    const raw = readApiEnv()
    if (!raw) return '/api'

    const normalized = raw.replace(/\/+$/, '')
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

