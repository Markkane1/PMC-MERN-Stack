import { getApiBaseUrl } from '@/utils/apiBaseUrl'

export type AppConfig = {
    apiPrefix: string
    authenticatedEntryPath: string
    unAuthenticatedEntryPath: string
    locale: string
    accessTokenPersistStrategy: 'memory'
    enableMock: boolean
}

const appConfig: AppConfig = {
    apiPrefix: getApiBaseUrl(),
    authenticatedEntryPath: '/home',
    unAuthenticatedEntryPath: '/pub',
    locale: 'en',
    accessTokenPersistStrategy: 'memory',
    enableMock: false,
}

export default appConfig
