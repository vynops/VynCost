/**
 * User store — persists to data/users.json
 * Passwords are stored as PBKDF2 hashes (sha256, 100k iterations).
 * No external dependencies — uses Node built-in crypto.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export type UserRole = 'admin' | 'editor' | 'viewer'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
  mustChangePassword?: boolean
  passwordHash: string   // hex: salt:iterations:hash
  createdAt: string
  lastLoginAt?: string
}

const DATA_DIR  = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

function readUsers(): User[] {
  try {
    if (!fs.existsSync(USERS_FILE)) return []
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
  } catch { return [] }
}

function writeUsers(users: User[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8')
}

// ── Password helpers ─────────────────────────────────────────────────────────
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(plain, salt, 100_000, 32, 'sha256').toString('hex')
  return `${salt}:100000:${hash}`
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, iters, hash] = stored.split(':')
  const attempt = crypto.pbkdf2Sync(plain, salt, parseInt(iters), 32, 'sha256').toString('hex')
  // Constant-time compare to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(attempt, 'hex'), Buffer.from(hash, 'hex'))
}

// ── Bootstrap admin from env if no users exist ───────────────────────────────
export function ensureAdminExists(): void {
  const users = readUsers()
  if (users.length > 0) return

  const adminEmail    = process.env.VYNCOST_ADMIN_EMAIL    || 'admin@vyncost.local'
  const adminPassword = process.env.VYNCOST_ADMIN_PASSWORD || 'changeme'
  const adminName     = process.env.VYNCOST_ADMIN_NAME     || 'Admin'

  const admin: User = {
    id:           crypto.randomUUID(),
    email:        adminEmail,
    name:         adminName,
    role:         'admin',
    active:       true,
    mustChangePassword: true,
    passwordHash: hashPassword(adminPassword),
    createdAt:    new Date().toISOString(),
  }
  writeUsers([admin])
}

// ── CRUD ─────────────────────────────────────────────────────────────────────
export function listUsers(): Omit<User, 'passwordHash'>[] {
  ensureAdminExists()
  return readUsers().map(({ passwordHash: _, ...u }) => u)
}

export function findUserByEmail(email: string): User | null {
  ensureAdminExists()
  return readUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null
}

export function findUserById(id: string): User | null {
  return readUsers().find(u => u.id === id) ?? null
}

export function createUser(data: { email: string; name: string; role: UserRole; password: string }): Omit<User, 'passwordHash'> {
  const users = readUsers()
  if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
    throw new Error('Email already in use')
  }
  const user: User = {
    id:           crypto.randomUUID(),
    email:        data.email,
    name:         data.name,
    role:         data.role,
    active:       true,
    passwordHash: hashPassword(data.password),
    createdAt:    new Date().toISOString(),
  }
  writeUsers([...users, user])
  const { passwordHash: _, ...safe } = user
  return safe
}

export function updateUser(id: string, data: Partial<{ name: string; role: UserRole; password: string; active: boolean; mustChangePassword: boolean }>): Omit<User, 'passwordHash'> | null {
  const users = readUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) return null
  const user = users[idx]
  const removesActiveAdmin = user.role === 'admin' && user.active !== false &&
    (data.role !== undefined && data.role !== 'admin' || data.active === false)
  if (removesActiveAdmin && users.filter(candidate => candidate.role === 'admin' && candidate.active !== false).length === 1) {
    throw new Error('Cannot deactivate or demote the last active admin')
  }
  if (data.name)     users[idx].name = data.name
  if (data.role)     users[idx].role = data.role
  if (data.password) {
    users[idx].passwordHash = hashPassword(data.password)
    users[idx].mustChangePassword = data.mustChangePassword ?? false
  }
  if (data.active !== undefined) users[idx].active = data.active
  writeUsers(users)
  const { passwordHash: _, ...safe } = users[idx]
  return safe
}

export function deleteUser(id: string): boolean {
  const users = readUsers()
  const filtered = users.filter(u => u.id !== id)
  if (filtered.length === users.length) return false
  // Prevent deleting last admin
  const adminCount = filtered.filter(u => u.role === 'admin' && u.active !== false).length
  if (adminCount === 0) throw new Error('Cannot delete the last admin')
  writeUsers(filtered)
  return true
}

export function touchLastLogin(id: string): void {
  const users = readUsers()
  const user = users.find(u => u.id === id)
  if (user) { user.lastLoginAt = new Date().toISOString(); writeUsers(users) }
}
