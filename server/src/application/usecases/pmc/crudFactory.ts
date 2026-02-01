import type { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'
import type { CrudRepository } from '../../../infrastructure/database/repositories/pmc/crud'

export function createCrudController(repo: CrudRepository, options?: {
  setCreatedBy?: boolean
  setUpdatedBy?: boolean
  transform?: (doc: any, req: Request) => any
  listQuery?: (req: Request) => any
  mapPayload?: (body: any) => any
}) {
  const list = asyncHandler(async (req: Request, res: Response) => {
    const query = options?.listQuery ? options.listQuery(req) : {}
    const docs = await repo.list(query)
    const data = options?.transform ? docs.map((d: any) => options.transform?.(d, req)) : docs
    res.json(data)
  })

  const get = asyncHandler(async (req: Request, res: Response) => {
    const doc = await repo.findById(req.params.id)
    if (!doc) return res.status(404).json({ message: 'Not found' })
    const data = options?.transform ? options.transform(doc, req) : doc
    return res.json(data)
  })

  const create = asyncHandler(async (req: Request, res: Response) => {
    let payload: any = options?.mapPayload ? options.mapPayload(req.body) : { ...req.body }
    if (Array.isArray(req.body)) {
      payload = options?.mapPayload ? req.body.map((item: any) => options.mapPayload?.(item)) : req.body
    }
    if (options?.setCreatedBy && (req as any).user?._id) {
      payload.createdBy = (req as any).user._id
    }
    const doc = await repo.create(payload)
    if (Array.isArray(doc)) {
      const data = options?.transform ? doc.map((d: any) => options.transform?.(d, req)) : doc
      return res.status(201).json(data)
    }
    const data = options?.transform ? options.transform(doc, req) : doc
    return res.status(201).json(data)
  })

  const update = asyncHandler(async (req: Request, res: Response) => {
    const payload = options?.mapPayload ? options.mapPayload(req.body) : { ...req.body }
    if (options?.setUpdatedBy && (req as any).user?._id) {
      payload.updatedBy = (req as any).user._id
    }
    const doc = await repo.updateById(req.params.id, payload)
    if (!doc) return res.status(404).json({ message: 'Not found' })
    const data = options?.transform ? options.transform(doc, req) : doc
    return res.json(data)
  })

  const remove = asyncHandler(async (req: Request, res: Response) => {
    const doc = await repo.deleteById(req.params.id)
    if (!doc) return res.status(404).json({ message: 'Not found' })
    return res.status(204).send()
  })

  return { list, get, create, update, remove }
}
