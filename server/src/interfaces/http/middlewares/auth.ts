import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../../infrastructure/config/env'
import { userRepositoryMongo } from '../../../infrastructure/database/repositories/accounts'
import type { UserRepository } from '../../../domain/repositories/accounts'

export type AuthRequest = Request & { user?: any }

type AuthDeps = {
  userRepo: UserRepository
}

const defaultDeps: AuthDeps = {
  userRepo: userRepositoryMongo,
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const token = header.replace('Bearer ', '').trim()
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string }
    const user = await defaultDeps.userRepo.findById(payload.userId)
    if (!user || user.isActive === false) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    // Normalize to keep compatibility with code expecting Mongo _id
    req.user = { ...user, _id: user.id }
    return next()
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
}

export function requireGroup(groups: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user
    const userGroups = user?.groups || []
    const allowed = userGroups.some((g: string) => groups.includes(g))
    if (!allowed) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    return next()
  }
}

export function requirePermission(permissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user
    const userPermissions: string[] = user?.permissions || []
    const userGroups: string[] = user?.groups || []
    if (userGroups.includes('Super') || userGroups.includes('Admin')) {
      return next()
    }
    const allowed = userPermissions.some((p) => permissions.includes(p))
    if (!allowed) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    return next()
  }
}
