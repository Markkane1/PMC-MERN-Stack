import { Router } from 'express'
import {
  register,
  login,
  logout,
  profile,
  updateProfile,
  resetPassword,
  findUser,
  resetForgotPassword,
  listInspectors,
  createOrUpdateInspector,
  generateCaptcha,
} from '../controllers/accounts/AuthController'
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  getGitHubAuthUrl,
  handleGitHubCallback,
} from '../controllers/accounts/OAuthController'
import {
  listPermissions,
  resetPermissions,
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  listUsers,
  updateUser,
  deleteUser,
  resetUserPassword,
  listSuperadmins,
  createSuperadmin,
  updateSuperadmin,
  deleteSuperadmin,
  getRoleDashboardConfig,
  updateRoleDashboardConfig,
  listApiLogs,
  listAuditLogs,
  listAccessLogs,
  listServiceConfigurations,
  createServiceConfiguration,
  updateServiceConfiguration,
  listExternalTokens,
} from '../controllers/accounts/AdminController'
import { authenticate, requireGroup } from '../middlewares/auth'

export const accountsRouter = Router()

accountsRouter.post('/register/', register)
accountsRouter.post('/login/', login)
accountsRouter.post('/logout/', logout)
accountsRouter.get('/profile/', authenticate, profile)
accountsRouter.get('/role-dashboard/', authenticate, getRoleDashboardConfig)
accountsRouter.patch('/profile/', authenticate, updateProfile)
accountsRouter.post('/reset-password2/', authenticate, resetPassword)
accountsRouter.post('/find-user/', findUser)
accountsRouter.post('/reset-forgot-password/', resetForgotPassword)
accountsRouter.get('/list-inspectors/', authenticate, listInspectors)
accountsRouter.post('/create-update-inpsector-user/', authenticate, createOrUpdateInspector)
accountsRouter.get('/generate-captcha/', generateCaptcha)

// OAuth Routes
accountsRouter.get('/oauth/google/auth-url/', getGoogleAuthUrl)
accountsRouter.post('/oauth/google/callback/', handleGoogleCallback)
accountsRouter.get('/oauth/github/auth-url/', getGitHubAuthUrl)
accountsRouter.post('/oauth/github/callback/', handleGitHubCallback)

// Admin RBAC
accountsRouter.get('/admin/permissions/', authenticate, requireGroup(['Admin', 'Super']), listPermissions)
accountsRouter.post('/admin/permissions/reset/', authenticate, requireGroup(['Super']), resetPermissions)
accountsRouter.put('/admin/role-dashboard/', authenticate, requireGroup(['Admin', 'Super']), updateRoleDashboardConfig)
accountsRouter.get('/admin/groups/', authenticate, requireGroup(['Admin', 'Super']), listGroups)
accountsRouter.post('/admin/groups/', authenticate, requireGroup(['Admin', 'Super']), createGroup)
accountsRouter.patch('/admin/groups/:id/', authenticate, requireGroup(['Admin', 'Super']), updateGroup)
accountsRouter.delete('/admin/groups/:id/', authenticate, requireGroup(['Admin', 'Super']), deleteGroup)
accountsRouter.get('/admin/users/', authenticate, requireGroup(['Admin', 'Super']), listUsers)
accountsRouter.patch('/admin/users/:id/', authenticate, requireGroup(['Admin', 'Super']), updateUser)
accountsRouter.delete('/admin/users/:id/', authenticate, requireGroup(['Super']), deleteUser)
accountsRouter.post('/admin/users/:id/reset-password/', authenticate, requireGroup(['Admin', 'Super']), resetUserPassword)

// SuperAdmin management (Super only)
accountsRouter.get('/admin/superadmins/', authenticate, requireGroup(['Super']), listSuperadmins)
accountsRouter.post('/admin/superadmins/', authenticate, requireGroup(['Super']), createSuperadmin)
accountsRouter.patch('/admin/superadmins/:id/', authenticate, requireGroup(['Super']), updateSuperadmin)
accountsRouter.delete('/admin/superadmins/:id/', authenticate, requireGroup(['Super']), deleteSuperadmin)

// Admin Logs & Config
accountsRouter.get('/admin/api-logs/', authenticate, requireGroup(['Admin', 'Super']), listApiLogs)
accountsRouter.get('/admin/audit-logs/', authenticate, requireGroup(['Admin', 'Super']), listAuditLogs)
accountsRouter.get('/admin/access-logs/', authenticate, requireGroup(['Admin', 'Super']), listAccessLogs)
accountsRouter.get('/admin/service-configs/', authenticate, requireGroup(['Admin', 'Super']), listServiceConfigurations)
accountsRouter.post('/admin/service-configs/', authenticate, requireGroup(['Admin', 'Super']), createServiceConfiguration)
accountsRouter.patch('/admin/service-configs/:id/', authenticate, requireGroup(['Admin', 'Super']), updateServiceConfiguration)
accountsRouter.get('/admin/external-tokens/', authenticate, requireGroup(['Admin', 'Super']), listExternalTokens)
