import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { listUsers, createUser } from '@/lib/user-store'

// GET /api/users — list all users (admin only)
export async function GET(req: NextRequest) {
  const deny = await requireRole(req, 'admin')
  if (deny) return deny
  return NextResponse.json(listUsers())
}

// POST /api/users — create a new user (admin only)
export async function POST(req: NextRequest) {
  const deny = await requireRole(req, 'admin')
  if (deny) return deny

  const body = await req.json()
  const { email, name, role, password } = body

  if (!email || !name || !role || !password) {
    return NextResponse.json({ error: 'email, name, role and password are required' }, { status: 400 })
  }
  if (!['admin', 'editor', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  try {
    const user = createUser({ email, name, role, password })
    return NextResponse.json(user, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create user'
    return NextResponse.json({ error: msg }, { status: 409 })
  }
}
