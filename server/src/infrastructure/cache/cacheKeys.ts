export const ACCOUNT_PERMISSION_LIST_CACHE_KEY = 'accounts:permissions:list'
export const ACCOUNT_ROLE_DASHBOARD_CACHE_KEY = 'accounts:config:role-dashboard'
export const ACCOUNT_SERVICE_CONFIGURATION_LIST_CACHE_KEY = 'accounts:config:service-configurations:list'

export function accountUserProfileCacheKey(userId: string) {
  return `accounts:user-profile:${userId}`
}

export function accountServiceConfigurationCacheKey(serviceName: string) {
  return `accounts:config:service:${serviceName}`
}
