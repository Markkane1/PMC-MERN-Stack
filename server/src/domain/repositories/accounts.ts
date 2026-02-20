import type { User, UserProfile, Group, Permission, UserAuditLog } from '../entities/accounts'

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByUsername(username: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findByIdAndUsername(id: string, username: string): Promise<User | null>
  listByGroup(group: string): Promise<User[]>
  listByIds(ids: string[]): Promise<User[]>
  listAll(): Promise<User[]>
  create(user: Omit<User, 'id'>): Promise<User>
  updateById(id: string, updates: Partial<User>): Promise<User | null>
  updatePassword(id: string, passwordHash: string): Promise<void>
  deleteById(id: string): Promise<void>
}

export interface SocialAccountRepository {
  findById(id: string): Promise<any | null>
  findByProviderAndId(provider: string, providerId: string): Promise<any | null>
  findByUserId(userId: string): Promise<any[]>
  create(account: any): Promise<any>
  updateById(id: string, updates: any): Promise<any | null>
  deleteById(id: string): Promise<void>
}

export interface UserProfileRepository {
  findByUserId(userId: string): Promise<UserProfile | null>
  listByUserIds(userIds: string[]): Promise<UserProfile[]>
  create(profile: Omit<UserProfile, 'id'>): Promise<UserProfile>
}

export interface GroupRepository {
  list(): Promise<Group[]>
  listByNames(names: string[]): Promise<Group[]>
  findById(id: string): Promise<Group | null>
  findByName(name: string): Promise<Group | null>
  create(group: Omit<Group, 'id'>): Promise<Group>
  updateById(id: string, updates: Partial<Group>): Promise<Group | null>
  deleteById(id: string): Promise<void>
}

export interface PermissionRepository {
  list(): Promise<Permission[]>
  listByKeys(keys: string[]): Promise<Permission[]>
}

export interface UserAuditLogRepository {
  create(log: Omit<UserAuditLog, 'id'>): Promise<UserAuditLog>
}
