import { Request, Response } from 'express'
import { asyncHandler } from '../../../shared/utils/asyncHandler'

export const ping = asyncHandler(async (_req: Request, res: Response) => {
  return res.json({ message: 'pong' })
})

export const verifyChalan = asyncHandler(async (_req: Request, res: Response) => {
  return res.json({ valid: true })
})

export const confiscationLookup = asyncHandler(async (_req: Request, res: Response) => {
  return res.json({ items: [] })
})
