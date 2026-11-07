import { NextRequest, NextResponse } from 'next/server'
import { hasRole } from '@/lib/auth'
import { getSessionFromRequest } from '@/lib/auth-server'
import { listAccounts } from '@/lib/account-store'
import { saveActionState } from '@/lib/action-store'
import { simulatedRecommendations } from '@/lib/simulation'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!hasRole(session, 'editor')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (!id || id.length > 512) return NextResponse.json({ error: 'Invalid recommendation id' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null || !('status' in body)) {
    return NextResponse.json({ error: 'Status is required' }, { status: 400 })
  }

  const status = body.status
  if (status !== 'applied' && status !== 'dismissed') {
    return NextResponse.json({ error: 'Status must be applied or dismissed' }, { status: 400 })
  }

  const accounts = listAccounts().map(a => ({ id: a.id, name: a.name, provider: a.provider }))
  const recommendations = await simulatedRecommendations(accounts)
  if (!recommendations.some(rec => rec.id === id)) {
    return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
  }

  const action = saveActionState('recommendations', id, status, session.id)
  return NextResponse.json(action)
}