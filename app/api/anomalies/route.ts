import { NextResponse } from 'next/server'
import { listAccounts } from '@/lib/account-store'
import { simulatedAnomalies } from '@/lib/simulation'
import { listActionStates } from '@/lib/action-store'

export async function GET() {
  const accounts = listAccounts()
  const data = await simulatedAnomalies(accounts.map(a => ({ id: a.id, name: a.name, provider: a.provider })))
  const states = listActionStates('anomalies')
  return NextResponse.json(data.map(anomaly =>
    states[anomaly.id]?.status === 'acknowledged' ? { ...anomaly, status: 'acknowledged' } : anomaly
  ))
}
