type SWConfig = {
    onUpdate?: (registration: ServiceWorkerRegistration) => void
    onSuccess?: (registration: ServiceWorkerRegistration) => void
}

export function register(config?: SWConfig) {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register('/service-worker.js')
                .then((registration) => {
                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing
                        if (!installingWorker) return

                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                    config?.onUpdate?.(registration)
                                } else {
                                    config?.onSuccess?.(registration)
                                }
                            }
                        }
                    }
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error)
                })
        })
    }
}

export function unregister() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
            .then((registration) => {
                registration.unregister()
            })
            .catch((error) => {
                console.error('Service Worker unregistration failed:', error)
            })
    }
}
