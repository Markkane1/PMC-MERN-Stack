import { Router } from 'express'
import { authenticate } from '../middlewares/auth'
import { listNotifications, notificationCount, searchQuery } from '../controllers/common/CommonApiController'

export const commonRouter = Router()

commonRouter.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))

commonRouter.get('/notification/list', authenticate, listNotifications)
commonRouter.get('/notification/count', authenticate, notificationCount)
commonRouter.get('/search/query', authenticate, searchQuery)
