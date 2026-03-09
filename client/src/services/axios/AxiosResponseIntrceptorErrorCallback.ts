import { useSessionUser, useToken } from '@/store/authStore'
import type { AxiosError } from 'axios'
import { logger } from '@/utils/logger'

const AxiosResponseIntrceptorErrorCallback = (error: AxiosError) => {
    const { response } = error
    const { setToken } = useToken()
    const unauthorizedCode = [401, 419, 440]

    if (response && response.status === 400) {
        // Extract the error details from the response
        const errorDetails = response.data

        // Log or handle the error details as needed
        logger.error('Validation Error:', errorDetails)

        // Optionally, you can trigger a custom handler to display the error
        // For example, use a global error handler or pass to a toast notification system
        // if (typeof errorDetails === 'object') {
        //     for (const [field, messages] of Object.entries(errorDetails)) {
        //         logger.debug(`Field: ${field}, Error: ${messages.join(', ')}`)
        //         // Here, display the error messages to the form
        //     }
        // }
    }

    if (response && unauthorizedCode.includes(response.status)) {
        setToken('')
        useSessionUser.getState().setUser({})
        useSessionUser.getState().setSessionSignedIn(false)
    }
}

export default AxiosResponseIntrceptorErrorCallback
