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
    const payload = jwt.verify(token, env.jwtSecret) as { userId?: string; type?: string }
    if (!payload?.userId || payload.type === 'refresh') {
      return res.status(401).json({ message: 'Unauthorized' })
    }

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

    // SECURITY: Do not allow group-based bypass for permission checks
    // Each endpoint must explicitly grant required permissions
    const allowed = userPermissions.some((p) => permissions.includes(p))
    if (!allowed) {
      // Log failed permission attempt for audit
      console.warn(`Permission denied for user ${user?._id} attempting ${permissions.join(', ')}`)
      return res.status(403).json({ message: 'Forbidden' })
    }
    return next()
  }
}

// Separate middleware for role-based access to admin functions
// This requires an explicit 'admin' permission in the permissions array
export function requireAdminRole() {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user
    const userPermissions: string[] = user?.permissions || []

    // Explicitly check for admin permission
    if (!userPermissions.includes('admin')) {
      console.warn(`Admin access denied for user ${user?._id}`)
      return res.status(403).json({ message: 'Admin access required' })
    }
    return next()
  }
}
