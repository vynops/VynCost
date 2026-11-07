import { NextRequest, NextResponse } from 'next/server'
import { verifySession, type SessionPayload } from '@/lib/auth'
import { findUserById, type UserRole } from '@/lib/user-store'

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get('vyncost_session')?.value
  if (!token) return null

  const session = await verifySession(token)
  if (!session) return null
  const user = findUserById(session.id)
  if (!user || user.active === false) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword === true,
  }
}

const ROLE_RANK: Record<UserRole, number> = { viewer: 0, editor: 1, admin: 2 }

export async function requireRole(req: NextRequest, minimum: UserRole): Promise<NextResponse | null> {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (session.mustChangePassword) return NextResponse.json({ error: 'Password change required' }, { status: 403 })
  if (ROLE_RANK[session.role] < ROLE_RANK[minimum]) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}