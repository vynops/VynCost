import { NextRequest, NextResponse } from 'next/server'
import { getAccount, updateAccount, deleteAccount, sanitize } from '@/lib/account-store'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const account = getAccount(id)
  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(sanitize(account))
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const updated = updateAccount(id, body)
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(sanitize(updated))
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ok = deleteAccount(id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
