import { NextRequest, NextResponse } from 'next/server'
import { updateBudget, deleteBudget } from '@/lib/budget-store'
import { requireRole } from '@/lib/auth-server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireRole(req, 'editor')
  if (deny) return deny

  const { id } = await params
  const body = await req.json()
  const updated = updateBudget(id, body)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireRole(_req, 'editor')
  if (deny) return deny

  const { id } = await params
  const ok = deleteBudget(id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
