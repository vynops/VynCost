import { NextRequest, NextResponse } from 'next/server'
import { createSession, sessionCookieName } from '@/lib/auth'
import { findUserByEmail, verifyPassword, touchLastLogin } from '@/lib/user-store'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  const user = findUserByEmail(email)
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  touchLastLogin(user.id)

  const token = await createSession({ id: user.id, email: user.email, name: user.name, role: user.role })
  const res = NextResponse.json({ ok: true, role: user.role, name: user.name })
  res.cookies.set(sessionCookieName(), token, {
    httpOnly: true, sameSite: 'lax', path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
