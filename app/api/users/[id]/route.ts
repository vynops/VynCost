import { NextRequest, NextResponse } from 'next/server'
import { requireRole, getSessionFromRequest } from '@/lib/auth'
import { updateUser, deleteUser } from '@/lib/user-store'

// PATCH /api/users/[id] — update name, role, or password
// Admins can update anyone. Editors/viewers can only update their own password/name.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { id } = await params
  const isSelf = session.id === id

  // Only admins can change roles or update others
  const body = await req.json()
  if (body.role && session.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
  }
  if (!isSelf && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = updateUser(id, body)
  if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(updated)
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
