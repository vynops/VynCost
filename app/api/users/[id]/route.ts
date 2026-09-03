import { NextRequest, NextResponse } from 'next/server'
import { requireRole, getSessionFromRequest } from '@/lib/auth-server'
import { findUserById, updateUser, deleteUser, verifyPassword } from '@/lib/user-store'

// PATCH /api/users/[id] — update name, role, or password
// Admins can update anyone. Editors/viewers can only update their own password/name.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { id } = await params
  const isSelf = session.id === id

  // Only admins can change roles or update others
  const body = await req.json()
  if (body.role && !['admin', 'editor', 'viewer'].includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  if (body.active !== undefined && typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'active must be a boolean' }, { status: 400 })
  }
  if (body.role && session.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
  }
  if (body.active !== undefined && session.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can change account status' }, { status: 403 })
  }
  if (!isSelf && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (body.password) {
    if (typeof body.password !== 'string' || body.password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (isSelf) {
      const user = findUserById(id)
      if (!user || typeof body.currentPassword !== 'string' || !verifyPassword(body.currentPassword, user.passwordHash)) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
    }
  }
  delete body.currentPassword

  try {
    const updated = updateUser(id, body)
    if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// DELETE /api/users/[id] — admin only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireRole(req, 'admin')
  if (deny) return deny

  const { id } = await params
  const session = await getSessionFromRequest(req)
  if (session?.id === id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  try {
    const ok = deleteUser(id)
    if (!ok) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to delete'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
