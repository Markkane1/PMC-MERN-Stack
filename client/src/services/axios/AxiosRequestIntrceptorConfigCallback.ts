import {
    TOKEN_TYPE,
    REQUEST_HEADER_AUTH_KEY,
} from '@/constants/api.constant'
import type { InternalAxiosRequestConfig } from 'axios'
import { getAccessToken } from '@/utils/accessTokenStorage'

const AxiosRequestIntrceptorConfigCallback = (
    config: InternalAxiosRequestConfig,
) => {
    const accessToken = getAccessToken()

    if (accessToken) {
        config.headers[REQUEST_HEADER_AUTH_KEY] = `${TOKEN_TYPE}${accessToken}`
    }

    return config
}

export default AxiosRequestIntrceptorConfigCallback
