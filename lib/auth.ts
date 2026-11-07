import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@/lib/user-store'

const COOKIE = 'vyncost_session'

function sessionSecret(): Uint8Array {
  const configured = process.env.VYNCOST_SECRET
  if (process.env.NODE_ENV === 'production') {
    if (!configured || new TextEncoder().encode(configured).length < 32) {
      throw new Error('VYNCOST_SECRET must be configured with at least 32 bytes in production')
    }
    return new TextEncoder().encode(configured)
  }
  return new TextEncoder().encode(configured || 'dev-secret-change-in-production')
}

export interface SessionPayload {
  id: string
  email: string
  name: string
  role: UserRole
  mustChangePassword?: boolean
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(sessionSecret())
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret())
    return {
      id:    payload.id    as string,
      email: payload.email as string,
      name:  payload.name  as string,
      role:  payload.role  as UserRole,
      mustChangePassword: payload.mustChangePassword === true,
    }
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return null
  return verifySession(token)
}

export function sessionCookieName() { return COOKIE }

// ── Role helpers ──────────────────────────────────────────────────────────────
const ROLE_RANK: Record<UserRole, number> = { viewer: 0, editor: 1, admin: 2 }

export function hasRole(session: SessionPayload | null, minimum: UserRole): boolean {
  if (!session) return false
  return ROLE_RANK[session.role] >= ROLE_RANK[minimum]
}

/**
 * Use in API routes to enforce a minimum role.
 * Returns 401/403 NextResponse if the check fails, or null if OK.
 *
 * Usage:
 *   const deny = await requireRole(req, 'admin')
 *   if (deny) return deny
 */
export async function requireRole(
  req: NextRequest,
  minimum: UserRole
): Promise<NextResponse | null> {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!hasRole(session, minimum)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

