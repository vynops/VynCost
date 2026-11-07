import { NextRequest, NextResponse } from 'next/server'
import { createSession, sessionCookieName } from '@/lib/auth'
import { getSessionFromRequest } from '@/lib/auth-server'
import { findUserById, updateUser, verifyPassword } from '@/lib/user-store'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (typeof payload !== 'object' || payload === null) {
    return NextResponse.json({ error: 'Current and new passwords are required' }, { status: 400 })
  }

  const body = payload as { currentPassword?: unknown; newPassword?: unknown }
  if (typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string') {
    return NextResponse.json({ error: 'Current and new passwords are required' }, { status: 400 })
  }
  if (body.newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const user = findUserById(session.id)
  if (!user || user.active === false || !verifyPassword(body.currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  const updated = updateUser(user.id, { password: body.newPassword, mustChangePassword: false })
  if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const token = await createSession({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    mustChangePassword: false,
  })
  const response = NextResponse.json({ ok: true })
  response.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}