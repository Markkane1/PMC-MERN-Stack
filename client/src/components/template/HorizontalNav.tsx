import HorizontalMenuContent from './HorizontalMenuContent'
import { useRouteKeyStore } from '@/store/routeKeyStore'
import { useSessionUser } from '@/store/authStore'
import navigationConfig from '@/configs/navigation.config'
import { useEffect } from 'react'

const HorizontalNav = ({
    translationSetup = true,
}: {
    translationSetup?: boolean
}) => {
    const currentRouteKey = useRouteKeyStore((state) => state.currentRouteKey)

    const userAuthority = useSessionUser((state) => state.user.authority)

    const fetchUserGroups = useSessionUser((state) => state.fetchUserGroups)
        useEffect(() => {
                        if (!userAuthority || userAuthority.length === 0) {
            fetchUserGroups()
        }
            }, [fetchUserGroups, userAuthority])

    return (
        <HorizontalMenuContent
            navigationTree={navigationConfig}
            routeKey={currentRouteKey}
            userAuthority={userAuthority || []}
            translationSetup={translationSetup}
        />
    )
}

export default HorizontalNav
