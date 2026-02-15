import { Router } from 'express'
import { accountsRouter } from './accounts.routes'
import { pmcRouter } from './pmc.routes'
import { commonRouter } from './common.routes'
import cacheRouter from './cache.routes'

export const apiRouter = Router()

apiRouter.use('/accounts', accountsRouter)
apiRouter.use('/pmc', pmcRouter)
apiRouter.use('/cache', cacheRouter)
apiRouter.use('/', commonRouter)
