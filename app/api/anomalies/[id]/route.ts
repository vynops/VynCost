import { NextRequest, NextResponse } from 'next/server'
import { hasRole } from '@/lib/auth'
import { getSessionFromRequest } from '@/lib/auth-server'
import { listAccounts } from '@/lib/account-store'
import { saveActionState } from '@/lib/action-store'
import { simulatedAnomalies } from '@/lib/simulation'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!hasRole(session, 'editor')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (!id || id.length > 512) return NextResponse.json({ error: 'Invalid anomaly id' }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null || !('status' in body) || body.status !== 'acknowledged') {
    return NextResponse.json({ error: 'Status must be acknowledged' }, { status: 400 })
  }

  const accounts = listAccounts().map(a => ({ id: a.id, name: a.name, provider: a.provider }))
  const anomalies = await simulatedAnomalies(accounts)
  if (!anomalies.some(anomaly => anomaly.id === id)) {
    return NextResponse.json({ error: 'Anomaly not found' }, { status: 404 })
  }

  const action = saveActionState('anomalies', id, 'acknowledged', session.id)
  return NextResponse.json(action)
}