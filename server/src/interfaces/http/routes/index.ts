import { Router } from 'express'
import { accountsRouter } from './accounts.routes'
import { pmcRouter } from './pmc.routes'
import { commonRouter } from './common.routes'

export const apiRouter = Router()

apiRouter.use('/accounts', accountsRouter)
apiRouter.use('/pmc', pmcRouter)
apiRouter.use('/', commonRouter)
