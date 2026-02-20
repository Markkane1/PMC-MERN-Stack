import ApiService from './ApiService'

export type PermissionDto = {
    id: string
    name: string
    codename: string
    app_label?: string
    model_name?: string
    permission_key: string
}

export type GroupDto = {
    id: string
    name: string
    permissions: string[]
}

export type SuperadminDto = {
    id: string
    username: string
    first_name?: string
    last_name?: string
    groups: string[]
    is_active: boolean
    is_superadmin: boolean
}

export type UserDto = {
    id: string
    username: string
    first_name?: string
    last_name?: string
    groups: string[]
    permissions: string[]
    direct_permissions: string[]
    is_active: boolean
}

export type ApiLogDto = {
    id?: string
    legacyId?: number
    serviceName: string
    endpoint: string
    requestData?: Record<string, unknown>
    responseData?: Record<string, unknown>
    statusCode?: number
    createdAt?: string
}

export type AuditLogDto = {
    id?: string
    legacyId?: number
    userId?: string
    username?: string
    action: string
    modelName?: string
    objectId?: string
    description?: string
    ipAddress?: string
    timestamp?: string
    createdAt?: string
}

export type AccessLogDto = {
    id?: string
    legacyId?: number
    userId?: string
    username?: string
    modelName?: string
    objectId?: string
    method?: string
    ipAddress?: string
    endpoint?: string
    timestamp?: string
    createdAt?: string
}

export type ServiceConfigDto = {
    _id?: string
    id?: string
    serviceName: string
    baseUrl?: string
    authEndpoint?: string
    generatePsidEndpoint?: string
    transactionStatusEndpoint?: string
    clientId?: string
    clientSecret?: string
}

export type ExternalTokenDto = {
    id?: string
    legacyId?: number
    serviceName: string
    accessToken: string
    expiresAt?: string
    createdAt?: string
}

export type RoleDashboardConfig = {
    mappings: Record<string, string>
}

const AdminService = {
    listPermissions() {
        return ApiService.fetchDataWithAxios<PermissionDto[]>({
            url: '/accounts/admin/permissions/',
            method: 'get',
        })
    },
    resetPermissions() {
        return ApiService.fetchDataWithAxios({
            url: '/accounts/admin/permissions/reset/',
            method: 'post',
        })
    },
    listGroups() {
        return ApiService.fetchDataWithAxios<GroupDto[]>({
            url: '/accounts/admin/groups/',
            method: 'get',
        })
    },
    createGroup(payload: { name: string; permissions?: string[] }) {
        return ApiService.fetchDataWithAxios<GroupDto>({
            url: '/accounts/admin/groups/',
            method: 'post',
            data: payload,
        })
    },
    updateGroup(id: string, payload: { name?: string; permissions?: string[] }) {
        return ApiService.fetchDataWithAxios<GroupDto>({
            url: `/accounts/admin/groups/${id}/`,
            method: 'patch',
            data: payload,
        })
    },
    deleteGroup(id: string) {
        return ApiService.fetchDataWithAxios({
            url: `/accounts/admin/groups/${id}/`,
            method: 'delete',
        })
    },
    listUsers() {
        return ApiService.fetchDataWithAxios<UserDto[]>({
            url: '/accounts/admin/users/',
            method: 'get',
        })
    },
    updateUser(id: string, payload: { groups?: string[]; direct_permissions?: string[]; is_active?: boolean }) {
        return ApiService.fetchDataWithAxios<UserDto>({
            url: `/accounts/admin/users/${id}/`,
            method: 'patch',
            data: payload,
        })
    },
    deleteUser(id: string) {
        return ApiService.fetchDataWithAxios({
            url: `/accounts/admin/users/${id}/`,
            method: 'delete',
        })
    },
    resetUserPassword(id: string, payload: { new_password: string }) {
        return ApiService.fetchDataWithAxios({
            url: `/accounts/admin/users/${id}/reset-password/`,
            method: 'post',
            data: payload,
        })
    },
    listSuperadmins() {
        return ApiService.fetchDataWithAxios<SuperadminDto[]>({
            url: '/accounts/admin/superadmins/',
            method: 'get',
        })
    },
    createSuperadmin(payload: {
        username: string
        password: string
        first_name?: string
        last_name?: string
    }) {
        return ApiService.fetchDataWithAxios<SuperadminDto>({
            url: '/accounts/admin/superadmins/',
            method: 'post',
            data: payload,
        })
    },
    updateSuperadmin(id: string, payload: {
        first_name?: string
        last_name?: string
        password?: string
        is_active?: boolean
    }) {
        return ApiService.fetchDataWithAxios<SuperadminDto>({
            url: `/accounts/admin/superadmins/${id}/`,
            method: 'patch',
            data: payload,
        })
    },
    deleteSuperadmin(id: string) {
        return ApiService.fetchDataWithAxios({
            url: `/accounts/admin/superadmins/${id}/`,
            method: 'delete',
        })
    },
    getRoleDashboardConfig() {
        return ApiService.fetchDataWithAxios<RoleDashboardConfig>({
            url: '/accounts/role-dashboard/',
            method: 'get',
        })
    },
    updateRoleDashboardConfig(payload: RoleDashboardConfig) {
        return ApiService.fetchDataWithAxios<RoleDashboardConfig>({
            url: '/accounts/admin/role-dashboard/',
            method: 'put',
            data: payload,
        })
    },
    listApiLogs(params?: Record<string, any>) {
        return ApiService.fetchDataWithAxios<{ items: ApiLogDto[]; total: number; page: number; limit: number }>({
            url: '/accounts/admin/api-logs/',
            method: 'get',
            params,
        })
    },
    listAuditLogs(params?: Record<string, any>) {
        return ApiService.fetchDataWithAxios<{ items: AuditLogDto[]; total: number; page: number; limit: number }>({
            url: '/accounts/admin/audit-logs/',
            method: 'get',
            params,
        })
    },
    listAccessLogs(params?: Record<string, any>) {
        return ApiService.fetchDataWithAxios<{ items: AccessLogDto[]; total: number; page: number; limit: number }>({
            url: '/accounts/admin/access-logs/',
            method: 'get',
            params,
        })
    },
    listServiceConfigs() {
        return ApiService.fetchDataWithAxios<ServiceConfigDto[]>({
            url: '/accounts/admin/service-configs/',
            method: 'get',
        })
    },
    createServiceConfig(payload: ServiceConfigDto) {
        return ApiService.fetchDataWithAxios<ServiceConfigDto>({
            url: '/accounts/admin/service-configs/',
            method: 'post',
            data: payload,
        })
    },
    updateServiceConfig(id: string, payload: ServiceConfigDto) {
        return ApiService.fetchDataWithAxios<ServiceConfigDto>({
            url: `/accounts/admin/service-configs/${id}/`,
            method: 'patch',
            data: payload,
        })
    },
    listExternalTokens(params?: Record<string, any>) {
        return ApiService.fetchDataWithAxios<ExternalTokenDto[]>({
            url: '/accounts/admin/external-tokens/',
            method: 'get',
            params,
        })
    },
}

export default AdminService
