import { BrowserRouter } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import Theme from '@/components/template/Theme'
import Layout from '@/components/layouts'
import { AuthProvider } from '@/auth'
import Views from '@/views'
import appConfig from './configs/app.config'
import './locales'
import InstallPWA from './InstallPWA'

if (appConfig.enableMock) {
    import('./mock')
}

function App() {
    const [showInstallPrompt, setShowInstallPrompt] = useState(false)
    const deferredPromptRef = useRef<Event | null>(null)

    useEffect(() => {
        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault()
            deferredPromptRef.current = event
            setShowInstallPrompt(true)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        return () =>
            window.removeEventListener(
                'beforeinstallprompt',
                handleBeforeInstallPrompt,
            )
    }, [])

    return (
        <>
            <Theme>
                <BrowserRouter
                    future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true,
                    }}
                >
                    <AuthProvider>
                        <Layout>
                            <Views />
                        </Layout>
                    </AuthProvider>
                </BrowserRouter>
            </Theme>

            {showInstallPrompt && deferredPromptRef.current && (
                <InstallPWA deferredPrompt={deferredPromptRef.current} />
            )}
        </>
    )
}

export default App
