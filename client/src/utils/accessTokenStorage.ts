import appConfig from '@/configs/app.config'

let inMemoryToken = ''

export const getAccessToken = (): string => {
    if (appConfig.accessTokenPersistStrategy !== 'memory') return ''
    return inMemoryToken
}

export const setAccessToken = (token: string): void => {
    if (appConfig.accessTokenPersistStrategy !== 'memory') return
    inMemoryToken = token
}

export const clearAccessToken = (): void => {
    if (appConfig.accessTokenPersistStrategy !== 'memory') return
    inMemoryToken = ''
}
