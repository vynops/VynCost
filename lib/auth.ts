import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@/lib/user-store'

const SECRET = new TextEncoder().encode(process.env.VYNCOST_SECRET || 'dev-secret-change-in-production')
const COOKIE = 'vyncost_session'

export interface SessionPayload {
  id: string
  email: string
  name: string
  role: UserRole
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return {
      id:    payload.id    as string,
      email: payload.email as string,
      name:  payload.name  as string,
      role:  payload.role  as UserRole,
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

